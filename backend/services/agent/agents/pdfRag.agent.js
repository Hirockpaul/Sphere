import { randomUUID } from "node:crypto";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { getPdfConversationFilter, getPdfVectorStore } from "../config/vectordB.js";
import { getModel } from "../config/llmModel.js";

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;
const RETRIEVAL_LIMIT = 6;
async function indexPdf(file, { userId, conversationId }) {
  if (file.mimetype !== "application/pdf") {
    throw new Error("PDF RAG requires a PDF file");
  }

  const loader = new PDFLoader(file.path, { splitPages: true });
  const pages = await loader.load();
  if (pages.length === 0) {
    throw new Error("No readable text was found in the uploaded PDF");
  }

  const documentId = randomUUID();
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: CHUNK_SIZE,
    chunkOverlap: CHUNK_OVERLAP,
  });
  const chunks = await splitter.splitDocuments(pages);

  for (const [index, chunk] of chunks.entries()) {
    chunk.metadata = {
      userId: String(userId),
      conversationId: String(conversationId),
      documentId,
      filename: file.originalname,
      pageNumber: chunk.metadata?.loc?.pageNumber ?? null,
      chunkIndex: index,
    };
  }

  const store = await getPdfVectorStore();
  await store.addDocuments(chunks);
  return { documentId, filename: file.originalname, chunks: chunks.length };
}

function getTextContent(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter((part) => part?.type === "text" && typeof part.text === "string")
    .map((part) => part.text)
    .join("\n");
}

export const pdfRag = async (state, dependencies = {}) => {
  const userId = state.userId;
  const conversationId = state.conversationId;
  const prompt = typeof state.prompt === "string" ? state.prompt.trim() : "";
  if (!userId || !conversationId || !prompt) {
    throw new Error("PDF RAG requires a prompt, user, and conversation");
  }

  const indexedDocument = state.file
    ? await (dependencies.indexPdf || indexPdf)(state.file, { userId, conversationId })
    : null;
  const store = dependencies.vectorStore || (await getPdfVectorStore());
  const relevantDocuments = await store.similaritySearch(
    prompt,
    RETRIEVAL_LIMIT,
    getPdfConversationFilter(userId, conversationId),
  );

  if (relevantDocuments.length === 0) {
    return {
      agent: "pdfRag",
      aiResponse: state.file
        ? "The PDF was indexed, but I could not find relevant text for that question."
        : "Upload a PDF in PDF RAG mode before asking questions about it.",
      pdfRag: indexedDocument,
    };
  }

  const context = relevantDocuments
    .map((document, index) => {
      const filename = document.metadata?.filename || "PDF";
      const page = document.metadata?.pageNumber || "unknown";
      return `[Source ${index + 1}: ${filename}, page ${page}]\n${document.pageContent}`;
    })
    .join("\n\n");

  const model = await (dependencies.getModel || getModel)("pdfRag");
  const response = await model.invoke([
    new SystemMessage(`You answer questions using only the supplied PDF context.
If the context does not contain the answer, say that you could not find it in the uploaded PDF.
Do not invent facts. Cite relevant page numbers when they are available.`),
    new HumanMessage(`PDF context:\n\n${context}\n\nUser question:\n${prompt}`),
  ]);
  const answer = getTextContent(response.content).trim();
  if (!answer) throw new Error("The PDF RAG model returned an empty response");

  return { agent: "pdfRag", aiResponse: answer, pdfRag: indexedDocument };
};
