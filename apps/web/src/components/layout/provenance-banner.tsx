interface ProvenanceBannerProps {
  paperCount: number;
  topicName?: string;
  dateRange?: string; // "2025-10 to 2026-04"
  lastUpdated?: string; // ISO date
}

export function ProvenanceBanner({ paperCount, topicName: _topicName, dateRange, lastUpdated }: ProvenanceBannerProps) {
  return (
    <div className="rounded-lg border border-[oklch(0.55_0.19_260)]/20 bg-gradient-to-br from-[oklch(0.55_0.19_260)]/5 to-transparent p-4">
      <div className="flex items-start gap-3">
        <span className="text-xl shrink-0">📚</span>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground mb-1">About this collection</h3>
          <p className="text-xs text-muted-foreground mb-3">
            {paperCount} AI papers · curated from arxiv · {dateRange ?? 'last 6 months'}
          </p>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
            <div className="flex gap-2">
              <dt className="text-muted-foreground font-medium shrink-0 w-20">Sources:</dt>
              <dd>arxiv.org (cs.AI, cs.CL, cs.LG, cs.MA, cs.CV, stat.ML)</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-muted-foreground font-medium shrink-0 w-20">Selection:</dt>
              <dd>Quality-first — abstract &gt;100 chars, AI categories, recency-sorted</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-muted-foreground font-medium shrink-0 w-20">Embeddings:</dt>
              <dd>Gemini text-embedding-001 (768 dims)</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-muted-foreground font-medium shrink-0 w-20">Updated:</dt>
              <dd>
                Weekly via Cloud Scheduler
                {lastUpdated ? ` · last sync ${new Date(lastUpdated).toLocaleDateString()}` : ''}
              </dd>
            </div>
          </dl>
          <div className="flex gap-3 mt-3">
            <a href="/methodology" className="text-xs text-[oklch(0.55_0.19_260)] hover:underline">
              View methodology ↗
            </a>
            <a
              href="https://github.com/abhid1234/AI-research-lab"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[oklch(0.55_0.19_260)] hover:underline"
            >
              View source code ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
