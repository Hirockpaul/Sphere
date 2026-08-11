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
  codingPrompts.forEach((prompt) => assert.equal(detectDeterministicAgent(prompt), "coding", prompt));
});

test("does not claim general or search prompts are deterministically coding", () => {
  ["Hello", "What is Java?", "Search the latest React news", "What is the weather?"].forEach((prompt) => {
    assert.equal(detectDeterministicAgent(prompt), null, prompt);
  });
});

test("deterministic and explicit coding routes avoid the router model", async () => {
  assert.deepEqual(await router({ prompt: codingPrompts[0], agent: "auto" }), { agent: "coding" });
  assert.deepEqual(await router({ prompt: "anything", agent: "coding" }), { agent: "coding" });
});
