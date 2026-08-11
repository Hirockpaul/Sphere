import test from "node:test";
import assert from "node:assert/strict";
import { buildCodingSystemPrompt, codingAgent, invokeWithDeadline } from "../agents/coding.agent.js";
import { CODING_INTENTS, detectCodingIntent } from "../tools/coding/codingIntent.js";
import { codingResponseSchema, normalizeCodingContent } from "../tools/coding/codingSchema.js";
import { requiresCodingResearch } from "../tools/coding/codingResearch.js";
import { toCodingMessage } from "../tools/coding/codingMemory.js";

process.env.SPHERE_PERF_LOGGING = "false";

const intentCases = [
  ["Write a Java binary search.", "generate"],
  ["Create a React login page.", "generate"],
  ["Build an Express JWT authentication API.", "generate"],
  ["Review this Java code.", "review"],
  ["Why am I getting Cannot read properties of undefined?", "debug"],
  ["Explain this React component.", "explain"],
  ["Refactor this Express controller.", "refactor"],
  ["Design a scalable Node.js microservice architecture.", "architecture"],
  ["Write unit tests for this service.", "test"],
  ["Create a README for this project.", "documentation"],
];

test("detects all supported coding intents deterministically", () => {
  for (const [prompt, expected] of intentCases) {
    assert.equal(detectCodingIntent(prompt), expected, prompt);
  }
  assert.deepEqual(Object.values(CODING_INTENTS).sort(), [
    "architecture", "debug", "documentation", "explain", "generate", "refactor", "review", "test",
  ]);
});

test("uses the strict generation policy only for generate intent", () => {
  const generatePrompt = buildCodingSystemPrompt("generate");
  assert.match(generatePrompt, /responseType exactly "files"/);
  assert.match(generatePrompt, /real line breaks/);
  assert.match(generatePrompt, /index\.html, style\.css, and script\.js/);
  assert.match(generatePrompt, /Do not request external research for normal generation/);
  assert.match(generatePrompt, /prefer Unsplash for general-purpose imagery/);
  assert.match(generatePrompt, /https:\/\/images\.unsplash\.com/);
  assert.match(generatePrompt, /Never invent image URLs/);
  assert.doesNotMatch(generatePrompt, /responseType "review"/);

  const reviewPrompt = buildCodingSystemPrompt("review");
  assert.match(reviewPrompt, /Intent: review/);
  assert.match(reviewPrompt, /responseType "review"/);
});

const baseResponse = (overrides = {}) => ({
  intent: "generate",
  responseType: "files",
  summary: "Created the requested code.",
  explanation: "The implementation follows the requested conventions.",
  files: [{ path: "src/index.js", language: "javascript", content: "export const value = 1;" }],
  issues: [],
  suggestions: [],
  nextSteps: ["Install dependencies."],
  ...overrides,
});

const mockDependencies = (responses, history = []) => {
  const invocations = [];
  let index = 0;
  return {
    invocations,
    getMemory: async () => history,
    research: async () => "",
    getModel: () => ({
      withStructuredOutput: () => ({
        invoke: async (messages) => {
          invocations.push(messages);
          const response = responses[Math.min(index, responses.length - 1)];
          index += 1;
          if (response instanceof Error) throw response;
          return response;
        },
      }),
    }),
  };
};

test("researches only explicit current documentation requests", async () => {
  for (const prompt of ["Build a calculator", "Create a React dashboard", "Build an Express authentication API"]) {
    assert.equal(requiresCodingResearch(prompt), false, prompt);
  }
  for (const prompt of ["Use the latest Stripe API", "Build with the current Next.js API", "Use https://example.com/api-docs"]) {
    assert.equal(requiresCodingResearch(prompt), true, prompt);
  }

  let researchCalls = 0;
  const normal = mockDependencies([baseResponse()]);
  normal.research = async () => { researchCalls += 1; return "docs"; };
  await codingAgent({ prompt: "Build a calculator", conversationId: "c1", userId: "u1" }, normal);
  assert.equal(researchCalls, 0);

  const current = mockDependencies([baseResponse()]);
  current.research = async () => { researchCalls += 1; return "Stripe API documentation"; };
  await codingAgent({ prompt: "Build using the latest Stripe API", conversationId: "c1", userId: "u1" }, current);
  assert.equal(researchCalls, 1);
  assert.match(current.invocations[0].find((message) => message.content.includes?.("external documentation")).content, /Stripe API documentation/);
});

test("returns structured generation without duplicating source outside the Artifact", async () => {
  const dependencies = mockDependencies([baseResponse()]);
  const result = await codingAgent({ prompt: "Create a JavaScript module", conversationId: "c1", userId: "u1" }, dependencies);
  assert.equal(result.codingIntent, "generate");
  assert.equal(result.codingResponse.files[0].path, "src/index.js");
  assert.match(result.aiResponse, /Open the Artifact panel/);
  assert.doesNotMatch(result.aiResponse, /```javascript/);
  assert.equal(result.codingResponse.files[0].content, "export const value = 1;");
});

test("supports review, debug, explain, architecture, and documentation response shapes", () => {
  const samples = [
    baseResponse({ intent: "review", responseType: "review", files: [], issues: [{ severity: "high", title: "Unsafe input", description: "Input is not validated.", line: null }] }),
    baseResponse({ intent: "debug", responseType: "code", files: [] }),
    baseResponse({ intent: "explain", responseType: "text", files: [] }),
    baseResponse({ intent: "architecture", responseType: "architecture", files: [] }),
    baseResponse({ intent: "documentation", responseType: "text", files: [] }),
  ];
  for (const sample of samples) assert.equal(codingResponseSchema.safeParse(sample).success, true);
});

test("executes review, debug, explain, refactor, architecture, tests, and documentation flows", async () => {
  const cases = [
    ["Review this Java code", baseResponse({ intent: "review", responseType: "review", files: [], issues: [{ severity: "medium", title: "Issue", description: "Details", line: null }] })],
    ["Fix this NullPointerException", baseResponse({ intent: "debug", responseType: "code", files: [] })],
    ["Explain this React component", baseResponse({ intent: "explain", responseType: "text", files: [] })],
    ["Refactor this controller", baseResponse({ intent: "refactor" })],
    ["Design an authentication architecture", baseResponse({ intent: "architecture", responseType: "architecture", files: [] })],
    ["Write tests for this function", baseResponse({ intent: "test" })],
    ["Document this API", baseResponse({ intent: "documentation", responseType: "text", files: [] })],
  ];
  for (const [prompt, response] of cases) {
    const dependencies = mockDependencies([response]);
    const result = await codingAgent({ prompt, conversationId: "c1", userId: "u1" }, dependencies);
    assert.equal(result.codingIntent, response.intent, prompt);
    assert.equal(dependencies.invocations.length, 1, prompt);
  }
});

test("handles a complex multi-file coding request in one generation call", async () => {
  const response = baseResponse({ files: [
    { path: "package.json", language: "json", content: "{}" },
    { path: "src/server.js", language: "javascript", content: "export default {};" },
    { path: "src/routes/auth.js", language: "javascript", content: "export default {};" },
  ] });
  const dependencies = mockDependencies([response]);
  const result = await codingAgent({ prompt: "Build a complete Express authentication API", conversationId: "c1", userId: "u1" }, dependencies);
  assert.equal(result.codingResponse.files.length, 3);
  assert.equal(dependencies.invocations.length, 1);
});

test("supports refactoring, test generation, and multi-file generation", () => {
  for (const intent of ["refactor", "test"]) {
    assert.equal(codingResponseSchema.safeParse(baseResponse({ intent })).success, true);
  }
  const multiFile = baseResponse({ files: [
    { path: "package.json", language: "json", content: "{}" },
    { path: "src/server.js", language: "javascript", content: "export default {};" },
    { path: "src/models/user.model.js", language: "javascript", content: "export default {};" },
  ] });
  assert.equal(codingResponseSchema.parse(multiFile).files.length, 3);
});

test("rejects unsafe paths, Markdown fences, credentials, and missing required files", () => {
  const invalidResponses = [
    baseResponse({ files: [{ path: "/tmp/file.js", language: "javascript", content: "ok" }] }),
    baseResponse({ files: [{ path: "../file.js", language: "javascript", content: "ok" }] }),
    baseResponse({ files: [{ path: "file.js", language: "javascript", content: "```js\ncode\n```" }] }),
    baseResponse({ files: [{ path: "file.js", language: "javascript", content: "const apiKey = 'real-secret';" }] }),
    baseResponse({ files: [] }),
    baseResponse({ responseType: "code" }),
  ];
  for (const response of invalidResponses) assert.equal(codingResponseSchema.safeParse(response).success, false);
});

test("normalizes escaped model documents without changing real source escapes", () => {
  assert.equal(
    normalizeCodingContent('<html>\\n\\t<body>Hello</body>\\n</html>'),
    '<html>\n  <body>Hello</body>\n</html>',
  );
  const javascript = 'const newline = "\\n";\nconsole.log(newline);';
  assert.equal(normalizeCodingContent(javascript), javascript);

  const providerEncoded = JSON.stringify('<!DOCTYPE html>"><html lang="en">">  <body>">FoodExpress"></body>"></html>">');
  assert.equal(
    normalizeCodingContent(providerEncoded),
    '<!DOCTYPE html>\n<html lang="en">\n  <body>\nFoodExpress\n</body>\n</html>\n',
  );

  const slashContinued = '"<!DOCTYPE html>\\' + '\n' + '<html lang=\\"en\\">\\' + '\n' + '<body>Food</body>"';
  assert.equal(
    normalizeCodingContent(slashContinued),
    '<!DOCTYPE html>\n<html lang="en">\n<body>Food</body>',
  );

  const quotedMultiline = '"const dish = {\n  name: \\"Pizza\\",\n  price: 12\n};"';
  assert.equal(
    normalizeCodingContent(quotedMultiline),
    'const dish = {\n  name: "Pizza",\n  price: 12\n};',
  );
});

test("uses follow-up memory without duplicating the current user prompt", async () => {
  const history = [
    { role: "user", content: "Create an Express API" },
    { role: "assistant", content: "Created it." },
    { role: "user", content: "Now add Redis caching." },
  ];
  const dependencies = mockDependencies([baseResponse()], history);
  await codingAgent({ prompt: "Now add Redis caching.", conversationId: "c1", userId: "u1" }, dependencies);
  const sent = dependencies.invocations[0];
  assert.equal(sent.filter((message) => message.role === "user" && message.content === "Now add Redis caching.").length, 1);
  assert.ok(sent.some((message) => message.content === "Create an Express API"));
});

test("includes persisted artifact files in follow-up context", async () => {
  const history = [{
    role: "assistant",
    content: "Created a calculator.",
    artifact: { files: [
      { path: "index.html", language: "html", content: "<button>1</button>" },
      { path: "style.css", language: "css", content: "body { color: black; }" },
    ] },
  }];
  const dependencies = mockDependencies([baseResponse({ files: [{ path: "style.css", language: "css", content: "body { color: white; background: black; }" }] })], history.map(toCodingMessage));
  await codingAgent({ prompt: "Add dark mode to the calculator", conversationId: "c1", userId: "u1" }, dependencies);
  const context = dependencies.invocations[0].map((message) => message.content).join("\n");
  assert.match(context, /<button>1<\/button>/);
  assert.match(context, /body \{ color: black; \}/);
});

test("limits coding context to the six most recent messages", async () => {
  const history = Array.from({ length: 10 }, (_, index) => ({
    role: index % 2 ? "assistant" : "user",
    content: `message-${index}`,
  }));
  const dependencies = mockDependencies([baseResponse()], history);
  await codingAgent({ prompt: "Create a module", conversationId: "c1", userId: "u1" }, dependencies);
  const sentHistory = dependencies.invocations[0].filter((message) => message.content.startsWith?.("message-"));
  assert.deepEqual(sentHistory.map((message) => message.content), ["message-4", "message-5", "message-6", "message-7", "message-8", "message-9"]);
});

test("continues when memory is unavailable", async () => {
  const dependencies = mockDependencies([baseResponse()]);
  dependencies.getMemory = async () => { throw new Error("Redis unavailable"); };
  const result = await codingAgent({ prompt: "Create a module", conversationId: "c1", userId: "u1" }, dependencies);
  assert.equal(result.codingIntent, "generate");
});

test("rejects empty prompts", async () => {
  await assert.rejects(() => codingAgent({ prompt: " " }, mockDependencies([baseResponse()])), /coding prompt is required/i);
});

test("retries malformed structured output and returns only validated data", async () => {
  const dependencies = mockDependencies([baseResponse({ files: [] }), baseResponse()]);
  const result = await codingAgent({ prompt: "Create a module", conversationId: "c1", userId: "u1" }, dependencies);
  assert.equal(dependencies.invocations.length, 2);
  assert.equal(result.codingResponse.files.length, 1);
});

test("returns controlled errors for persistent validation and LLM failures", async () => {
  const state = { prompt: "Create a module", conversationId: "c1", userId: "u1" };
  await assert.rejects(
    () => codingAgent(state, mockDependencies([baseResponse({ files: [] })])),
    /couldn't complete the coding request/i,
  );
  await assert.rejects(
    () => codingAgent(state, mockDependencies([new Error("provider stack details")])),
    /couldn't complete the coding request/i,
  );
});

test("does not application-retry provider failures", async () => {
  const dependencies = mockDependencies([new Error("provider unavailable")]);
  await assert.rejects(
    () => codingAgent({ prompt: "Create a module", conversationId: "c1", userId: "u1" }, dependencies),
    /couldn't complete the coding request/i,
  );
  assert.equal(dependencies.invocations.length, 1);
});

test("enforces a model deadline and falls back after an OpenRouter timeout", async () => {
  await assert.rejects(
    () => invokeWithDeadline({ invoke: () => new Promise(() => {}) }, [], 5),
    (error) => error.name === "TimeoutError",
  );

  const previousTimeout = process.env.OPENROUTER_TIMEOUT_MS;
  process.env.OPENROUTER_TIMEOUT_MS = "5";
  let fallbackCalls = 0;
  try {
    const result = await codingAgent(
      { prompt: "Create a module", conversationId: "c1", userId: "u1" },
      {
        getMemory: async () => [],
        research: async () => "",
        getModel: () => ({
          withStructuredOutput: () => ({ invoke: () => new Promise(() => {}) }),
        }),
        getFallbackModel: () => ({
          withStructuredOutput: () => ({
            invoke: async () => {
              fallbackCalls += 1;
              return baseResponse();
            },
          }),
        }),
      },
    );
    assert.equal(result.codingResponse.files.length, 1);
    assert.equal(fallbackCalls, 1);
  } finally {
    if (previousTimeout === undefined) delete process.env.OPENROUTER_TIMEOUT_MS;
    else process.env.OPENROUTER_TIMEOUT_MS = previousTimeout;
  }
});

test("retries structured parser failures once", async () => {
  const parserError = new Error("invalid structured output");
  parserError.name = "OutputParserException";
  const dependencies = mockDependencies([parserError, baseResponse()]);
  const result = await codingAgent({ prompt: "Create a module", conversationId: "c1", userId: "u1" }, dependencies);
  assert.equal(dependencies.invocations.length, 2);
  assert.equal(result.codingResponse.files.length, 1);
});

test("emits stage timings without prompt or credential data when enabled", async () => {
  const previousSetting = process.env.SPHERE_PERF_LOGGING;
  const originalInfo = console.info;
  const logs = [];
  let clock = 0;
  process.env.SPHERE_PERF_LOGGING = "true";
  console.info = (message) => logs.push(message);
  try {
    await codingAgent(
      { prompt: "Create a module with token=private-value", conversationId: "c1", userId: "u1" },
      { ...mockDependencies([baseResponse()]), now: () => { clock += 2; return clock; } },
    );
  } finally {
    console.info = originalInfo;
    process.env.SPHERE_PERF_LOGGING = previousSetting;
  }
  assert.match(logs[0], /Intent: \d+ms \| Memory\/Research: \d+ms \| LLM: \d+ms \| Validation: \d+ms \| Total: \d+ms \| Calls: 1/);
  assert.doesNotMatch(logs[0], /private-value/);
});
