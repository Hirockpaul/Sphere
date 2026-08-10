import { getModel } from "../config/llmModel.js"

const VALID_AGENTS = new Set(["chat", "search", "coding", "vision", "pdf", "ppt"]);

export const router = async (state) => {
 const requestedAgent = state.agent === "image" ? "vision" : state.agent;
 if (requestedAgent !== "auto" && VALID_AGENTS.has(requestedAgent)) {
   return { agent: requestedAgent };
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

 return {
    agent: VALID_AGENTS.has(selectedAgent) ? selectedAgent : "chat"
 }
  
}
