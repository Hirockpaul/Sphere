import { ChatGroq } from "@langchain/groq";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

let groq;
let gemini;

const getGroq = () => {
  groq ??= new ChatGroq({
    model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
    temperature: 0,
    maxRetries: 2,
  });
  return groq;
};

const getGemini = () => {
  gemini ??= new ChatGoogleGenerativeAI({
    model: process.env.GEMINI_MODEL || "gemini-3.6-flash",
    temperature: 0,
    maxRetries: 2,
  });
  return gemini;
};

export const getModel = (agent) => {
  switch (agent) {
    case "search":
    case "pdf":
    case "ppt":
      return getGroq();
    default:
      return getGemini();
  }
};
