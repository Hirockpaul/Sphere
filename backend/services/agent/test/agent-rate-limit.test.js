import assert from "node:assert/strict";
import test from "node:test";
import { AGENT_RATE_LIMITS, createAgentRateLimit } from "../middleware/agentRateLimit.js";

function createResponse() {
  return {
    headers: {},
    statusCode: 200,
    body: null,
    set(name, value) {
      if (typeof name === "object") Object.assign(this.headers, name);
      else this.headers[name] = value;
      return this;
    },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test("uses the configured one-minute agent limits", () => {
  assert.deepEqual(AGENT_RATE_LIMITS, {
    auto: 20, chat: 20, coding: 5, pdf: 5, pdfrag: 5,
    ppt: 5, image: 3, vision: 3, imageanalyzer: 3, search: 5,
  });
});

test("allows requests below the limit and publishes remaining quota", async () => {
  const limiter = createAgentRateLimit({ eval: async () => [2, 54] });
  const response = createResponse();
  let continued = false;
  await limiter(
    { headers: { "x-user-id": "user-1" }, body: { agent: "coding" } },
    response,
    () => { continued = true; },
  );
  assert.equal(continued, true);
  assert.equal(response.headers["RateLimit-Limit"], "5");
  assert.equal(response.headers["RateLimit-Remaining"], "3");
});

test("returns 429 with Retry-After above the limit", async () => {
  const limiter = createAgentRateLimit({ eval: async () => [4, 41] });
  const response = createResponse();
  await limiter(
    { headers: { "x-user-id": "user-1" }, body: { agent: "image" } },
    response,
    () => assert.fail("request should not continue"),
  );
  assert.equal(response.statusCode, 429);
  assert.equal(response.headers["Retry-After"], "41");
  assert.equal(response.body.limit, 3);
});
