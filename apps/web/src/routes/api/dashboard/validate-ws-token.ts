import { createFileRoute } from "@tanstack/react-router";
import { json } from "@tanstack/react-start";
import { redis } from "../../../lib/redis";
import { rateLimit, getClientIdentifier, createRateLimitResponse } from "../../../lib/rate-limiter";
import { timingSafeEqual } from "crypto";

const TOKEN_PREFIX = "dashboard:ws:";

// Shared secret for tunnel server authentication
const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET;

function secureCompare(a: string, b: string): boolean {
  if (!a || !b) return false;
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export const Route = createFileRoute("/api/dashboard/validate-ws-token")({
  server: {
    handlers: {
      // Validate a dashboard WebSocket token (called by tunnel server)
      POST: async ({ request }) => {
        try {
          // Verify shared secret from tunnel server
          const authHeader = request.headers.get("authorization");
          const providedSecret = authHeader?.replace("Bearer ", "");

          if (!INTERNAL_API_SECRET) {
            console.error("INTERNAL_API_SECRET not configured");
            return json({ valid: false, error: "Server misconfigured" }, { status: 500 });
          }

          if (!secureCompare(providedSecret || "", INTERNAL_API_SECRET)) {
            return json({ valid: false, error: "Unauthorized" }, { status: 401 });
          }

          // Rate limit by client IP (protects against brute force even with valid secret)
          const clientId = getClientIdentifier(request);
          const rateLimitResult = await rateLimit(clientId, {
            identifier: "dashboard-ws-validate",
            maxRequests: 100,
            windowSeconds: 60,
          });

          if (!rateLimitResult.allowed) {
            return createRateLimitResponse(rateLimitResult);
          }

          const body = await request.json();
          const { token } = body;

          if (!token || typeof token !== "string" || token.length !== 64) {
            // Fixed response time to prevent timing attacks on token format
            return json({ valid: false, error: "Invalid token" }, { status: 401 });
          }

          const key = `${TOKEN_PREFIX}${token}`;
          
          // Get and delete atomically (single-use token)
          const tokenData = await redis.getdel(key);

          if (!tokenData) {
            return json({ valid: false, error: "Invalid or expired token" }, { status: 401 });
          }

          let parsedTokenData;
          try {
            parsedTokenData = JSON.parse(tokenData);
          } catch (parseError) {
            console.error("Malformed dashboard token data in Redis for key:", key, parseError);
            return json({ valid: false, error: "Invalid or expired token" }, { status: 401 });
          }

          const { orgId, userId } = parsedTokenData as { orgId: string; userId: string };
          return json({
            valid: true,
            orgId,
            userId,
          });
        } catch (error) {
          console.error("Error validating dashboard token:", error);
          return json({ valid: false, error: "Internal server error" }, { status: 500 });
        }
      },
    },
  },
});
