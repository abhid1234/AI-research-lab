import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Methodology · AI Research Lab',
  description: 'How the AI Research Lab collects, embeds, and analyzes papers — a full pipeline walkthrough.',
};

export default function MethodologyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-10"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to dashboard
        </Link>

        {/* Page header */}
        <div className="mb-12">
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-3">
            Methodology
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            How the AI Research Lab collects, processes, and surfaces insights from the AI literature.
          </p>
        </div>

        <div className="space-y-12">
          {/* 1. What this is */}
          <section>
            <SectionHeading number="01" title="What this is" />
            <div className="prose-content">
              <p className="text-sm text-muted-foreground leading-relaxed">
                The AI Research Lab is an agent-powered observatory for the AI literature. It continuously ingests
                papers from arxiv, embeds their content into a vector database, and runs a coordinated team of
                specialist agents to extract structured insights — contradictions, emerging benchmarks, research
                frontiers, and cross-paper connections. The goal is to surface what matters across hundreds of
                papers without requiring you to read them all.
              </p>
            </div>
          </section>

          {/* 2. Data sources */}
          <section>
            <SectionHeading number="02" title="Data sources" />
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Papers are fetched exclusively from{' '}
              <a href="https://arxiv.org" target="_blank" rel="noopener noreferrer" className="text-[oklch(0.55_0.19_260)] hover:underline">
                arxiv.org
              </a>
              {' '}via the Semantic Scholar API, which provides richer metadata (citation counts, open-access
              status, author affiliations) on top of the arxiv corpus. We cover these subject categories:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
              {['cs.AI — Artificial Intelligence', 'cs.CL — Computation & Language', 'cs.LG — Machine Learning', 'cs.MA — Multiagent Systems', 'cs.CV — Computer Vision', 'stat.ML — Statistics / ML'].map((cat) => (
                <div key={cat} className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-foreground font-mono">
                  {cat}
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Papers are filtered by recency (configurable window, default 6 months), abstract quality
              (&gt;100 characters), and minimum relevance score. The collection is sorted by recency
              and then by influence signals (citation count, Hugging Face upvotes, open-review decisions)
              to surface high-signal work early.
            </p>
          </section>

          {/* 3. Ingestion pipeline */}
          <section>
            <SectionHeading number="03" title="Ingestion pipeline" />
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              Each ingestion run follows four sequential steps:
            </p>
            <div className="space-y-4">
              {[
                {
                  step: '1. Search',
                  description: 'Query the Semantic Scholar Graph API with the topic\'s search terms. Paginate results, apply category and abstract-length filters, and deduplicate against already-stored paper IDs.',
                },
                {
                  step: '2. Embed',
                  description: 'Each paper\'s abstract (and title) is chunked into ~500-token segments with a 50-token overlap, then passed to Gemini text-embedding-001 to produce 768-dimensional vectors.',
                },
                {
                  step: '3. Store',
                  description: 'Paper metadata is stored in PostgreSQL. Embeddings are written into a pgvector column indexed with HNSW (cosine similarity) for sub-millisecond ANN lookup at scale.',
                },
                {
                  step: '4. Link',
                  description: 'Papers are associated with their topic via a join table, and the topic\'s paper count and last-sync timestamp are updated atomically.',
                },
              ].map(({ step, description }) => (
                <div key={step} className="flex gap-4">
                  <div className="shrink-0 w-24 text-xs font-semibold text-[oklch(0.55_0.19_260)] pt-0.5">{step}</div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 4. Agent system */}
          <section>
            <SectionHeading number="04" title="Agent system" />
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              Five specialist agents process the ingested papers. Each receives the full paper corpus for the
              topic and produces a structured JSON artifact that powers a dedicated tab in the dashboard.
            </p>
            <div className="space-y-4">
              {[
                {
                  name: 'Paper Analyzer',
                  purpose: 'For each paper, extracts the core problem statement, the approach taken, the main result or claim, and a plain-language takeaway. Outputs the "Papers" tab.',
                },
                {
                  name: 'Trend Mapper',
                  purpose: 'Identifies how research intensity has shifted across sub-topics over time. Flags emerging topics gaining momentum and declining areas. Drives the Topic Evolution chart.',
                },
                {
                  name: 'Contradiction Finder',
                  purpose: 'Surfaces pairs or groups of papers making conflicting empirical claims or methodological recommendations. Also identifies areas of emerging consensus and open debates across the collection.',
                },
                {
                  name: 'Benchmark Extractor',
                  purpose: 'Pulls benchmark names, metrics, and scores from paper results sections. Warns when papers report incomparable numbers (different datasets, splits, or metrics) — a common source of misleading leaderboard comparisons.',
                },
                {
                  name: 'Frontier Detector',
                  purpose: 'Identifies paradigm shifts, breakthrough results, and underexplored gaps. Surfaces papers that represent genuinely new directions rather than incremental improvements. Drives the Research Frontiers tab.',
                },
              ].map(({ name, purpose }) => (
                <div key={name} className="rounded-lg border border-border bg-card p-4">
                  <h3 className="text-sm font-semibold text-foreground mb-1.5">{name}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{purpose}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 5. 3-phase execution */}
          <section>
            <SectionHeading number="05" title="3-phase execution" />
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              Agents are orchestrated in three phases to manage dependencies and maximize parallelism:
            </p>
            <div className="space-y-3">
              {[
                {
                  phase: 'Phase 1 — Parallel foundation',
                  agents: 'Paper Analyzer + Trend Mapper',
                  description: 'These two agents have no dependencies on each other and run in parallel. They process the raw paper corpus directly.',
                },
                {
                  phase: 'Phase 2 — Needs Phase 1',
                  agents: 'Contradiction Finder + Benchmark Extractor',
                  description: 'These agents benefit from the structured summaries produced by the Paper Analyzer in Phase 1. They wait for Phase 1 to complete, then run in parallel with each other.',
                },
                {
                  phase: 'Phase 3 — Synthesis',
                  agents: 'Frontier Detector',
                  description: 'The Frontier Detector synthesizes outputs from all four prior agents to identify the most significant advances and gaps. It runs last, with full context from the entire analysis.',
                },
              ].map(({ phase, agents, description }) => (
                <div key={phase} className="flex gap-4 rounded-lg border border-border bg-muted/20 p-4">
                  <div className="shrink-0 min-w-0">
                    <p className="text-xs font-semibold text-foreground">{phase}</p>
                    <p className="text-[11px] text-[oklch(0.55_0.19_260)] font-mono mt-0.5">{agents}</p>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 6. Tech stack */}
          <section>
            <SectionHeading number="06" title="Tech stack" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                ['Next.js 15', 'App Router, Server Components'],
                ['Drizzle ORM', 'Type-safe PostgreSQL queries'],
                ['pgvector', 'HNSW ANN embeddings index'],
                ['Gemini', 'text-embedding-001 (768 dims)'],
                ['Vercel AI Gateway', 'Multi-provider LLM routing'],
                ['Recharts', 'Trend and landscape charts'],
              ].map(([tech, desc]) => (
                <div key={tech} className="rounded-md border border-border bg-card p-3">
                  <p className="text-xs font-semibold text-foreground">{tech}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 7. Open source */}
          <section>
            <SectionHeading number="07" title="Open source" />
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              The full source code — ingestion scripts, agent definitions, API routes, and frontend components
              — is available on GitHub. Issues and pull requests are welcome.
            </p>
            <a
              href="https://github.com/abhid1234/AI-research-lab"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-[oklch(0.55_0.19_260)]/30 bg-[oklch(0.55_0.19_260)]/5 px-4 py-2.5 text-sm font-medium text-[oklch(0.55_0.19_260)] hover:bg-[oklch(0.55_0.19_260)]/10 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              View on GitHub
            </a>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-border">
          <p className="text-xs text-muted-foreground">
            AI Research Lab · built by Abhi Das ·{' '}
            <Link href="/" className="text-[oklch(0.55_0.19_260)] hover:underline">
              Back to dashboard
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function SectionHeading({ number, title }: { number: string; title: string }) {
  return (
    <div className="flex items-baseline gap-3 mb-4">
      <span className="text-[11px] font-mono text-muted-foreground/50 shrink-0">{number}</span>
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
    </div>
  );
}
