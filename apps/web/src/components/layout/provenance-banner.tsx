interface ProvenanceBannerProps {
  paperCount: number;
  topicName?: string;
  dateRange?: string;
  lastUpdated?: string;
  dbPapers?: {
    publishedAt?: string | Date | null;
    citationCount?: number;
    influentialCitationCount?: number;
    venue?: string | null;
    authors?: { name?: string }[] | null;
    hasCode?: boolean;
    isOpenAccess?: boolean;
  }[];
  agentCount?: number;
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function formatMonthYear(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function ProvenanceBanner({
  paperCount,
  dateRange,
  lastUpdated,
  dbPapers,
  agentCount,
}: ProvenanceBannerProps) {
  const lastSyncStr = lastUpdated
    ? new Date(lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;

  const papers = dbPapers ?? [];
  const dateValues = papers
    .map((p) => (p.publishedAt ? new Date(p.publishedAt) : null))
    .filter((d): d is Date => d !== null && !isNaN(d.getTime()))
    .map((d) => d.getTime());
  const earliest = dateValues.length ? new Date(Math.min(...dateValues)) : null;
  const latest = dateValues.length ? new Date(Math.max(...dateValues)) : null;
  const dateRangeText =
    earliest && latest ? `${formatMonthYear(earliest)} — ${formatMonthYear(latest)}` : dateRange ?? 'last 6 months';

  const citationValues = papers.map((p) => Number(p.citationCount ?? 0)).filter((n) => !isNaN(n));
  const totalCitations = citationValues.reduce((a, b) => a + b, 0);
  const medianCitations = Math.round(median(citationValues));
  const maxCitations = citationValues.length ? Math.max(...citationValues) : 0;

  const influentialValues = papers.map((p) => Number(p.influentialCitationCount ?? 0)).filter((n) => !isNaN(n));
  const totalInfluential = influentialValues.reduce((a, b) => a + b, 0);
  const papersWithInfluential = influentialValues.filter((n) => n >= 1).length;

  const uniqueVenues = new Set<string>();
  for (const p of papers) {
    const v = (p.venue ?? '').trim();
    if (v) uniqueVenues.add(v);
  }

  const uniqueAuthors = new Set<string>();
  for (const p of papers) {
    const list = Array.isArray(p.authors) ? p.authors : [];
    for (const a of list) {
      const name = typeof a === 'object' && a !== null ? (a.name ?? '').trim() : '';
      if (name) uniqueAuthors.add(name);
    }
  }

  const topicsCovered = 9;

  // Soft pinkish-lavender (mauve) wash with a deeper plum left rule.
  // Restrained but distinct — reads as a curated editorial callout.
  return (
    <section
      className="relative overflow-hidden rounded-2xl"
      style={{
        background: 'oklch(0.95 0.03 330)',
        ['--prov-rule' as string]: 'oklch(0.50 0.18 325)',
        ['--prov-accent' as string]: 'oklch(0.38 0.18 325)',
      }}
      aria-labelledby="provenance-title"
    >
      {/* Deeper purple left rule — the visual anchor */}
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ background: 'var(--prov-rule)' }}
      />

      <header className="px-6 pt-5 pb-4 flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1.5 min-w-0">
          <p className="text-eyebrow">About this collection</p>
          <h2
            id="provenance-title"
            className="text-[17px] sm:text-[18px] font-medium tracking-tight leading-snug text-foreground"
          >
            Where the data comes from, how it&apos;s processed,{' '}
            <span
              className="font-medium"
              style={{ color: 'var(--prov-accent)' }}
            >
              and what&apos;s inside.
            </span>
          </h2>
        </div>
        <div className="flex items-center gap-4 text-[12px] tracking-tight">
          <a
            href="/methodology"
            className="text-foreground inline-flex items-center px-2 py-2 -mx-2 -my-2 underline underline-offset-4 decoration-foreground/30 hover:decoration-foreground transition-colors rounded-md"
          >
            methodology ↗
          </a>
          <a
            href="https://github.com/abhid1234/AI-research-lab"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground inline-flex items-center px-2 py-2 -mx-2 -my-2 underline underline-offset-4 decoration-foreground/30 hover:decoration-foreground transition-colors rounded-md"
          >
            source ↗
          </a>
        </div>
      </header>

      <div className="px-6 pb-5 grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4 lg:divide-x lg:divide-[color:var(--hairline)]">
        {/* Left: Source + selection criteria */}
        <div className="space-y-2 lg:pr-6">
          <p className="text-eyebrow">Where this came from</p>
          <dl className="space-y-1.5 text-xs">
            <Row label="Source">
              <span className="text-foreground">arxiv</span>
              <span className="text-muted-foreground"> · cs.AI, CL, LG, MA, CV · via Semantic Scholar</span>
            </Row>
            <Row label="Topics">
              <span className="text-foreground">9 fixed queries</span>
              <span className="text-muted-foreground"> · LLM Agents, Reasoning, Vision, RAG, Code, Safety, Fine-tuning, Scaling, Eval</span>
            </Row>
            <Row label="Selection">
              <span className="text-foreground">top ~50 per topic</span>
              <span className="text-muted-foreground"> · relevance-ranked, citation-sorted</span>
            </Row>
            <Row label="Quality bar">
              <span className="text-foreground">influential cites ≥ 1 OR total cites ≥ 5</span>
              <span className="text-muted-foreground"> · abstract required · CS only</span>
            </Row>
            <Row label="Enrichment">
              <span className="text-muted-foreground">HuggingFace upvotes · Papers with Code · OpenReview</span>
            </Row>
            <Row label="Embeddings">
              <span className="text-foreground">Gemini text-embedding-001</span>
              <span className="text-muted-foreground"> · 768d (cosine, HNSW)</span>
            </Row>
            <Row label="Agents">
              <span className="text-foreground">Claude Haiku 4.5</span>
              <span className="text-muted-foreground"> · {agentCount ?? 5} specialized agents</span>
            </Row>
            <Row label="Refresh">
              <span className="text-foreground">Weekly cron · same quality bar</span>
              {lastSyncStr && <span className="text-muted-foreground"> · last sync {lastSyncStr}</span>}
            </Row>
          </dl>
        </div>
        {/* Right: What's in it */}
        <div className="space-y-2 lg:pl-6">
          <p className="text-eyebrow">What&apos;s in it</p>
          <dl className="space-y-1.5 text-xs">
            <Row label="Papers">
              <span className="font-semibold tabular-nums text-foreground">{paperCount.toLocaleString()}</span>
            </Row>
            <Row label="Date range">
              <span className="text-foreground">{dateRangeText}</span>
            </Row>
            <Row label="Citations">
              <span className="font-semibold tabular-nums text-foreground">{totalCitations.toLocaleString()}</span>
              <span className="text-muted-foreground"> total</span>
              {medianCitations > 0 && (
                <span className="text-muted-foreground"> · median {medianCitations.toLocaleString()}</span>
              )}
              {maxCitations > 0 && (
                <span className="text-muted-foreground"> · max {maxCitations.toLocaleString()}</span>
              )}
            </Row>
            <Row label="Influential">
              <span className="font-semibold tabular-nums text-foreground">{totalInfluential.toLocaleString()}</span>
              <span className="text-muted-foreground"> influential cites</span>
              {papersWithInfluential > 0 && (
                <span className="text-muted-foreground"> · {papersWithInfluential.toLocaleString()} papers w/ ≥1</span>
              )}
            </Row>
            <Row label="Topics">
              <span className="font-semibold tabular-nums text-foreground">{topicsCovered}</span>
              <span className="text-muted-foreground"> categories · papers can span multiple</span>
            </Row>
            <Row label="Venues">
              <span className="font-semibold tabular-nums text-foreground">{uniqueVenues.size.toLocaleString()}</span>
              <span className="text-muted-foreground"> unique conferences / journals</span>
            </Row>
            <Row label="Authors">
              <span className="font-semibold tabular-nums text-foreground">{uniqueAuthors.size.toLocaleString()}</span>
              <span className="text-muted-foreground"> unique researchers</span>
            </Row>
            <Row label="Excluded">
              <span className="text-muted-foreground">papers without abstracts, low-citation papers, non-CS work, papers that don&apos;t match any of the 9 queries</span>
            </Row>
          </dl>
        </div>
      </div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="w-24 shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 flex-1">{children}</dd>
    </div>
  );
}
