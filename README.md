# AI Research Lab

Agent-powered research paper observatory. Ingest hundreds of AI papers, discover cross-paper insights, and generate interactive visual artifacts — all driven by AI agents.

Inspired by [@omarsar0's DAIR Papers Observatory](https://x.com/omarsar0/status/2033966663855448410).

## What It Does

1. **Ingest** — Pull papers from arxiv, chunk, embed, and store in a vector database
2. **Discover** — Multi-agent system finds cross-paper insights: trends, contradictions, novel methods, benchmark comparisons
3. **Visualize** — Generate interactive artifacts on-demand: research landscapes, topic evolution, benchmark tables, key findings
4. **Chat** — Ask natural language questions across your entire paper collection

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   Frontend                       │
│  ┌───────────────┐  ┌────────────────────────┐  │
│  │  Chat Panel   │  │   Artifact Preview      │  │
│  │  (agent chat) │  │  ┌──────┬──────┬─────┐ │  │
│  │               │  │  │Over- │Insi- │Fron- │ │  │
│  │               │  │  │view  │ghts  │tiers │ │  │
│  │               │  │  └──────┴──────┴─────┘ │  │
│  └───────────────┘  └────────────────────────┘  │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│              Agent Orchestrator                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │Summarizer│ │Trend     │ │Contradiction     │ │
│  │Agent     │ │Mapper    │ │Finder            │ │
│  └──────────┘ └──────────┘ └──────────────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │Benchmark │ │Citation  │ │Research Frontier │ │
│  │Comparator│ │Grapher   │ │Detector          │ │
│  └──────────┘ └──────────┘ └──────────────────┘ │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│              Knowledge Layer                      │
│  ┌──────────────┐  ┌───────────┐  ┌───────────┐ │
│  │ PostgreSQL   │  │ Embeddings│  │ arxiv API │ │
│  │ + pgvector   │  │ (Gemini)  │  │ ingestion │ │
│  └──────────────┘  └───────────┘  └───────────┘ │
└─────────────────────────────────────────────────┘
```

## Artifact Views

| Tab | What It Shows |
|-----|---------------|
| **Overview** | Collection stats, research landscape scatter plot, topic evolution over time, benchmark highlights, key results |
| **Insights** | Agent-discovered findings, benchmark comparisons, new benchmarks introduced |
| **Connections** | Citation graph, paper relationships, method lineage |
| **Papers** | Searchable paper library with filters |
| **Research Frontiers** | Bleeding-edge findings, contradictions between research groups, open questions |

## Tech Stack

- **Frontend**: Next.js 15, React, TypeScript, Tailwind, shadcn/ui
- **Backend**: Next.js API routes + agent orchestration
- **Database**: PostgreSQL + pgvector (embeddings + semantic search)
- **AI**: Gemini for embeddings, Claude/GPT for agent reasoning
- **Paper Source**: arxiv API
- **Visualization**: Recharts, D3.js for research landscape

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/abhid1234/AI-research-lab.git
cd AI-research-lab
pnpm install
```

### 2. Set up environment

```bash
cp .env.example .env.local
# Add your API keys (see .env.example for all required vars)
```

### 3. Start the database

```bash
docker compose up -d
pnpm db:setup
pnpm db:push
```

### 4. Seed with demo data (optional — no API keys needed)

```bash
pnpm seed
```

This inserts 5 pre-built LLM agent papers and pre-generated artifacts so all 5 dashboard tabs render immediately without any API calls.

### 5. Start the app

```bash
# Terminal 1: Start the background worker (handles ingestion + analysis jobs)
pnpm worker

# Terminal 2: Start the frontend
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Ingest real papers (requires API keys)

```bash
pnpm ingest -- --topic "LLM agents" --count 20
pnpm analyze -- --topic "LLM agents"
```

## Project Status

Early development. See [project plan](https://docs.google.com/document/d/1LgHlKJSF66f_5ntf3NSQQOKdOsy1JXPECntP4M_cgYU/edit) for the full roadmap.

## Related Projects

- [agent-kit](https://github.com/abhid1234/agent-kit) — Multi-agent orchestration framework (used for agent layer)
- [MindWeave](https://github.com/abhid1234/MindWeave) — AI knowledge hub (shares embedding/search patterns)
- [autoresearch-experiments](https://github.com/abhid1234/autoresearch-experiments) — Karpathy's autoresearch on a budget

## License

MIT
