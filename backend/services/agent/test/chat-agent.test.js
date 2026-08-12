import assert from "node:assert/strict";
import test from "node:test";

import { chatAgent } from "../agents/chat.agent.js";

test("sends exactly one system message and keeps it first", async () => {
  let sentMessages;
  const dependencies = {
    getMemory: async () => [
      { role: "system", content: "Cross-conversation memory follows." },
      { role: "user", content: "Earlier question" },
      { role: "assistant", content: "Earlier answer" },
    ],
    getModel: async () => ({
      invoke: async (messages) => {
        sentMessages = messages;
        return { content: "Current answer" };
      },
    }),
  };

  const state = {
    prompt: "Current question",
    conversationId: "c1",
    userId: "u1",
  };

  await chatAgent(state, dependencies);

  assert.equal(sentMessages[0].role, "system");
  const systemMessages = sentMessages.filter((message) => message.role === "system");
  assert.equal(systemMessages.length, 1);
  assert.match(sentMessages[0].content, /Cross-conversation memory follows/);

  const conversationRoles = sentMessages.slice(1).map(({ role }) => role);
  assert.deepEqual(conversationRoles, ["user", "assistant", "user"]);
});
