import { ChatGroq } from "@langchain/groq";

let groq;

const getGroq = () => {
  groq ??= new ChatGroq({
    model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
    temperature: 0,
    maxRetries: 2,
  });
  return groq;
};

export const getModel = (agent) => {
  switch (agent) {
    default:
      return getGroq();
  }
};
