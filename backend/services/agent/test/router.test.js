import assert from "node:assert/strict";
import test from "node:test";

import { detectDeterministicAgent, router } from "../graph/router.js";

process.env.SPHERE_PERF_LOGGING = "false";

const codingPrompts = [
  "Create a calculator using HTML CSS and JavaScript.",
  "Build a React dashboard.",
  "Review this Java code.",
  "Debug this Node.js error.",
  "Explain this function.",
  "Refactor this Express controller.",
  "Design authentication architecture.",
  "Write tests for this function.",
  "Document this API.",
  "Build using the latest Stripe API.",
  "Add dark mode.",
];

test("routes common coding requests deterministically", () => {
  for (const prompt of codingPrompts) {
    assert.equal(detectDeterministicAgent(prompt), "coding", prompt);
  }
});

test("does not claim general or search prompts are deterministically coding", () => {
  const nonCodingPrompts = [
    "Hello",
    "What is Java?",
    "Search the latest React news",
    "What is the weather?",
  ];

  for (const prompt of nonCodingPrompts) {
    assert.equal(detectDeterministicAgent(prompt), null, prompt);
  }
});

test("deterministic and explicit coding routes avoid the router model", async () => {
  const automaticRoute = await router
  ({ prompt: codingPrompts[0], agent: "auto" });
  const explicitRoute = await router
  ({ prompt: "anything", agent: "coding" });

  assert.deepEqual(automaticRoute, { agent: "coding" });
  assert.deepEqual(explicitRoute, { agent: "coding" });
});

test("maps public image mode to the vision agent", async () => {
  const result = await router({ prompt: "Create an image", agent: "image" });
  assert.deepEqual(result, { agent: "vision" });
});
