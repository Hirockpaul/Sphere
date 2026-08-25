# Sphere AI

An AI workspace that brings conversations, coding, document analysis, web research, image generation, PDF generation, and PowerPoint creation into one application.

Sphere uses a **multi-agent LangGraph architecture** to route requests to specialized AI agents.

Sphere can:

* Chat, explain concepts, brainstorm, and answer general questions.
* Generate, debug, refactor, review, and package code projects.
* Analyze uploaded PDFs using RAG with Gemini embeddings and Qdrant.
* Generate professional PDF documents.
* Create PowerPoint presentations with charts, diagrams, tables, code, and visuals.
* Generate and analyze images using Gemini and image-generation services.
* Search the web using Tavily and Firecrawl for current information and research.
* Remember conversation context using Redis and MongoDB.
* Authenticate users with Firebase and secure HttpOnly session cookies.

## Stack

* React 19 + Vite + Tailwind CSS + Redux Toolkit.
* Node.js + Express 5 with a service-oriented backend.
* MongoDB + Mongoose for users, conversations, and messages.
* Redis for sessions, memory, and agent rate limiting.
* LangChain + LangGraph for AI orchestration.
* Gemini, Groq, and OpenRouter for AI workloads.
* Qdrant Cloud for PDF vector search and RAG.
* Tavily + Firecrawl for web research.
* AWS S3 for generated files and ImageKit for visuals.
* PDFKit + PptxGenJS for document and presentation generation.

## Architecture

```text
React + Vite
     │
     ▼
API Gateway :8000
     │
 ┌───┼────────────────┐
 ▼   ▼                ▼
Auth Chat         Agent Service
:8001 :8002           :8003
                       │
                    LangGraph
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
      Gemini          Groq        OpenRouter
        │
      Qdrant
        │
        S3
```

The frontend communicates with the API Gateway, which authenticates the user and forwards requests to the appropriate internal service.

## Setup

1. Install Node.js, Docker Desktop, and MongoDB.
2. Create the required Firebase, Gemini, Groq, OpenRouter, Qdrant, AWS, ImageKit, Tavily, and Firecrawl accounts/API keys.
3. Start Redis:

```bash
cd backend
docker compose up -d redis
```

4. Install dependencies in the frontend and backend services:

```bash
npm ci
```

5. Configure the required `.env` files for the gateway, auth, chat, agent, and frontend services.
6. Start the backend services:

```bash
cd backend/services/auth
npm run dev
```

```bash
cd backend/services/chat
npm run dev
```

```bash
cd backend/services/agent
npm run dev
```

```bash
cd backend/gateway
npm run dev
```

7. Start the frontend:

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173`.

## AI Modes

```text
Auto
Chat
Coding
PDF
PPT
Image
Search
```

Auto mode uses deterministic detection and Gemini classification to select the appropriate agent.

PDF and image uploads can also automatically activate internal capabilities such as `pdfRag` and `imageAnalyzer`.

## Project Structure

```text
Sphere/
├── frontend/
├── backend/
│   ├── gateway/
│   ├── services/
│   │   ├── auth/
│   │   ├── chat/
│   │   └── agent/
│   └── shared/
└── README.md
```

## Status

Implemented:

* Multi-agent LangGraph routing
* Firebase authentication
* MongoDB conversations
* Redis sessions and memory
* Coding artifacts
* PDF generation and RAG
* PowerPoint generation
* Image generation and analysis
* Web search
* S3 artifact storage
* Agent rate limiting

Planned:

* Billing and credits
* Razorpay integration
* Production-grade internal authentication
* Complete production security hardening

## Vision

**One AI workspace for chat, coding, research, documents, PDFs, presentations, and images.**

> Sphere can make mistakes. Verify important information.
