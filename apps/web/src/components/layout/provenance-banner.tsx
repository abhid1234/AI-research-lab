interface ProvenanceBannerProps {
  paperCount: number;
  topicName?: string;
  dateRange?: string;
  lastUpdated?: string;
}

export function ProvenanceBanner({ paperCount, dateRange, lastUpdated }: ProvenanceBannerProps) {
  const lastSyncStr = lastUpdated
    ? new Date(lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;

  return (
    <div className="rounded-md border border-[oklch(0.55_0.19_260)]/15 bg-[oklch(0.55_0.19_260)]/[0.03] px-3 py-2">
      <div className="flex items-center gap-2 flex-wrap text-[11px]">
        <span className="text-sm">📚</span>
        <span className="font-semibold text-foreground">About this collection</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground"><span className="font-medium tabular-nums text-foreground">{paperCount}</span> papers</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">{dateRange ?? 'last 6 months'}</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">arxiv (cs.AI, CL, LG, MA, CV)</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">Gemini embeddings</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">weekly cron{lastSyncStr ? ` (last: ${lastSyncStr})` : ''}</span>
        <span className="ml-auto flex gap-2">
          <a href="/methodology" className="text-[oklch(0.55_0.19_260)] hover:underline">methodology ↗</a>
          <a href="https://github.com/abhid1234/AI-research-lab" target="_blank" rel="noopener noreferrer" className="text-[oklch(0.55_0.19_260)] hover:underline">source ↗</a>
        </span>
      </div>
    </div>
  );
}
