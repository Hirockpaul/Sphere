import { getModel } from "../config/llmModel.js"

const VALID_AGENTS = new Set(["chat", "search", "coding", "vision", "pdf", "ppt"]);
const CODING_REQUEST = /\b(?:code|coding|program(?:ming)?|developer|function|component|hook|class|algorithm|api|sdk|database|sql|schema|frontend|backend|full[- ]?stack|html|css|javascript|typescript|react|vue|angular|next\.?js|node\.?js|express|python|java|c\+\+|debug|bug|error|exception|stack trace|refactor|unit tests?|integration tests?|architecture|controller|repository|authentication|calculator|website|dashboard|dark mode|source files?|project files?)\b/i;
const CODING_ACTION = /\b(?:build|create|add|update|modify|implement|generate|write|review|audit|fix|debug|explain|refactor|optimi[sz]e|design|document|test)\b/i;

const shouldLogPerformance = () => process.env.NODE_ENV !== "production"
  && process.env.SPHERE_PERF_LOGGING !== "false";

export const detectDeterministicAgent = (prompt = "") => {
  const normalized = typeof prompt === "string" ? prompt.trim() : "";
  if (!normalized) return null;
  if (CODING_REQUEST.test(normalized) && CODING_ACTION.test(normalized)) return "coding";
  return null;
};

export const router = async (state) => {
 const startedAt = performance.now();
 const requestedAgent = state.agent === "image" ? "vision" : state.agent;
 if (requestedAgent !== "auto" && VALID_AGENTS.has(requestedAgent)) {
   if (shouldLogPerformance()) console.info(`[Sphere Router] ${Math.round(performance.now() - startedAt)}ms (explicit ${requestedAgent})`);
   return { agent: requestedAgent };
 }

 const deterministicAgent = detectDeterministicAgent(state.prompt);
 if (deterministicAgent) {
   if (shouldLogPerformance()) console.info(`[Sphere Router] ${Math.round(performance.now() - startedAt)}ms (deterministic ${deterministicAgent})`);
   return { agent: deterministicAgent };
 }

 const llm = await getModel("chat")
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
- Image analysis
- Image generation
- OCR
- Computer vision

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

 `

 const response = await llm.invoke(prompt)
 const selectedAgent = response.content.trim().toLowerCase();

 if (shouldLogPerformance()) console.info(`[Sphere Router] ${Math.round(performance.now() - startedAt)}ms (model)`);

 return {
    agent: VALID_AGENTS.has(selectedAgent) ? selectedAgent : "chat"
 }
  
}
