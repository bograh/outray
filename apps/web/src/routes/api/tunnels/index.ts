import { createFileRoute } from "@tanstack/react-router";
import { json } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { auth } from "../../../lib/auth";
import { db } from "../../../db";
import { tunnels } from "../../../db/app-schema";
import { redis } from "../../../lib/redis";

export const Route = createFileRoute("/api/tunnels/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session) {
          return json({ error: "Unauthorized" }, { status: 401 });
        }

        const url = new URL(request.url);
        const organizationId = url.searchParams.get("organizationId");

        if (!organizationId) {
          return json({ error: "Organization ID required" }, { status: 400 });
        }

        const organizations = await auth.api.listOrganizations({
          headers: request.headers,
        });

        const hasAccess = organizations.find(
          (org) => org.id === organizationId,
        );

        if (!hasAccess) {
          return json({ error: "Unauthorized" }, { status: 403 });
        }

        const userTunnels = await db
          .select({
            id: tunnels.id,
            url: tunnels.url,
            name: tunnels.name,
            userId: tunnels.userId,
            lastSeenAt: tunnels.lastSeenAt,
            createdAt: tunnels.createdAt,
            updatedAt: tunnels.updatedAt,
          })
          .from(tunnels)
          .where(eq(tunnels.organizationId, organizationId));

        const tunnelsWithStatus = await Promise.all(
          userTunnels.map(async (tunnel) => {
            let tunnelId = "";
            try {
              const urlObj = new URL(
                tunnel.url.startsWith("http")
                  ? tunnel.url
                  : `https://${tunnel.url}`,
              );
              // Use full hostname as tunnel ID (e.g., "passive-robin.outray.app" or "test.outray.co")
              tunnelId = urlObj.hostname;
            } catch (e) {
              console.error("Failed to parse tunnel URL:", tunnel.url);
            }

            const isOnline = tunnelId
              ? await redis.exists(`tunnel:online:${tunnelId}`)
              : false;
            return {
              id: tunnel.id,
              url: tunnel.url,
              userId: tunnel.userId,
              name: tunnel.name,
              isOnline,
              lastSeenAt: tunnel.lastSeenAt,
              createdAt: tunnel.createdAt,
              updatedAt: tunnel.updatedAt,
            };
          }),
        );

        const activeTunnels = tunnelsWithStatus.filter((t) => t.isOnline);

        return json({ tunnels: activeTunnels });
      },
    },
  },
});
