# AI Research Lab

## What This Is
Agent-powered research paper observatory. Ingest arxiv papers, discover cross-paper insights via multi-agent orchestration, render interactive visual artifacts.

## Architecture
- **Frontend**: Next.js 15 App Router, React, TypeScript, Tailwind, shadcn/ui, Recharts
- **Backend**: Next.js API routes, agent orchestrator
- **Database**: PostgreSQL + pgvector for embeddings and semantic search
- **AI**: Gemini for embeddings, Claude for agent reasoning
- **Paper source**: arxiv API

## Directory Structure
```
src/
  agents/        # Agent definitions (summarizer, trend-mapper, contradiction-finder, etc.)
  ingestion/     # arxiv API client, paper chunking, embedding pipeline
  db/            # Drizzle schema, migrations, vector search queries
  lib/           # Shared utilities, API clients, types
  components/
    artifacts/   # The 5-tab artifact viewer (Overview, Insights, Connections, Papers, Frontiers)
    chat/        # Left-panel agent chat interface
    layout/      # App shell, navigation
scripts/         # CLI scripts for paper ingestion, DB setup
```

## Key Patterns
- Papers are chunked into ~500 token segments with overlap, embedded via Gemini, stored in pgvector
- Agents are orchestrated using a multi-agent pattern (similar to agent-kit)
- Artifact views are React components rendered from structured JSON that agents output
- The chat panel drives artifact generation — user asks a question, agent generates structured output, frontend renders it

## Commands
- `npm run dev` — Start dev server
- `npm run ingest -- --topic "topic" --count N` — Ingest papers from arxiv
- `npm run db:push` — Push schema changes
