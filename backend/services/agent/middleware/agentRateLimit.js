import { createHash } from "node:crypto";
import { unlink } from "node:fs/promises";

export const AGENT_RATE_LIMITS = Object.freeze({
  auto: 20,
  chat: 20,
  coding: 5,
  pdf: 5,
  pdfrag: 5,
  ppt: 5,
  image: 3,
  vision: 3,
  imageanalyzer: 3,
  search: 5,
});

const WINDOW_SECONDS = 60;
let defaultRedis;

async function getDefaultRedis() {
  defaultRedis ??= (await import("../../../shared/redis/redis.js")).default;
  return defaultRedis;
}
const INCREMENT_WITH_EXPIRY = `
local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("EXPIRE", KEYS[1], ARGV[1])
end
local ttl = redis.call("TTL", KEYS[1])
return {current, ttl}
`;

function normalizeAgent(req) {
  const value = req.body?.agent || req.body?.agentMode || "auto";
  return typeof value === "string" ? value.trim().toLowerCase() : "auto";
}

function getRateLimitKey(userId, agent) {
  const userHash = createHash("sha256").update(String(userId)).digest("hex");
  return `rate:agents:${userHash}:${agent}`;
}

async function removeRejectedUpload(file) {
  if (file?.path) await unlink(file.path).catch(() => {});
}

export function createAgentRateLimit(redisClient) {
  return async function agentRateLimit(req, res, next) {
    const userId = req.headers["x-user-id"];
    if (!userId) return next();

    const agent = normalizeAgent(req);
    const limit = AGENT_RATE_LIMITS[agent] || AGENT_RATE_LIMITS.auto;

    try {
      const client = redisClient || (await getDefaultRedis());
      const [count, ttlValue] = await client.eval(
        INCREMENT_WITH_EXPIRY,
        1,
        getRateLimitKey(userId, agent),
        WINDOW_SECONDS,
      );
      const ttl = Math.max(Number(ttlValue) || WINDOW_SECONDS, 1);
      const remaining = Math.max(limit - Number(count), 0);

      res.set({
        "RateLimit-Limit": String(limit),
        "RateLimit-Remaining": String(remaining),
        "RateLimit-Reset": String(ttl),
      });

      if (Number(count) > limit) {
        await removeRejectedUpload(req.file);
        res.set("Retry-After", String(ttl));
        return res.status(429).json({
          message: `Too many ${agent} requests. Try again in ${ttl} seconds.`,
          agent,
          limit,
          retryAfter: ttl,
        });
      }

      return next();
    } catch (error) {
      console.error("Agent rate limiter unavailable:", error.message);
      return next();
    }
  };
}

export const agentRateLimit = createAgentRateLimit();
