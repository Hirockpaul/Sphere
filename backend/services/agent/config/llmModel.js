import { ChatGroq } from "@langchain/groq";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenRouter } from "@langchain/openrouter";

let groq;
let gemini;
let pptGemini;
let openrouter;

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
    model: process.env.GEMINI_MODEL || "gemini-3-flash-preview",
    maxRetries: 2,
  });

  return gemini;
};

const getPptGemini = () => {
  pptGemini ??= new ChatGoogleGenerativeAI({
    model: process.env.GEMINI_MODEL || "gemini-3-flash-preview",
    maxOutputTokens: Number(process.env.PPT_MAX_OUTPUT_TOKENS) || 16_384,
    maxRetries: 2,
    json: true,
  });
  return pptGemini;
};

const getOpenRouter = () => {
  if (!process.env.OPENROUTER_MODEL) {
    throw new Error("OPENROUTER_MODEL is required for the Coding Agent");
  }
  openrouter ??= new ChatOpenRouter({
    model: process.env.OPENROUTER_MODEL,
    temperature: 0,
    maxTokens: Number(process.env.OPENROUTER_MAX_TOKENS) || 8000,
    maxRetries: 1,
  });

  return openrouter;
};

export const getModel = (agent) => {
  switch (agent) {
    case "chat":
      return getGemini();

    case "search":
      return getGroq();

    case "coding":
      return getOpenRouter();


    case "pdf":
      return getGemini();

    case "ppt":
      return getPptGemini();

    default:
      return getGemini();
  }
};
