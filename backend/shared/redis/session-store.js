import { createHash } from "node:crypto";
import redisClient from "./redis.js";

function getSessionKey(sessionId) {
  const digest = createHash("sha256").update(sessionId).digest("hex");
  return `session:${digest}`;
}

export function saveSession(sessionId, user, durationSeconds) {
  return redisClient.set(
    getSessionKey(sessionId),
    JSON.stringify(user),
    "EX",
    durationSeconds,
  );
}

export async function getSession(sessionId) {
  const session = await redisClient.get(getSessionKey(sessionId));
  return session ? JSON.parse(session) : null;
}

export function deleteSession(sessionId) {
  return redisClient.del(getSessionKey(sessionId));
}
