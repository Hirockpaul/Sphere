import redis from "../../../shared/redis/redis.js";
import { getMessages, getUserMessages } from "../utils/getMessages.js";

const MEMORY_TTL_SECONDS = 24 * 60 * 60;
const MAX_MESSAGES = 20;
const MAX_CROSS_CHAT_MESSAGES = 10;
const getKey = (conversationId) => `message-${conversationId}`;
const getUserKey = (userId) => `user-memory-${userId}`;

const readOrLoadUserMemory = async (userId) => {
  const key = getUserKey(userId);
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  const messages = await getUserMessages(userId);
  await redis.set(key, JSON.stringify(messages), "EX", MEMORY_TTL_SECONDS);
  return messages;
};

export const getMemory = async (conversationId, userId) => {
  const key = getKey(conversationId);
  const [cached, userMessages] = await Promise.all([
    redis.get(key),
    readOrLoadUserMemory(userId),
  ]);

  let recentMessages;
  if (cached) {
    recentMessages = JSON.parse(cached);
  } else {
    const messages = await getMessages(conversationId, userId);
    recentMessages = messages.slice(-MAX_MESSAGES);
    await redis.set(key, JSON.stringify(recentMessages), "EX", MEMORY_TTL_SECONDS);
  }

  const previousChatMessages = userMessages
    .filter((message) => String(message.conversationId) !== String(conversationId))
    .slice(-MAX_CROSS_CHAT_MESSAGES);

  if (!previousChatMessages.length) return recentMessages;

  return [
    {
      role: "system",
      content: "Relevant memory from this user's previous conversations follows. Use it only when it helps answer the current request.",
    },
    ...previousChatMessages,
    ...recentMessages,
  ];
};

export const addMessage = async (conversationId, role, content) => {
  const key = getKey(conversationId);
  const rawMessages = await redis.get(key);

  // A missing key will be populated from the database on the next request.
  if (!rawMessages) return;

  const messages = JSON.parse(rawMessages);
  messages.push({ role, content });

  await redis.set(
    key,
    JSON.stringify(messages.slice(-MAX_MESSAGES)),
    "EX",
    MEMORY_TTL_SECONDS,
  );
};

export const clearMemory = (conversationId) => redis.del(getKey(conversationId));

export const addUserMessages = async (userId, conversationId, newMessages) => {
  const key = getUserKey(userId);
  const rawMessages = await redis.get(key);
  if (!rawMessages) return;

  const messages = JSON.parse(rawMessages);
  messages.push(
    ...newMessages.map(({ role, content }) => ({ conversationId, role, content })),
  );

  await redis.set(
    key,
    JSON.stringify(messages.slice(-MAX_MESSAGES)),
    "EX",
    MEMORY_TTL_SECONDS,
  );
};

export const clearUserMemory = (userId) => redis.del(getUserKey(userId));
