# Sphere Agent Service Architecture

This repository uses a graph-based agent workflow in the backend to route user prompts to the correct service agent using an LLM-based router. The `backend/services/agent` package contains the core agent orchestration, while the gateway forwards authenticated requests to the agents service.

## Architecture Overview

- `backend/gateway/index.js` receives frontend requests and proxies `/agents` requests to the agent service.
- `backend/services/agent/index.js` starts the agents service.
- `backend/services/agent/graph/graph.js` defines the workflow graph that routes requests from a start node through a router node to one of the specialized agent nodes.
- `backend/services/agent/graph/router.js` uses an LLM prompt to decide which agent should handle the prompt.
- `backend/services/agent/config/llmModel.js` selects the correct LLM model for each agent type.
- `backend/services/agent/agents/*.agent.js` are the individual agent handler stubs for each task domain.

## How the Workflow Connects

1. The frontend sends an authenticated request to the gateway at `/agents`.
2. `backend/gateway/index.js` proxies the request to the `AGENTS_SERVICE_URL` configured in environment variables.
3. The agents service loads its workflow graph from `backend/services/agent/graph/graph.js`.
4. The graph starts at `_start_` and immediately transitions to the `router` node.
5. The router node reads `state.prompt` and constructs a classification prompt for the LLM.
6. The router invokes the model and returns a single agent label, such as `chat`, `search`, `coding`, `vision`, `pdf`, or `ppt`.
7. The graph uses a conditional edge from the `router` node to the selected agent node.
8. The selected agent node processes the request and finishes the workflow at `_end_`.

## Graph Structure

File: `backend/services/agent/graph/graph.js`

- `StateGraph(agentState)` builds the workflow graph.
- Nodes:
  - `router`
  - `search`
  - `ppt`
  - `pdf`
  - `vision`
  - `coding`
  - `chat`
- Edges:
  - `_start_ -> router`
  - `router -> chat|search|coding|vision|pdf|ppt` based on `state.agent`
  - Each task node -> `_end_`

The graph compiles into `export const graph = workflow.compile();`.

## Router Logic

File: `backend/services/agent/graph/router.js`

- Imports `getModel` from `backend/services/agent/config/llmModel.js`.
- Builds a prompt describing the available agent categories.
- Uses the current state prompt:
  - `User Query: ${state.prompt}`
- Invokes the selected model via `llm.invoke(prompt)`.
- Normalizes the result using `response.content.trim().toLowerCase()`.
- Writes the result back to state as `agent`.

The router is responsible for classifying the user request into one of the supported agent domains.

## LLM Model Selection

File: `backend/services/agent/config/llmModel.js`

The `getModel(agent)` function chooses a model instance based on the requested agent:

- `chat` -> `gemini`
- `coding` -> `gemini`
- `vision` -> `gemini`
- `search` -> `groq`
- `pdf` -> `groq`
- `ppt` -> `groq`
- default -> `gemini`

Models:
- `ChatGroq` for `search`, `pdf`, `ppt`
- `ChatGoogleGenerativeAI` for `chat`, `coding`, `vision`

This means the router can also use different LLM backends depending on the type of task.

## Agent Handlers

Files: `backend/services/agent/agents/*.agent.js`

Current agent files:
- `chat.agent.js`
- `search.agent.js`
- `coding.agent.js`
- `vision.agent.js`
- `pdf.agent.js`
- `ppt.agent.js`

Each agent exports an async function, for example:

```js
export const chatAgent = async (params) => {
}
```

These handlers are the places to implement task-specific processing once the router selects the agent type.

## State Definition

File: `backend/services/agent/graph/state.js`

The graph state contains:
- `prompt` — the original user query or request text
- `aiResponse` — the final AI response or processed output
- `agent` — the chosen agent label returned by the router

## Gateway Connection

File: `backend/gateway/index.js`

- Uses `express-http-proxy` to forward `/agents` requests to the agents service.
- Protects agents routes with `protect` middleware.
- Uses environment variables:
  - `AUTH_SERVICE_URL`
  - `CHAT_SERVICE_URL`
  - `AGENTS_SERVICE_URL`
  - `FRONTEND_URL`

This means the frontend never calls the agents service directly; it goes through the gateway.

## Running the Agents Service

The agents package is configured with:

```json
"scripts": {
  "dev": "nodemon index.js"
}
```

Start the service with:

```bash
cd backend/services/agent
npm run dev
```

## Important Notes

- The router currently returns only one agent label.
- The workflow uses a compiled graph to map router output to a specific agent node.
- The actual frontend request handler for the graph is not shown in the current codebase, so you will need to wire the compiled graph into an endpoint or controller to execute the workflow.
- The current agent files are stubs and should be implemented with real logic for each service type.

## Recommended Workflow Implementation

1. Receive a request with `prompt`.
2. Create an initial graph state using `agentState`.
3. Execute the compiled `graph` or call the `router` node directly.
4. Based on `state.agent`, call the selected agent handler.
5. Store the agent output in `aiResponse`.
6. Return the completed state to the client.

## Summary

The service agents work by using a graph-based orchestration model with:
- a central router node that classifies requests via an LLM,
- model selection tied to each agent type,
- and a gateway proxy that forwards authenticated frontend traffic to the agents service.

This README is meant to help you understand the current architecture and where to add the missing execution and agent logic.