import { getModel } from "../config/llmModel.js";
import { detectCodingIntent } from "../tools/coding/codingIntent.js";
import { codingFallbackResponseSchema, codingResponseSchema, parseCodingResponse } from "../tools/coding/codingSchema.js";
import { requiresCodingResearch, researchCodingRequest } from "../tools/coding/codingResearch.js";
import { separateSystemMessages } from "../utils/modelMessages.js";

const loadConversationMemory = async (...args) => {
  const { getCodingMemory } = await import("../config/memory.js");
  return getCodingMemory(...args);
};
const CONTROLLED_CODING_ERROR = "Sphere couldn't complete the coding request. Please try again.";
const shouldLogPerformance = () => process.env.NODE_ENV !== "production"
  && process.env.SPHERE_PERF_LOGGING !== "false";
const isStructuredOutputError = (error) => error?.name === "ZodError"
  || error?.name === "OutputParserException"
  || error?.code === "OUTPUT_PARSING_FAILURE";

export const invokeWithDeadline = async (runnable, messages, timeoutMs) => {
  const controller = new AbortController();
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      const error = new Error(`Model request exceeded ${timeoutMs}ms`);
      error.name = "TimeoutError";
      reject(error);
    }, timeoutMs);
  });
  try {
    return await Promise.race([
      runnable.invoke(messages, { signal: controller.signal }),
      deadline,
    ]);
  } finally {
    clearTimeout(timer);
  }
};

const getTextContent = (content) => {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter((part) => part?.type === "text" && typeof part.text === "string")
    .map((part) => part.text)
    .join("\n");
};

const withoutDuplicatePrompt = (history, prompt) => {
  if (!Array.isArray(history)) return [];
  const lastMessage = history.at(-1);
  const isCurrentPrompt = ["user", "human"].includes(lastMessage?.role)
    && getTextContent(lastMessage?.content).trim() === prompt.trim();
  return isCurrentPrompt ? history.slice(0, -1) : history;
};

const GENERATE_SYSTEM_PROMPT = `You are Sphere's Coding Agent.

Intent is exactly "generate". Return intent exactly "generate" and responseType exactly "files".
Return only valid structured JSON matching the supplied schema. Never return Markdown or text outside the schema.

Generate accurate, complete, runnable code with the minimum necessary output. Prioritize correctness, completeness, simplicity, fast generation, and maintainability.

Generation rules:
- Generate only files required by the request. Prefer a small complete implementation over a large incomplete one.
- Do not add unnecessary files, dependencies, configuration, tests, documentation, explanations, placeholders, or fake functionality.
- Respect the requested stack. If none is specified, choose the simplest appropriate technology.
- For a simple frontend request, prefer index.html, style.css, and script.js unless a framework is requested.
- Generate complete files that work together. Keep imports, relative paths, and HTML asset references internally consistent.
- Never claim code was executed, tested, deployed, or verified.

Follow-up rules:
- Preserve the existing project structure and functionality.
- Modify only necessary files and never regenerate unrelated files.
- Maintain existing imports, paths, and file relationships.

File rules:
- Use relative forward-slash paths only. Never use absolute paths, parent traversal, or flatten nested files.
- File content must be raw source code with real line breaks, indentation, and quotes.
- Never use Markdown fences, JSON.stringify individual content, double-escaped newlines, or literal "\\n" where a newline belongs.

UI rules:
- Build responsive, polished, simple interfaces for mobile, tablet, and desktop.
- Use clear hierarchy, consistent spacing, sensible typography, Flexbox or Grid, subtle hover states, and useful transitions.
- Avoid excessive animation, gradients, and shadows. Prefer a single page unless multiple pages are requested.

Image rules:
- Add images only when they meaningfully improve the requested UI. Calculators, dashboards, login pages, and APIs normally need none.
- For restaurant, food delivery, e-commerce, travel, portfolio, and visual landing-page requests, relevant imagery normally improves the result. Include a small number of real images unless the user requests a text-only or image-free design.
- When the user supplies image URLs, use those URLs first.
- Otherwise, prefer Unsplash for general-purpose imagery and use only known valid https://images.unsplash.com URLs.
- Never invent image URLs, use placeholder image services, or add images merely to fill empty space. Keep imagery minimal and relevant.

Security and external information:
- Never emit credentials or real secrets. Use environment variables where secrets are required.
- Do not request external research for normal generation. Current documentation is supplied separately only when explicitly required.

Output rules:
- Keep summary short.
- Keep explanation, issues, suggestions, and nextSteps empty unless genuinely necessary or requested.
- Each file must contain path, language, and complete content.
- Make the simplest reasonable assumption when ambiguous; do not waste another call asking unnecessary questions.
- Return only the supplied structured JSON schema.`;

const TASK_SYSTEM_PROMPT = (intent) => `You are Sphere's coding agent. Intent: ${intent}.

Return only the supplied structured schema and keep intent exactly "${intent}".
Use responseType "review" for review, "architecture" for architecture, "text" for explain or documentation without files, "files" for generate/refactor/test, and "code" for a debug response containing a corrected file.

- Generate complete code, but only necessary or changed files. Preserve the existing project on follow-ups.
- Use relative forward-slash paths. File content must be raw source, never Markdown-fenced or JSON-stringified.
- Keep summary concise. Leave explanation, issues, suggestions, and nextSteps empty unless needed or requested.
- Respect the requested stack. Never include credentials or claim code was executed.
- Reviews need real issues; explanations need no files; architecture should stay relevant and concise.
`;

export const buildCodingSystemPrompt = (intent) => intent === "generate"
  ? GENERATE_SYSTEM_PROMPT
  : TASK_SYSTEM_PROMPT(intent);

export const renderCodingResponse = (response) => {
  const sections = [`## ${response.summary}`];
  if (response.explanation) sections.push(response.explanation);

  if (response.issues.length) {
    sections.push("### Issues", ...response.issues.map((issue) =>
      `- **${issue.severity.toUpperCase()}: ${issue.title}**${issue.line ? ` (line ${issue.line})` : ""}\n  ${issue.description}`,
    ));
  }

  if (response.files.length) sections.push(`Generated ${response.files.length} ${response.files.length === 1 ? "file" : "files"}. Open the Artifact panel to view the source.`);

  if (response.suggestions.length) {
    sections.push("### Suggestions", ...response.suggestions.map((item) => `- ${item}`));
  }
  if (response.nextSteps.length) {
    sections.push("### Next steps", ...response.nextSteps.map((item, index) => `${index + 1}. ${item}`));
  }
  return sections.join("\n\n");
};

export const codingAgent = async (state, dependencies = {}) => {
  const now = dependencies.now || (() => performance.now());
  const startedAt = now();
  const timings = { intent: 0, memory: 0, research: 0, llm: 0, validation: 0 };
  const prompt = typeof state?.prompt === "string" ? state.prompt.trim() : "";
  if (!prompt) throw new Error("A coding prompt is required");

  const loadMemory = dependencies.getMemory || loadConversationMemory;
  const loadModel = dependencies.getModel || getModel;
  const loadFallbackModel = dependencies.getFallbackModel
    || (dependencies.getModel ? null : getModel);
  const research = dependencies.research || researchCodingRequest;
  const modelTimeout = Number(process.env.OPENROUTER_TIMEOUT_MS) || 90_000;
  const intentStartedAt = now();
  const codingIntent = detectCodingIntent(prompt);
  timings.intent = now() - intentStartedAt;

  let history = [];
  let researchContext = "";
  const memoryStartedAt = now();
  try {
    const needsResearch = requiresCodingResearch(prompt);
    const [loadedHistory, loadedResearch] = await Promise.all([
      loadMemory(state.conversationId, state.userId),
      needsResearch ? research(prompt) : Promise.resolve(""),
    ]);
    history = loadedHistory;
    researchContext = loadedResearch;
  } catch (error) {
    if (process.env.NODE_ENV !== "production") console.error("Coding Agent memory unavailable:", error.message);
  }
  history = withoutDuplicatePrompt(history, prompt).slice(-6);
  const { systemContent: historyInstructions, conversation: conversationHistory } = separateSystemMessages(history);
  timings.memory = now() - memoryStartedAt;
  timings.research = researchContext ? timings.memory : 0;

  const messages = [
    {
      role: "system",
      content: [
        buildCodingSystemPrompt(codingIntent),
        ...historyInstructions,
        ...(researchContext ? [`Current external documentation for this request follows. Use only relevant facts and do not copy prose unnecessarily.\n\n${researchContext}`] : []),
      ].join("\n\n"),
    },
    ...conversationHistory,
    { role: "user", content: prompt },
  ];

  try {
    const model = await loadModel("coding");
    let structuredModel = model.withStructuredOutput(codingResponseSchema, {
      name: "coding_response",
    });
    let fallbackUsed = false;
    let llmCalls = 0;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const llmStartedAt = now();
      let rawResponse;
      let llmTimingRecorded = false;
      try {
        llmCalls += 1;
        rawResponse = await invokeWithDeadline(structuredModel, messages, modelTimeout);
      } catch (error) {
        timings.llm += now() - llmStartedAt;
        llmTimingRecorded = true;
        if (error?.name === "TimeoutError" && !fallbackUsed && loadFallbackModel) {
          if (process.env.NODE_ENV !== "production") console.warn("OpenRouter timed out; using the coding fallback model.");
          const fallbackModel = await loadFallbackModel("chat");
          structuredModel = fallbackModel.withStructuredOutput(codingFallbackResponseSchema, {
            name: "coding_response",
          });
          fallbackUsed = true;
          const fallbackStartedAt = now();
          llmCalls += 1;
          rawResponse = await invokeWithDeadline(structuredModel, messages, modelTimeout);
          timings.llm += now() - fallbackStartedAt;
        } else if (attempt === 0 && isStructuredOutputError(error)) {
          messages.push({
            role: "user",
            content: "Correct the previous response to satisfy the schema. Return complete structured data only.",
          });
          continue;
        } else {
          throw error;
        }
      }
      if (!llmTimingRecorded) timings.llm += now() - llmStartedAt;
      const validationStartedAt = now();
      try {
        const candidate = typeof rawResponse === "string" ? JSON.parse(rawResponse) : rawResponse;
        const codingResponse = parseCodingResponse({ ...candidate, intent: codingIntent });
        timings.validation += now() - validationStartedAt;
        if (shouldLogPerformance()) {
          console.info(`[Sphere Coding] Intent: ${Math.round(timings.intent)}ms | Memory/Research: ${Math.round(timings.memory)}ms | LLM: ${Math.round(timings.llm)}ms | Validation: ${Math.round(timings.validation)}ms | Total: ${Math.round(now() - startedAt)}ms | Calls: ${llmCalls}${fallbackUsed ? " | Fallback: chat" : ""}`);
        }
        return {
          ...state,
          agent: "coding",
          codingIntent,
          codingResponse,
          aiResponse: renderCodingResponse(codingResponse),
        };
      } catch (error) {
        timings.validation += now() - validationStartedAt;
        if (attempt === 1) throw error;
        const invalidOutput = typeof rawResponse === "string"
          ? rawResponse.slice(0, 12_000)
          : JSON.stringify(rawResponse).slice(0, 12_000);
        messages.push({
          role: "user",
          content: `Correct this invalid response to satisfy the schema. Return complete structured data only.\n\n${invalidOutput}`,
        });
      }
    }
  } catch (error) {
    if (process.env.NODE_ENV !== "production") console.error("Coding Agent failure:", error.message);
    if (shouldLogPerformance()) {
      console.info(`[Sphere Coding] Intent: ${Math.round(timings.intent)}ms | Memory/Research: ${Math.round(timings.memory)}ms | LLM: ${Math.round(timings.llm)}ms | Validation: ${Math.round(timings.validation)}ms | Total: ${Math.round(now() - startedAt)}ms | Failed`);
    }
    throw new Error(CONTROLLED_CODING_ERROR);
  }
};
