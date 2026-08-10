import { END, START, StateGraph } from "@langchain/langgraph";
import { AgentState } from "./state.js";
import { router } from "./router.js";
import { chatAgent } from "../agents/chat.agent.js";
import { searchAgent } from "../agents/search.agent.js";

const agentNodes = {
  chat: chatAgent,
  search: searchAgent,
  coding: chatAgent,
  vision: chatAgent,
  pdf: chatAgent,
  ppt: chatAgent,
};

const workflow = new StateGraph(AgentState);

workflow.addNode("router", router);

for (const [name, handler] of Object.entries(agentNodes)) {
  workflow.addNode(name, handler);
  workflow.addEdge(name, name === "search" ? "chat" : END);
}

workflow.addEdge(START, "router");
workflow.addConditionalEdges(
  "router",
  (state) => (state.agent in agentNodes ? state.agent : "chat"),
  Object.fromEntries(Object.keys(agentNodes).map((name) => [name, name])),
);

export const graph = workflow.compile();
