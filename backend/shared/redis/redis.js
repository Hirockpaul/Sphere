import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL);

redis.on("connect", () => {
  console.log("Connected to Redis");
});

redis.on("error", (error) => {
  console.error("Redis connection error:", error.message);
});

export default redis;
