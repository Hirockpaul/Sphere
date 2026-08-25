import assert from "node:assert/strict";
import test from "node:test";
import { imageAnalyzer } from "../agents/imageAnalyzer.agent.js";
import { pdfRag } from "../agents/pdfRag.agent.js";

test("PDF RAG scopes retrieval to the user and conversation", async () => {
  let receivedFilter;
  const result = await pdfRag(
    {
      prompt: "What is the leave policy?",
      userId: "user-1",
      conversationId: "conversation-1",
    },
    {
      vectorStore: {
        similaritySearch: async (_query, _limit, filter) => {
          receivedFilter = filter;
          return [{
            pageContent: "Employees receive 20 paid leave days.",
            metadata: { filename: "policy.pdf", pageNumber: 4 },
          }];
        },
      },
      getModel: async () => ({
        invoke: async () => ({ content: "Employees receive 20 paid leave days (page 4)." }),
      }),
    },
  );

  assert.equal(result.agent, "pdfRag");
  assert.match(result.aiResponse, /20 paid leave days/);
  assert.deepEqual(receivedFilter.must, [
    { key: "metadata.userId", match: { value: "user-1" } },
    { key: "metadata.conversationId", match: { value: "conversation-1" } },
  ]);
});

test("PDF RAG asks for an upload when no indexed chunks exist", async () => {
  const result = await pdfRag(
    { prompt: "Summarize it", userId: "user-1", conversationId: "conversation-1" },
    { vectorStore: { similaritySearch: async () => [] } },
  );
  assert.match(result.aiResponse, /Upload a PDF/);
});

test("image analyzer sends an uploaded image to the multimodal model", async () => {
  let messages;
  const result = await imageAnalyzer(
    {
      prompt: "What does this chart show?",
      file: { path: "/tmp/chart.png", mimetype: "image/png" },
    },
    {
      readFile: async () => Buffer.from("image"),
      getModel: async () => ({
        invoke: async (input) => {
          messages = input;
          return { content: "The chart rises over time." };
        },
      }),
    },
  );

  assert.equal(result.agent, "imageAnalyzer");
  assert.equal(result.aiResponse, "The chart rises over time.");
  assert.match(messages[1].content[1].image_url, /^data:image\/png;base64,/);
});
