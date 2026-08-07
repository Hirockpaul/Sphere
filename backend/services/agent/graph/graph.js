import { END, START, StateGraph } from "@langchain/langgraph";
import { AgentState } from "./state.js";
import { router } from "./router.js";
import { searchAgent } from "../agents/search.agent.js";
import { pptAgent } from "../agents/ppt.agent.js";
import { pdfAgent } from "../agents/pdf.agent.js";
import { visionAgent } from "../agents/vision.agent.js";
import { codingAgent } from "../agents/coding.agent.js";
import { chatAgent } from "../agents/chat.agent.js";

const agentNodes = {
  chat: chatAgent,
  search: searchAgent,
  coding: codingAgent,
  vision: visionAgent,
  pdf: pdfAgent,
  ppt: pptAgent,
};

const workflow = new StateGraph(AgentState);

workflow.addNode("router", router);

for (const [name, handler] of Object.entries(agentNodes)) {
  workflow.addNode(name, handler);
  workflow.addEdge(name, END);
}

workflow.addEdge(START, "router");
workflow.addConditionalEdges(
  "router",
  (state) => (state.agent in agentNodes ? state.agent : "chat"),
  Object.fromEntries(Object.keys(agentNodes).map((name) => [name, name])),
);

export const graph = workflow.compile();
