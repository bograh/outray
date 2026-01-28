import { OutrayClientOptions } from "@outray/core";

export interface OutrayPluginOptions extends Partial<Omit<OutrayClientOptions, "localPort" | "onTunnelReady" | "onError" | "onReconnecting" | "onClose">> {
    /**
     * The port the NestJS application is running on.
     * If not provided, the plugin will attempt to resolve it from the NestJS app.
     */
    port?: number | string;

    /**
     * Whether to enable the tunnel.
     * Defaults to true if NODE_ENV is not 'production'.
     */
    enabled?: boolean;

    /**
     * Whether to suppress console output.
     * Defaults to false.
     */
    silent?: boolean;

    // Event callbacks
    onTunnelReady?: (url: string) => void;
    onError?: (error: Error) => void;
    onReconnecting?: () => void;
    onClose?: () => void;
}
