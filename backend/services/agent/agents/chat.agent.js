import { getModel } from "../config/llmModel.js";

const SYSTEM_PROMPT =
  "You are a helpful assistant for a multi-agent AI platform. Answer clearly and concisely.";

export const chatAgent = async (state) => {
  const llm = await getModel("chat");
  const response = await llm.invoke([
    { role: "system", content: SYSTEM_PROMPT },
    { role: "human", content: state.prompt },
  ]);

  return {
    aiResponse: response.content,
  };
};
