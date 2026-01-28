import { INestApplication } from "@nestjs/common";
import { OutrayClient } from "@outray/core";
import { OutrayPluginOptions } from "./types";

const DEFAULT_SERVER_URL = "wss://api.outray.dev/";

/**
 * Expose your NestJS application via an Outray tunnel.
 *
 * @param app The NestJS application instance.
 * @param options Configuration options.
 */
export async function outray(
    app: INestApplication,
    options: OutrayPluginOptions = {}
): Promise<void> {
    const {
        enabled = process.env.NODE_ENV !== "production",
        silent = false,
    } = options;

    if (!enabled) {
        return;
    }

    // Try to determine the port
    let port: number;
    if (options.port) {
        port = typeof options.port === "string" ? parseInt(options.port, 3000) : options.port;
    } else {
        // Attempt to get the port from the underlying HTTP server
        const httpServer = app.getHttpServer();
        if (httpServer && httpServer.address) {
            const address = httpServer.address();
            if (address && typeof address === 'object') {
                port = address.port;
            } else {
                // Fallback or error if not listening yet?
                // Users often call app.listen(3000) then outray(app).
                // If app.listen wasn't awaited, address might be null.
                // But usually they await it.
                // If they passed port to listen, we might not retrieve it easily if not started.
                console.warn("[Outray] Could not determine port from application. Please specify 'port' in options.");
                return;
            }
        } else {
            console.warn("[Outray] Could not determine port from application. Please specify 'port' in options.");
            return;
        }
    }

    const apiKey = options.apiKey ?? process.env.OUTRAY_API_KEY;
    const subdomain = options.subdomain ?? process.env.OUTRAY_SUBDOMAIN;
    const serverUrl =
        options.serverUrl ??
        process.env.OUTRAY_SERVER_URL ??
        DEFAULT_SERVER_URL;

    const client = new OutrayClient({
        localPort: port,
        serverUrl,
        apiKey,
        subdomain,
        customDomain: options.customDomain,
        onTunnelReady: (url) => {
            if (!silent) {
                const colorUrl = `\x1b[36m${url}\x1b[0m`;
                console.log(`  \x1b[32m➜\x1b[0m  \x1b[1mTunnel:\x1b[0m  ${colorUrl}`);
            }
            options.onTunnelReady?.(url);
        },
        onError: (error) => {
            if (!silent) {
                console.error(`  \x1b[31m✗\x1b[0m  Outray: ${error.message}`);
            }
            options.onError?.(error);
        },
        onReconnecting: (attempt, delay) => {
            if (!silent) {
                console.log(`  \x1b[33m⟳\x1b[0m  Outray: Reconnecting in ${Math.round(delay / 1000)}s...`);
            }
            options.onReconnecting?.();
        },
        onClose: () => {
            if (!silent) {
                console.log(`  \x1b[33m○\x1b[0m  Outray: Tunnel closed`);
            }
            options.onClose?.();
        },
    });

    client.start();

    // Cleanup on app close
    const cleanup = () => {
        client.stop();
    };

    // Hook into NestJS lifecycle? 
    // app.enableShutdownHooks() is needed for SIGTERM usually.
    // But we can just use the generic process handlers like the other plugins for simple dev usage.
    // Or we can try to hook into app.close().

    // Let's hook into process exit for safety in dev mode
    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);
    process.on("exit", cleanup);
}

export { OutrayPluginOptions };
