import { getModel } from "../config/llmModel.js";

const VALID_AGENTS = new Set(["chat", "search", "coding", "vision", "pdf", "ppt"]);
const CODE_CONCEPTS =
  /\b(code|coding|program(?:ming)?|developer|function|component|hook|class|algorithm)\b/i;
const SOFTWARE_SYSTEMS =
  /\b(api|sdk|database|sql|schema|frontend|backend|full[- ]?stack)\b/i;
const TECHNOLOGIES =
  /\b(html|css|javascript|typescript|react|vue|angular|next\.?js|node\.?js|express|python|java|c\+\+)\b/i;
const DEVELOPMENT_TASKS =
  /\b(debug|bug|error|exception|stack trace|refactor|unit tests?|integration tests?|architecture)\b/i;
const APPLICATION_FEATURES =
  /\b(controller|repository|authentication|calculator|website|dashboard|dark mode|source files?|project files?)\b/i;
const CODING_ACTIONS =
  /\b(build|create|add|update|modify|implement|generate|write|review|audit|fix|debug|explain|refactor|optimi[sz]e|design|document|test)\b/i;

const CODING_SUBJECTS = [
  CODE_CONCEPTS,
  SOFTWARE_SYSTEMS,
  TECHNOLOGIES,
  DEVELOPMENT_TASKS,
  APPLICATION_FEATURES,
];

const shouldLogPerformance = () => process.env.NODE_ENV !== "production"
  && process.env.SPHERE_PERF_LOGGING !== "false";

function logRoute(startedAt, routeType, agent) {
  if (!shouldLogPerformance()) {
    return;
  }

  const elapsedMilliseconds = Math.round(performance.now() - startedAt);
  console.info(`[Sphere Router] ${elapsedMilliseconds}ms (${routeType} ${agent})`);
}

export const detectDeterministicAgent = (prompt = "") => {
  const normalized = typeof prompt === "string" ? prompt.trim() : "";
  if (!normalized) {
    return null;
  }

  const hasCodingSubject = CODING_SUBJECTS.some((pattern) => pattern.test(normalized));
  if (hasCodingSubject && CODING_ACTIONS.test(normalized)) {
    return "coding";
  }

  return null;
};

export const router = async (state) => {
  const startedAt = performance.now();
  const requestedAgent = state.agent === "image" ? "vision" : state.agent;

  if (requestedAgent !== "auto" && VALID_AGENTS.has(requestedAgent)) {
    logRoute(startedAt, "explicit", requestedAgent);
    return { agent: requestedAgent };
  }

  const deterministicAgent = detectDeterministicAgent(state.prompt);
  if (deterministicAgent) {
    logRoute(startedAt, "deterministic", deterministicAgent);
    return { agent: deterministicAgent };
  }

  const model = await getModel("chat");
  const prompt = `You are an intelligent router for a multi-agent AI platform.

Your job is to classify the user's request into exactly one agent.

Available agents:

chat
- General conversation
- Explanations
- Learning
- Brainstorming
- Casual questions

search
- Latest information
- Internet lookup
- News
- Current events
- Fact checking
- Documentation lookup
- Recent developments

coding
- Programming
- Debugging
- Code generation
- Code review
- APIs
- Architecture
- Software engineering

vision
- Image generation and editing

pdf
- PDF summarization
- PDF question answering
- PDF generation
- Document extraction

ppt
- PowerPoint generation
- Slide creation
- Presentation editing

Return ONLY one of these values:

chat
search
coding
vision
pdf
ppt

Do not explain.
Do not use punctuation.
Do not output anything except the agent name.

User Query:
${state.prompt}

 `;

  const response = await model.invoke(prompt);
  const selectedAgent = response.content.trim().toLowerCase();

  logRoute(startedAt, "model", selectedAgent);

  return {
    agent: VALID_AGENTS.has(selectedAgent) ? selectedAgent : "chat",
  };
};
