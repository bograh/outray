import { createServer } from "http";
import Redis from "ioredis";
import { TunnelRouter } from "./core/TunnelRouter";
import { WSHandler } from "./core/WSHandler";
import { HTTPProxy } from "./core/HTTPProxy";
import { config } from "./config";

const redis = new Redis(config.redisUrl, {
  lazyConnect: true,
});

redis.on("error", (error) => {
  console.error("Redis connection error", error);
});

void redis
  .connect()
  .then(() => {
    console.log("Connected to Redis");
  })
  .catch((error) => {
    console.error("Failed to connect to Redis", error);
    process.exit(1);
  });

const router = new TunnelRouter({
  redis,
  ttlSeconds: config.redisTunnelTtlSeconds,
  heartbeatIntervalMs: config.redisHeartbeatIntervalMs,
});
const httpServer = createServer();
const proxy = new HTTPProxy(router, config.baseDomain);

console.log("🚨 BASE DOMAIN LOADED:", config.baseDomain);

new WSHandler(httpServer, router);

httpServer.on("request", (req, res) => {
  const host = req.headers.host || "";
  if (host.startsWith("api.")) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", version: "1.0.0" }));
    return;
  }
  proxy.handleRequest(req, res);
});

httpServer.listen(config.port, () => {
  console.log(`OutRay Server running on port ${config.port}`);
  console.log(`Base domain: ${config.baseDomain}`);
});

const shutdown = async () => {
  console.log("Shutting down tunnel server...");
  await router.shutdown();
  await redis.quit();
  httpServer.close(() => process.exit(0));
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
