import { createFileRoute } from "@tanstack/react-router";
import { json } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "../../../db";
import { tunnels } from "../../../db/app-schema";

export const Route = createFileRoute("/api/tunnel/register")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as {
            subdomain?: string;
            userId?: string;
            organizationId?: string;
            url?: string;
          };

          const { subdomain, userId, organizationId, url } = body;

          if (!subdomain || !userId || !organizationId) {
            return json({ error: "Missing required fields" }, { status: 400 });
          }

          // Use the provided URL or construct one
          const baseDomain = process.env.BASE_DOMAIN || "localhost.direct";
          const protocol = baseDomain === "localhost.direct" ? "http" : "https";
          const portSuffix =
            baseDomain === "localhost.direct"
              ? `:${process.env.PORT || "3547"}`
              : "";
          const tunnelUrl =
            url || `${protocol}://${subdomain}.${baseDomain}${portSuffix}`;

          // Check if tunnel with this subdomain URL already exists
          const [existingTunnel] = await db
            .select()
            .from(tunnels)
            .where(eq(tunnels.url, tunnelUrl));

          if (existingTunnel) {
            // Tunnel with this URL already exists, update lastSeenAt
            await db
              .update(tunnels)
              .set({ lastSeenAt: new Date() })
              .where(eq(tunnels.id, existingTunnel.id));

            return json({
              success: true,
              tunnelId: existingTunnel.id,
            });
          }

          // Create new tunnel record with full URL
          const tunnelRecord = {
            id: randomUUID(),
            url: tunnelUrl,
            userId,
            organizationId,
            name: null,
            lastSeenAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          await db.insert(tunnels).values(tunnelRecord);

          return json({ success: true, tunnelId: tunnelRecord.id });
        } catch (error) {
          console.error("Tunnel registration error:", error);
          return json({ error: "Internal server error" }, { status: 500 });
        }
      },
    },
  },
});
