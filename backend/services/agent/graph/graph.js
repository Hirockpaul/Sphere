import { END, START, StateGraph } from "@langchain/langgraph";
import { AgentState } from "./state.js";
import { router } from "./router.js";
import { chatAgent } from "../agents/chat.agent.js";

const agentNodes = {
  chat: chatAgent,
  // Use the working chat agent until specialized implementations are added.
  search: chatAgent,
  coding: chatAgent,
  vision: chatAgent,
  pdf: chatAgent,
  ppt: chatAgent,
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
