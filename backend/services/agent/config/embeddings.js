import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

let embeddings;

export function getPdfEmbeddings() {
  embeddings ??= new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GOOGLE_API_KEY,
    model: process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001",
  });
  return embeddings;
}
