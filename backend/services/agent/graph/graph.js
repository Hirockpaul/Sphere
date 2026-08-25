import { END, START, StateGraph } from "@langchain/langgraph";
import { AgentState } from "./state.js";
import { router } from "./router.js";
import { chatAgent } from "../agents/chat.agent.js";
import { searchAgent } from "../agents/search.agent.js";
import { codingAgent } from "../agents/coding.agent.js";
import { visionAgent } from "../agents/vision.agent.js";
import { pdfAgent } from "../agents/pdf.agent.js";
import { pptAgent } from "../agents/ppt.agent.js";
import { pdfRag } from "../agents/pdfRag.agent.js";
import { imageAnalyzer } from "../agents/imageAnalyzer.agent.js";

export const agentNodes = {
  chat: chatAgent,
  search: searchAgent,
  coding: codingAgent,
  vision: visionAgent,
  pdf: pdfAgent,
  ppt: pptAgent,
  pdfRag,
  imageAnalyzer,
};

const workflow = new StateGraph(AgentState);

workflow.addNode("router", router);

for (const [name, handler] of Object.entries(agentNodes)) {
  workflow.addNode(name, handler);
}

workflow.addEdge(START, "router");
workflow.addConditionalEdges(
  "router",
  (state) => (state.agent in agentNodes ? state.agent : "chat"),
  Object.fromEntries(Object.keys(agentNodes).map((name) => [name, name])),
);

workflow.addEdge("search", "chat");
workflow.addEdge("chat", END);
workflow.addEdge("coding", END);
workflow.addEdge("vision", END);
workflow.addEdge("pdf", END);
workflow.addEdge("ppt", END);
workflow.addEdge("pdfRag", END);
workflow.addEdge("imageAnalyzer", END);

export const graph = workflow.compile();
