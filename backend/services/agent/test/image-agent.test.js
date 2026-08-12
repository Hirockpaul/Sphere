import assert from "node:assert/strict";
import test from "node:test";

import { visionAgent } from "../agents/vision.agent.js";

test("vision agent enhances, stores, and returns a generated image", async () => {
  const uploads = [];
  const model = {
    invoke: async () => ({ content: "A detailed Sphere logo" }),
  };
  const httpClient = {
    get: async (url, options) => {
      assert.match(url, /A%20detailed%20Sphere%20logo$/);
      assert.equal(options.responseType, "arraybuffer");

      return {
        data: Uint8Array.from([1, 2, 3]).buffer,
        headers: { "content-type": "image/png" },
      };
    },
  };
  const dependencies = {
    getModel: async () => model,
    httpClient,
    uploadToS3: async (key, buffer, contentType) => {
      uploads.push({ key, buffer, contentType });
    },
    getFromS3: async () => "https://example.com/generated-image.png",
  };

  const result = await visionAgent(
    { prompt: "Create a Sphere logo", conversationId: "c", userId: "u" },
    dependencies,
  );

  assert.equal(result.agent, "image");
  assert.equal(result.imageIntent, "generate_image");
  assert.equal(result.imagePrompt, "A detailed Sphere logo");
  assert.deepEqual(result.images, ["https://example.com/generated-image.png"]);
  assert.equal(uploads.length, 1);
  assert.equal(uploads[0].contentType, "image/png");
  assert.equal(uploads[0].buffer.length, 3);
  assert.match(uploads[0].key, /^generated-images\/image-\d+\.png$/);
});
