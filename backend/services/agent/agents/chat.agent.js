import { getModel } from "../config/llmModel.js";
import { separateSystemMessages } from "../utils/modelMessages.js";

const loadConversationMemory = async (...args) => {
  const { getMemory } = await import("../config/memory.js");
  return getMemory(...args);
};

const getTextContent = (content) => {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";

  return content
    .filter((part) => part?.type === "text" && typeof part.text === "string")
    .map((part) => part.text)
    .join("\n");
};

export const chatAgent = async (state, dependencies = {}) => {
  const llm = await (dependencies.getModel || getModel)("chat");

  // Get previous conversation history
  const history = await (dependencies.getMemory || loadConversationMemory)(state.conversationId, state.userId);
  const { systemContent: memoryInstructions, conversation: previousMessages } = separateSystemMessages(history);
  const lastMessage = previousMessages.at(-1);
  const lastContent = getTextContent(lastMessage?.content).trim();
  const includesCurrentPrompt =
    ["user", "human"].includes(lastMessage?.role) &&
    lastContent === state.prompt.trim();

  // Search results provided by Search Agent
  const searchContext = state.searchResults?.length
    ? `Search results:\n${JSON.stringify(state.searchResults, null, 2)}`
    : "";
  const toolContext = state.toolResult
    ? `Structured tool result:\n${JSON.stringify(state.toolResult, null, 2)}`
    : "";

  const systemPrompt = `
You are Sphere, an intelligent AI assistant.

Identity:
- You are Sphere, not Gemini, Groq, or any underlying AI model.
- If asked who you are, identify yourself as Sphere.
- Do not reveal internal model providers or implementation details.

${searchContext}

${toolContext}

Retrieved context rules:
- If search results exist, use them as the primary source for current information.
- Preserve useful source links when they support the answer.
- If a structured tool result exists, use its values exactly.
- If a tool result has an error status, explain the configuration or retrieval problem clearly and do not fill in missing values.
- For time results, answer concisely unless the user asks for detail.
- Base current claims on the retrieved context.
- Do not invent facts that the search results do not support.
- Do not mention internal tools, routing, Tavily, Firecrawl, or implementation details unless the user asks how the information was obtained.
- If no retrieved context exists, answer normally using your knowledge.

Source rules:
- When web search results are provided and used, add a "## Sources" section at the end of the answer.
- Include only sources actually used to support the answer.
- Use a numbered list containing each source title and its exact URL.
- Never invent, alter, or guess a source URL.
- Do not add a Sources section when no web search was performed.
- Do not cite native time results unless web search results were also used.

Behavior:
- Answer clearly, accurately, and naturally.
- Understand the user's intent before responding.
- Be helpful, professional, and concise.
- Do not generate unnecessary information.

Formatting:
- For greetings and simple questions, respond naturally in plain text.
- For technical, educational, coding, or detailed topics, use clean Markdown.
- Use headings when appropriate.
- Use bullet points for lists.
- Use numbered lists for steps.
- Use fenced code blocks with language tags for code.
- Keep paragraphs short and readable.
- Avoid unnecessary walls of text.

${memoryInstructions.length ? `Additional memory context:\n${memoryInstructions.join("\n\n")}` : ""}
`;

  const messages = [
    {
      role: "system",
      content: systemPrompt,
    },

    // Previous conversation
    ...previousMessages,

    // Current user message
    ...(!includesCurrentPrompt
      ? [{ role: "user", content: state.prompt }]
      : []),
  ];

  const response = await llm.invoke(messages);

  return {
    ...state,
    aiResponse: getTextContent(response.content),
  };
};
