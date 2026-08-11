import assert from "node:assert/strict";
import test from "node:test";
import { isTransientMongoError, withMongoRetry } from "../utils/mongoRetry.js";

test("retries temporary MongoDB DNS failures", async () => {
  let calls = 0;
  const result = await withMongoRetry(() => {
    calls += 1;
    if (calls < 3) {
      const error = new Error("getaddrinfo EAI_AGAIN atlas.mongodb.net");
      error.code = "EAI_AGAIN";
      throw error;
    }
    return "saved";
  }, { attempts: 3, delays: [0, 0] });

  assert.equal(result, "saved");
  assert.equal(calls, 3);
});

test("does not retry validation or permanent database errors", async () => {
  let calls = 0;
  await assert.rejects(() => withMongoRetry(() => {
    calls += 1;
    throw new Error("Message validation failed");
  }, { delays: [0, 0] }), /validation failed/);
  assert.equal(calls, 1);
});

test("recognizes wrapped MongoDB network errors", () => {
  assert.equal(isTransientMongoError({ name: "MongoServerSelectionError" }), true);
  assert.equal(isTransientMongoError({ cause: { code: "ETIMEDOUT" } }), true);
  assert.equal(isTransientMongoError({ name: "ValidationError" }), false);
});
