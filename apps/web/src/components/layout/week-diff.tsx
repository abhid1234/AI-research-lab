'use client';

interface WeekDiffProps {
  papers: any[]; // dbPapers
}

export function WeekDiff({ papers }: WeekDiffProps) {
  if (!papers || papers.length === 0) return null;

  const now = Date.now();
  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  const twoWeeks = 14 * 24 * 60 * 60 * 1000;

  const thisWeek = papers.filter((p) => {
    const t = p.publishedAt ? new Date(p.publishedAt).getTime() : 0;
    return t > now - oneWeek;
  });
  const lastWeek = papers.filter((p) => {
    const t = p.publishedAt ? new Date(p.publishedAt).getTime() : 0;
    return t > now - twoWeeks && t <= now - oneWeek;
  });

  const thisWeekCount = thisWeek.length;
  const lastWeekCount = lastWeek.length;
  const delta = thisWeekCount - lastWeekCount;
  const trend = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">This Week</h3>
        <span className={`text-xs font-medium ${trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-rose-600' : 'text-muted-foreground'}`}>
          {trend === 'up' && '▲'} {trend === 'down' && '▼'} {delta >= 0 ? '+' : ''}{delta} vs last week
        </span>
      </div>
      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-bold tabular-nums text-foreground">{thisWeekCount}</span>
        <span className="text-sm text-muted-foreground">new paper{thisWeekCount !== 1 ? 's' : ''} ingested</span>
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        Last week: {lastWeekCount} paper{lastWeekCount !== 1 ? 's' : ''}
      </p>
    </div>
  );
}
