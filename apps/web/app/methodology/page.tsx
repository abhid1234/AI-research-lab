import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Methodology · AI Research Lab',
  description: 'How the AI Research Lab collects, embeds, and analyzes papers — a full pipeline walkthrough.',
};

// One chart-palette color per numbered section. Used on the section numeral
// and the small color-dot beside each H2 so the seven-step sequence reads
// as a rhythm of color, not a wall of text. CSS vars come from globals.css.
const SECTION_COLORS = [
  'var(--chart-1)',  // 01 What this is        — plum
  'var(--chart-3)',  // 02 Data sources        — teal
  'var(--chart-2)',  // 03 Ingestion pipeline  — amber
  'var(--chart-5)',  // 04 Agent system        — rose
  'var(--chart-4)',  // 05 Three-phase exec    — chartreuse / olive
  'var(--chart-7)',  // 06 Stack               — ochre
  'var(--chart-8)',  // 07 Open source         — forest green
] as const;

// Per-arxiv-category tint — mirrors the home page topic palette so the
// codes carry the same color vocabulary across the site.
const CATEGORY_TINTS: Record<string, string> = {
  'cs.AI':   'var(--chart-1)',  // plum
  'cs.CL':   'var(--chart-3)',  // teal
  'cs.LG':   'var(--chart-2)',  // amber
  'cs.MA':   'var(--chart-5)',  // rose
  'cs.CV':   'var(--chart-6)',  // muted indigo
  'stat.ML': 'var(--chart-8)',  // forest green
};

export default function MethodologyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-16 lg:py-24">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-2 py-2 -mx-2 -my-2 text-[11px] uppercase tracking-[0.10em] text-muted-foreground hover:text-foreground transition-colors mb-12 rounded-md"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to dashboard
        </Link>

        {/* Page header — editorial hero */}
        <header className="mb-16 space-y-5">
          <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.10em] text-muted-foreground">
            <span>Methodology</span>
            <span className="text-foreground/30" aria-hidden="true">·</span>
            <span>4 min read</span>
          </div>
          <h1 className="text-hero text-foreground">
            How a thousand papers become{' '}
            <span className="signature-wash">a single map.</span>
          </h1>
          <p className="text-foreground/70 text-base leading-relaxed font-light max-w-2xl">
            The AI Research Lab continuously ingests papers from arXiv, embeds them into
            a vector database, and runs a coordinated team of specialist agents to extract
            structured insights — contradictions, emerging benchmarks, research frontiers,
            cross-paper connections.
          </p>
        </header>

        <div className="space-y-16">
          {/* 1. What this is */}
          <Section number="01" title="What this is" tone={SECTION_COLORS[0]}>
            <p>
              The AI Research Lab is an agent-powered observatory for the AI literature.
              The goal is to surface what matters across hundreds of papers without requiring
              you to read them all.
            </p>
          </Section>

          {/* 2. Data sources */}
          <Section number="02" title="Data sources" tone={SECTION_COLORS[1]}>
            <p>
              Papers are fetched from{' '}
              <a href="https://arxiv.org" target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-1.5 py-1.5 -my-1.5 -mx-1 underline underline-offset-4 decoration-foreground/30 hover:decoration-foreground transition-colors rounded-sm">
                arxiv.org
              </a>{' '}
              via the Semantic Scholar API for richer metadata (citations, open-access status,
              author affiliations). Quality signals come from HuggingFace, Papers with Code,
              and OpenReview.
            </p>
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2">
              {[
                ['cs.AI', 'Artificial Intelligence'],
                ['cs.CL', 'Computation & Language'],
                ['cs.LG', 'Machine Learning'],
                ['cs.MA', 'Multiagent Systems'],
                ['cs.CV', 'Computer Vision'],
                ['stat.ML', 'Statistics / ML'],
              ].map(([code, name]) => (
                <div key={code} className="flex items-baseline gap-2 py-1.5 border-b border-[color:var(--hairline)]">
                  <span
                    className="text-xs font-mono tabular-nums font-semibold"
                    style={{ color: CATEGORY_TINTS[code] ?? 'var(--foreground)' }}
                  >
                    {code}
                  </span>
                  <span className="text-xs text-muted-foreground">{name}</span>
                </div>
              ))}
            </div>
            <p className="mt-6">
              Papers are filtered by recency (default 6 months), abstract length, and minimum
              relevance score — then sorted by influence signals to surface high-signal work early.
            </p>
          </Section>

          {/* 3. Ingestion pipeline */}
          <Section number="03" title="Ingestion pipeline" tone={SECTION_COLORS[2]}>
            <p>Each ingestion run follows four sequential steps.</p>
            <ol className="mt-6 space-y-5">
              {[
                {
                  step: 'Search',
                  description: 'Query the Semantic Scholar Graph API with the topic\'s search terms. Paginate, filter by category and abstract length, deduplicate against stored IDs.',
                },
                {
                  step: 'Embed',
                  description: 'Each paper\'s abstract and title is chunked into ~500-token segments with 50-token overlap, then embedded via Gemini text-embedding-001 to 768-dimensional vectors.',
                },
                {
                  step: 'Store',
                  description: 'Metadata into PostgreSQL. Embeddings into a pgvector column indexed with HNSW (cosine) for sub-millisecond ANN lookup.',
                },
                {
                  step: 'Link',
                  description: 'Papers are joined to their topic; the topic\'s paper count and last-sync timestamp update atomically.',
                },
              ].map((item, i) => (
                <li key={item.step} className="flex gap-5 items-baseline">
                  <span
                    className="shrink-0 text-[15px] font-mono tabular-nums w-7 font-semibold leading-none"
                    style={{ color: SECTION_COLORS[2] }}
                  >
                    0{i + 1}
                  </span>
                  <div className="space-y-1.5">
                    <p className="text-foreground font-medium tracking-tight">{item.step}</p>
                    <p className="text-muted-foreground leading-relaxed">{item.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Section>

          {/* 4. Agent system */}
          <Section number="04" title="Agent system" tone={SECTION_COLORS[3]}>
            <p>
              Five specialist agents process the ingested papers. Each receives the full
              corpus for the topic and produces a structured artifact powering a dashboard tab.
            </p>
            <div className="mt-6 space-y-2">
              {[
                {
                  name: 'Paper Analyzer',
                  purpose: 'Extracts the core problem, the approach, the main result, and a plain-language takeaway for each paper. Powers the Papers tab.',
                  tone: 'var(--chart-1)',  // plum — matches Papers tab
                },
                {
                  name: 'Trend Mapper',
                  purpose: 'Tracks how research intensity has shifted across sub-topics over time. Surfaces emerging and declining areas. Drives the Topic Evolution chart.',
                  tone: 'var(--chart-2)',  // amber — matches Insights tab
                },
                {
                  name: 'Contradiction Finder',
                  purpose: 'Surfaces papers making conflicting empirical or methodological claims. Also identifies areas of consensus and open debates across the collection.',
                  tone: 'var(--chart-5)',  // rose — matches Connections tab
                },
                {
                  name: 'Benchmark Extractor',
                  purpose: 'Pulls benchmark names, metrics, and scores. Warns when papers report incomparable numbers (different datasets, splits, or metrics).',
                  tone: 'var(--chart-3)',  // teal — matches Frontiers tab
                },
                {
                  name: 'Frontier Detector',
                  purpose: 'Identifies paradigm shifts, breakthroughs, and underexplored gaps. Surfaces genuinely new directions over incremental improvements.',
                  tone: 'var(--chart-4)',  // chartreuse / olive — synthesis layer
                },
              ].map(({ name, purpose, tone }) => (
                <div
                  key={name}
                  className="py-3 pl-4 grid grid-cols-1 md:grid-cols-[12rem_1fr] gap-1 md:gap-6 border-l-[3px]"
                  style={{ borderLeftColor: tone }}
                >
                  <p className="text-foreground font-medium tracking-tight">{name}</p>
                  <p className="text-muted-foreground leading-relaxed">{purpose}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* 5. 3-phase execution */}
          <Section number="05" title="Three-phase execution" tone={SECTION_COLORS[4]}>
            <p>
              Agents are orchestrated in three phases to manage dependencies and maximize parallelism.
            </p>
            <div className="mt-6 space-y-3">
              {[
                {
                  phase: 'Phase I',
                  label: 'Parallel foundation',
                  agents: 'Paper Analyzer · Trend Mapper',
                  description: 'No dependencies. Run in parallel against the raw corpus.',
                  tone: 'var(--chart-6)',  // muted indigo — cool start
                },
                {
                  phase: 'Phase II',
                  label: 'Builds on Phase I',
                  agents: 'Contradiction Finder · Benchmark Extractor',
                  description: 'Use the structured summaries from the Paper Analyzer. Run in parallel with each other.',
                  tone: 'var(--chart-2)',  // amber — warm middle
                },
                {
                  phase: 'Phase III',
                  label: 'Synthesis',
                  agents: 'Frontier Detector',
                  description: 'Synthesizes outputs from all four prior agents. Runs last with full context.',
                  tone: 'var(--chart-9)',  // terracotta — hot finale
                },
              ].map(({ phase, label, agents, description, tone }) => (
                <div
                  key={phase}
                  className="grid grid-cols-1 md:grid-cols-[8rem_1fr] gap-2 md:gap-6 py-3 px-4 rounded-md"
                  style={{
                    background: `color-mix(in oklch, ${tone} 6%, transparent)`,
                  }}
                >
                  <div>
                    <p
                      className="font-semibold tracking-tight text-[13px]"
                      style={{ color: tone }}
                    >
                      {phase}
                    </p>
                    <p className="text-eyebrow mt-0.5">{label}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-foreground/70 font-mono text-[12px]">{agents}</p>
                    <p className="text-muted-foreground leading-relaxed">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* 6. Tech stack */}
          <Section number="06" title="Stack" tone={SECTION_COLORS[5]}>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
              {[
                ['Next.js 15', 'App Router'],
                ['Drizzle ORM', 'PostgreSQL'],
                ['pgvector', 'HNSW ANN index'],
                ['Gemini', 'text-embedding-001'],
                ['Claude', 'Haiku 4.5 agents'],
                ['Recharts', 'Trend & landscape charts'],
              ].map(([tech, desc]) => (
                <div key={tech} className="border-t border-[color:var(--hairline)] pt-2">
                  <p className="text-foreground text-[13px] font-medium tracking-tight">{tech}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* 7. Open source */}
          <Section number="07" title="Open source" tone={SECTION_COLORS[6]}>
            <p>
              The full source code — ingestion, agents, API routes, frontend — is on GitHub.
              Issues and pull requests are welcome.
            </p>
            <div className="mt-6">
              <a
                href="https://github.com/abhid1234/AI-research-lab"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full pl-4 pr-3.5 py-2.5 text-[13px] font-semibold text-white transition-all hover:scale-[1.02] hover:shadow-md"
                style={{
                  background: SECTION_COLORS[6],
                  boxShadow: `0 1px 3px color-mix(in oklch, ${SECTION_COLORS[6]} 30%, transparent)`,
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                View on GitHub
              </a>
            </div>
          </Section>
        </div>

        {/* Footer */}
        <div className="mt-20 pt-8 border-t border-[color:var(--hairline)]">
          <p className="text-[11px] text-muted-foreground tracking-tight">
            AI Research Lab · built by Abhi Das ·{' '}
            <Link href="/" className="inline-flex items-center px-2 py-2 -my-2 -mx-1 text-foreground underline underline-offset-4 decoration-foreground/30 hover:decoration-foreground transition-colors rounded-md">
              Back to dashboard
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Section({
  number,
  title,
  tone,
  children,
}: {
  number: string;
  title: string;
  tone: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline gap-3 mb-3">
        <span
          className="text-[20px] font-mono tabular-nums shrink-0 font-semibold leading-none"
          style={{ color: tone }}
        >
          {number}
        </span>
        <span
          className="h-2 w-2 rounded-full shrink-0 self-center"
          style={{ background: tone }}
          aria-hidden="true"
        />
        <h2 className="text-h2-tight text-foreground">{title}</h2>
      </div>
      <div className="text-[15px] text-muted-foreground leading-relaxed font-light max-w-2xl space-y-3">
        {children}
      </div>
    </section>
  );
}
