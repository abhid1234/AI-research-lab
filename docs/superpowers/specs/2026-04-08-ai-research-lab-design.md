# AI Research Lab — Design Specification

## Vision

An agent-powered research paper observatory. Ingest hundreds of AI papers from arxiv/Semantic Scholar, run multi-agent analysis to discover cross-paper insights (trends, contradictions, benchmarks, frontiers), and render interactive visual artifacts — all driven by AI agents.

Inspired by [@omarsar0's DAIR Papers Observatory](https://x.com/omarsar0/status/2033966663855448410). Open-source — Elvis hasn't released his; we'd be first to market.

## Target Users

- **Researchers** tracking a subfield — depth, citations, Research Frontiers
- **ML engineers** evaluating approaches — benchmark tables, practical recommendations
- **Newsletter writers / content creators** — curated highlights, exportable summaries
- **Generalists** staying current on AI — 60-second overview + drill-down

## Domain

AI papers only for v1. Architecture supports expansion to any arxiv category later.

---

## Architecture

Separated backend: Next.js 15 frontend + Node.js worker process. Monorepo via Turborepo with shared database package.

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (Next.js 15)                    │
│                                                              │
│  ┌──────────────┐    ┌───────────────────────────────────┐  │
│  │  Chat Panel   │    │       Artifact Preview             │  │
│  │  useChat()    │    │  [Overview|Insights|Connections|   │  │
│  │  streaming    │    │   Papers|Frontiers]                │  │
│  └──────────────┘    └───────────────────────────────────┘  │
│         │                                                    │
│  API Routes: /api/chat, /api/topics, /api/jobs              │
└──────────┬───────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│                    PostgreSQL + pgvector                      │
│  papers │ paper_chunks │ topics │ topic_papers │ jobs │      │
│  artifacts │ chat_messages                                   │
└──────────────────────────────────────────────────────────────┘
           ▲
           │
┌──────────────────────────────────────────────────────────────┐
│                   WORKER PROCESS (Node.js)                    │
│  Ingestion (Semantic Scholar + arxiv) + Agent Orchestrator   │
│  CLI scripts for manual ingestion/analysis                   │
└──────────────────────────────────────────────────────────────┘
```

### Communication Pattern

- Frontend writes job requests to `jobs` table, polls for status/results
- Worker polls `jobs` table every 5 seconds, processes pending jobs, writes artifacts to DB
- No message queue, no WebSockets for v1 — PostgreSQL is the only shared state

---

## Paper Sources

### Semantic Scholar (primary)
- Discovery, metadata, citation graph, SPECTER2 embeddings
- 200M+ papers, 50+ sources, free API tier
- Provides: title, abstract, authors, affiliations, venue, citation count, references, SPECTER2 embeddings

### arxiv (secondary)
- Full-text PDFs for deeper analysis
- Papers identified via Semantic Scholar that have arxiv IDs → fetch PDF
- v1: abstracts only. PDF full-text parsing is a future enhancement.

---

## Collections: Topic-Based Auto-Collections

Users define topics (e.g., "reinforcement learning", "LLM agents"). The system:

1. Searches Semantic Scholar for matching papers on a schedule (daily/weekly)
2. Ingests new papers automatically
3. Re-runs agent analysis when new papers arrive
4. Dashboard always shows the latest landscape

Papers can belong to multiple topics (many-to-many via `topic_papers` join table).

---

## Data Model

### topics
| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| name | TEXT | "reinforcement learning" |
| query | TEXT | Semantic Scholar query string |
| schedule | TEXT | "daily" \| "weekly" \| "manual" |
| lastSyncAt | TIMESTAMP | Last successful ingestion |
| paperCount | INT | Cached count |
| createdAt | TIMESTAMP | |

### papers
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Semantic Scholar paper ID |
| arxivId | TEXT nullable | arxiv ID if available |
| title | TEXT | |
| abstract | TEXT | |
| authors | JSONB | [{name, affiliations}] |
| categories | TEXT[] | |
| publishedAt | TIMESTAMP | |
| venue | TEXT nullable | |
| citationCount | INT | |
| pdfUrl | TEXT nullable | |
| createdAt | TIMESTAMP | |

### topic_papers
| Column | Type | Description |
|--------|------|-------------|
| topicId | FK | → topics.id |
| paperId | FK | → papers.id |

### paper_chunks
| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| paperId | FK | → papers.id |
| chunkIndex | INT | Order within paper |
| content | TEXT | Chunk text |
| source | TEXT | "abstract" \| "fulltext" |
| embedding | VECTOR(1536) | |
| metadata | JSONB | {section, pageNum} |

### jobs
| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| topicId | FK | → topics.id |
| type | TEXT | "ingest" \| "analyze" |
| status | TEXT | "pending" \| "running" \| "completed" \| "failed" |
| progress | JSONB | {step, total, message} |
| error | TEXT nullable | |
| startedAt | TIMESTAMP | |
| completedAt | TIMESTAMP | |
| createdAt | TIMESTAMP | |

### artifacts
| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| topicId | FK | → topics.id |
| jobId | FK | → jobs.id |
| agentType | TEXT | "paper-analyzer" \| "trend-mapper" \| "contradiction-finder" \| "benchmark-extractor" \| "frontier-detector" |
| tabTarget | TEXT | "overview" \| "insights" \| "connections" \| "papers" \| "frontiers" |
| data | JSONB | Typed per agent — the artifact payload |
| version | INT | Increments on re-analysis |
| createdAt | TIMESTAMP | |

### chat_messages
| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| topicId | FK | → topics.id |
| role | TEXT | "user" \| "assistant" |
| content | TEXT | |
| artifacts | UUID[] | Refs to generated artifacts |
| createdAt | TIMESTAMP | |

---

## Agent System

### 5 Specialist Agents

#### Agent 1: Paper Analyzer
**Purpose:** Deep structured extraction per paper — not just summaries.

**Input:** Paper metadata + top 3 chunks per paper (abstract-priority)

**Output schema:**
```typescript
{
  papers: [{
    paperId: string,
    problem: string,            // What problem the paper addresses
    approach: string,           // How they solve it
    keyInnovation: string,      // What's genuinely new
    mainResult: string,         // Primary finding
    limitations: string[],     
    methodology: {
      type: "empirical" | "theoretical" | "survey" | "system",
      datasets: string[],
      models: string[],
      computeScale: string,
    },
    claims: [{
      statement: string,
      evidence: string,
      strength: "strong" | "moderate" | "weak",
      chunkIds: string[],       // Grounding
    }],
    takeaway: string,           // One sentence for practitioners
  }]
}
```

#### Agent 2: Trend Mapper
**Purpose:** Identify momentum — what's accelerating, plateauing, or being abandoned.

**Input:** All paper metadata + dates + categories (minimal chunks needed)

**Output schema:**
```typescript
{
  landscape: [{
    paperId: string,
    x: number, y: number,       // UMAP coordinates (computed from SPECTER2 embeddings)
    cluster: string,
    clusterSize: number,
  }],
  topicEvolution: [{
    topic: string,
    timeline: [{ month: string, count: number, keyPaper: string }],
    momentum: "accelerating" | "steady" | "declining" | "emerging",
    signal: string,
  }],
  methodShifts: [{
    method: string,
    adoptionCurve: [{ month: string, paperCount: number }],
    status: "rising" | "mainstream" | "declining" | "niche",
    replacedBy: string | null,
    evidence: string,
  }],
  emergingTopics: [{
    topic: string,
    paperCount: number,
    notableAuthors: string[],
    whyItMatters: string,
  }],
}
```

#### Agent 3: Contradiction Finder
**Purpose:** Pairwise comparison of claims across papers. Highest-value agent.

**Input:** Phase 1 paper analyzer claims + chunks with conflicting content

**Output schema:**
```typescript
{
  contradictions: [{
    claim1: { statement, paper: {id, title, authors, date}, evidence, chunkIds },
    claim2: { statement, paper: {id, title, authors, date}, evidence, chunkIds },
    nature: "direct_contradiction" | "scope_difference" | "methodology_gap" | "temporal_shift",
    analysis: string,
    resolution: string | null,
    importance: "high" | "medium" | "low",
  }],
  consensus: [{
    finding: string,
    supportingPapers: [{ id, title, relevantClaim }],
    strength: number,
    caveats: string[],
  }],
  openDebates: [{
    question: string,
    sides: [{ position: string, papers: [{id, title}], strongestEvidence: string }],
    significance: string,
  }],
}
```

#### Agent 4: Benchmark Extractor
**Purpose:** Extract, normalize, and compare benchmarks across papers. Flag cherry-picking.

**Input:** Paper analyzer methodology data + chunks matching benchmark/score patterns

**Output schema:**
```typescript
{
  benchmarkTables: [{
    benchmarkName: string,
    description: string,
    metrics: string[],
    entries: [{
      model: string,
      paper: { id, title },
      scores: Record<string, number>,
      conditions: string,
      chunkIds: string[],
    }],
    notes: string[],
  }],
  newBenchmarks: [{
    name: string,
    paper: { id, title, date },
    measures: string,
    whyNeeded: string,
    adoption: string,
  }],
  warnings: [{
    paper: { id, title },
    issue: "cherry_picked_benchmarks" | "incomparable_conditions" | "unreproducible" | "saturated_benchmark",
    explanation: string,
    chunkIds: string[],
  }],
  stateOfTheArt: [{
    task: string,
    benchmark: string,
    currentBest: { model, score, paper: {id, title, date} },
    previousBest: { model, score, paper: {id, title, date} } | null,
    improvement: string,
  }],
}
```

#### Agent 5: Frontier Detector
**Purpose:** Synthesize ALL other agent outputs to identify genuinely important frontiers.

**Input:** All Phase 1 + Phase 2 outputs + chunks with novel/surprising content

**Output schema:**
```typescript
{
  frontiers: [{
    finding: string,
    explanation: string,
    category: "paradigm_shift" | "method_breakthrough" | "surprising_result" | "convergence" | "capability_unlock",
    sourcePapers: [{
      id: string, title: string,
      contribution: string,
      chunkIds: string[],
    }],
    relatedContradictions: string[],
    relatedBenchmarks: string[],
    trendContext: string,
    implications: string[],
    openQuestions: string[],
    confidence: number,
  }],
  pivotingTrends: [{
    from: string,
    to: string,
    timespan: string,
    evidence: [{ paperId, quote, chunkId }],
    significance: string,
  }],
  gaps: [{
    area: string,
    whyItMatters: string,
    adjacentWork: [{ paperId, title }],
  }],
}
```

### Agent Execution Pipeline

```
Phase 1 (parallel):    Paper Analyzer + Trend Mapper + Benchmark Extractor
Phase 2 (parallel):    Contradiction Finder + (needs Phase 1 claims)
Phase 3 (sequential):  Frontier Detector (needs all above)
```

### Agent Input Strategy

Agents don't get every chunk. The orchestrator does focused retrieval:

| Agent | Input strategy |
|-------|---------------|
| Paper Analyzer | Top 3 chunks per paper (abstract-priority) |
| Trend Mapper | Paper metadata + dates + categories only |
| Benchmark Extractor | Chunks matching "benchmark\|accuracy\|score\|F1\|BLEU\|eval" |
| Contradiction Finder | Phase 1 claims + chunks with conflicting content |
| Frontier Detector | All Phase 1-2 outputs + chunks matching "novel\|first\|new approach\|surprising" |

### Cost Tiering

| Agent | Model tier | Reason |
|-------|-----------|--------|
| Paper Analyzer | Fast (e.g., Haiku) | High volume, straightforward extraction |
| Trend Mapper | Fast | Metadata analysis, minimal reasoning |
| Benchmark Extractor | Fast | Structured extraction from tables |
| Contradiction Finder | Strong (e.g., Sonnet) | Needs nuanced comparison |
| Frontier Detector | Strong | Highest-level synthesis |

---

## Frontend

### Layout

Two-panel: left 1/3 chat, right 2/3 artifact viewer. Dark theme. Topic selector in header.

### 5-Tab Artifact Viewer

**Overview:** Collection stats (paper count, topic count, insight count), Research Landscape scatter plot (UMAP 2D), Topic Evolution line chart, Benchmark Highlights table, Key Results cards, Method Adoption tracker.

**Insights:** Contradictions (with claim comparison cards), Consensus findings, Open Debates, New Benchmarks Introduced, Benchmark Warnings.

**Connections:** Most Cited in Collection, Method Lineage timeline, Author Clusters by lab/affiliation. List view for v1 (no graph visualization).

**Papers:** Searchable/filterable paper list. Each card shows: title, authors, venue, date, citations, problem/approach/result, claim count, benchmark count, PDF link.

**Research Frontiers:** Frontier finding cards (categorized: paradigm shift, breakthrough, etc.) with source papers, confidence score, implications, open questions, expandable source passages. Pivoting Trends section. Research Gaps section.

### Chat Panel

Two modes:
- **Path A (RAG query):** Question about existing data → vector search over chunks + artifacts → streamed answer. Fast.
- **Path B (trigger analysis):** "Analyze this collection" or new topic → creates job → streams progress → artifacts refresh on completion.

Intent detection: If no artifacts exist or user says "analyze"/"refresh" → Path B. Otherwise → Path A.

### Bottom Status Bar

Shows active job progress: "Analyzing... 3/5 agents complete" with progress bar.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 App Router |
| UI Components | shadcn/ui (card, tabs, table, badge, scroll-area, chart) |
| Charts | Recharts + shadcn ChartContainer |
| Styling | Tailwind CSS (dark theme) |
| Database | PostgreSQL + pgvector |
| ORM | Drizzle |
| AI SDK | Vercel AI SDK v6 (provider-agnostic) |
| Chat | @ai-sdk/react useChat |
| Embeddings | OpenAI text-embedding-3-small (default, swappable) |
| Agent LLM | Provider-agnostic, default Claude (strong) + Haiku (fast) |
| Paper API | Semantic Scholar + arxiv |
| Scatter plot | umap-js (client-side UMAP on SPECTER2 embeddings) |
| Local dev | Docker Compose (PostgreSQL + pgvector) |
| Monorepo | Turborepo |

---

## Project Structure

```
AI-research-lab/
├── package.json
├── turbo.json
├── docker-compose.yml
├── .env.example
│
├── packages/
│   └── db/
│       ├── schema.ts           # All Drizzle tables
│       ├── migrations/
│       ├── queries/
│       │   ├── papers.ts
│       │   ├── topics.ts
│       │   ├── artifacts.ts
│       │   ├── jobs.ts
│       │   └── search.ts       # Vector similarity
│       ├── client.ts
│       └── package.json
│
├── apps/
│   └── web/
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── page.tsx
│       │   ├── api/
│       │   │   ├── chat/route.ts
│       │   │   ├── topics/route.ts
│       │   │   ├── jobs/[id]/route.ts
│       │   │   └── ingest/route.ts
│       │   └── topics/[id]/page.tsx
│       ├── components/
│       │   ├── chat/
│       │   │   ├── chat-panel.tsx
│       │   │   ├── message.tsx
│       │   │   └── chat-input.tsx
│       │   ├── artifacts/
│       │   │   ├── artifact-viewer.tsx
│       │   │   ├── overview-tab.tsx
│       │   │   ├── insights-tab.tsx
│       │   │   ├── connections-tab.tsx
│       │   │   ├── papers-tab.tsx
│       │   │   └── frontiers-tab.tsx
│       │   ├── charts/
│       │   │   ├── research-landscape.tsx
│       │   │   ├── topic-evolution.tsx
│       │   │   ├── benchmark-table.tsx
│       │   │   └── method-tracker.tsx
│       │   └── layout/
│       │       ├── app-shell.tsx
│       │       ├── topic-selector.tsx
│       │       └── job-status-bar.tsx
│       ├── lib/
│       │   ├── ai.ts
│       │   └── types.ts
│       └── package.json
│
├── worker/
│   ├── index.ts
│   ├── ingestion/
│   │   ├── semantic-scholar.ts
│   │   ├── arxiv.ts
│   │   ├── chunker.ts
│   │   └── embedder.ts
│   ├── agents/
│   │   ├── orchestrator.ts
│   │   ├── paper-analyzer.ts
│   │   ├── trend-mapper.ts
│   │   ├── contradiction-finder.ts
│   │   ├── benchmark-extractor.ts
│   │   └── frontier-detector.ts
│   ├── lib/
│   │   ├── ai.ts
│   │   ├── prompts.ts
│   │   └── schemas.ts          # All Zod output schemas
│   └── package.json
│
└── scripts/
    ├── ingest.ts
    ├── analyze.ts
    ├── setup-db.ts
    └── seed.ts
```

---

## Deployment

### Local Development
```bash
docker compose up -d        # PostgreSQL + pgvector
npm run db:push              # Apply schema
npm run dev                  # Next.js dev server
npm run worker               # Start worker process
```

### Production (GCP — Abhi's setup)
- Cloud Run for Next.js app
- Cloud Run for worker process (always-on)
- Cloud SQL for PostgreSQL + pgvector
- Cloud Scheduler for cron (triggers ingestion API route)

### Self-Hosting (open-source users)
- Docker Compose with all services
- Or: Vercel (frontend) + Neon (database) + any compute for worker

---

## AI Provider Configuration

Provider-agnostic via AI SDK v6. Users configure via environment variables:

```
AI_PROVIDER=anthropic
AI_MODEL_STRONG=claude-sonnet-4-6
AI_MODEL_FAST=claude-haiku-4-5
EMBEDDING_PROVIDER=openai
EMBEDDING_MODEL=text-embedding-3-small
```

---

## Grounding Strategy

Every agent output includes `chunkIds` linking claims to exact paper passages. The frontend renders "View source" links that expand to show the original text. This solves the hallucination/trust problem — users can verify any claim the system surfaces.

---

## Incremental Analysis

When new papers are added to a topic:
1. Only embed/chunk new papers
2. Re-run Paper Analyzer on new papers only
3. Re-run Trend Mapper, Contradiction Finder, Benchmark Extractor, Frontier Detector on the full collection (they need the full picture for synthesis)
4. New artifacts get incremented version numbers — old versions preserved for comparison

---

## v1 Scope

Everything above is in scope for v1:
- Paper ingestion via Semantic Scholar + arxiv
- Topic-based auto-collections with cron scheduling
- 5 specialist agents with 3-phase execution pipeline
- 5-tab artifact viewer (Overview, Insights, Connections, Papers, Research Frontiers)
- Chat panel with RAG queries + analysis triggering
- Provider-agnostic AI via AI SDK with cost tiering
- Docker Compose for local dev
- CLI for manual ingestion/analysis
- Dark theme UI matching Elvis's design language

### Not in v1
- Full-text PDF parsing (abstracts only)
- Graph visualization for Connections tab (list view instead)
- Export/share artifacts as HTML/PDF
- User authentication (single-user, localhost-first)
- Multiple concurrent analysis jobs
