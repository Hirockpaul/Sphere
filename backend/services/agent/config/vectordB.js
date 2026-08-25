import { QdrantVectorStore } from "@langchain/qdrant";
import { getPdfEmbeddings } from "./embeddings.js";

const EMBEDDING_DIMENSIONS = 768;
let vectorStore;

export async function getPdfVectorStore() {
  if (!process.env.QDRANT_URL || !process.env.QDRANT_API_KEY) {
    throw new Error("QDRANT_URL and QDRANT_API_KEY are required for PDF RAG");
  }

  vectorStore ??= new QdrantVectorStore(getPdfEmbeddings(), {
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY,
    collectionName: process.env.QDRANT_PDF_COLLECTION || "sphere_pdf_chunks",
    collectionConfig: {
      vectors: { size: EMBEDDING_DIMENSIONS, distance: "Cosine" },
    },
  });
  await vectorStore.ensureCollection();
  return vectorStore;
}

export function getPdfConversationFilter(userId, conversationId) {
  return {
    must: [
      { key: "metadata.userId", match: { value: String(userId) } },
      { key: "metadata.conversationId", match: { value: String(conversationId) } },
    ],
  };
}
