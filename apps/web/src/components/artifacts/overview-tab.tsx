'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import dynamic from 'next/dynamic';
import { BenchmarkTable } from '@/components/charts/benchmark-table';
import { TimelineScrubber } from '@/components/charts/timeline-scrubber';
import { TemporalSlider, filterPapersByWindow } from '@/components/charts/temporal-slider';
import { PaperDrawer } from '@/components/layout/paper-drawer';

const TopicEvolutionChart = dynamic(
  () => import('@/components/charts/topic-evolution').then(m => ({ default: m.TopicEvolutionChart })),
  { ssr: false, loading: () => <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">Loading chart...</div> }
);

const ResearchLandscape = dynamic(
  () => import('@/components/charts/research-landscape').then(m => ({ default: m.ResearchLandscape })),
  { ssr: false, loading: () => <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">Loading landscape...</div> }
);

interface OverviewTabProps {
  artifacts: { agentType: string; data: any }[];
  totalPaperCount?: number;
  dbPapers?: any[];
  topicName?: string;
  lastSyncAt?: string | null;
}

/** Render an ISO timestamp as a human-relative string ("2 hours ago"). */
function formatRelativeTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (isNaN(then)) return null;
  const deltaSec = Math.round((Date.now() - then) / 1000);
  if (deltaSec < 60) return 'just now';
  if (deltaSec < 3600) return `${Math.floor(deltaSec / 60)} min ago`;
  if (deltaSec < 86400) return `${Math.floor(deltaSec / 3600)} hr ago`;
  const days = Math.floor(deltaSec / 86400);
  if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;
  if (days < 30) return `${Math.floor(days / 7)} wk ago`;
  return `${Math.floor(days / 30)} mo ago`;
}

const FINDING_COLORS = [
  'bg-rose-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-blue-500',
  'bg-purple-500',
] as const;

/** Derive a stable cluster label from a paper object (mirrors research-landscape logic) */
function derivePaperCluster(paper: any): string {
  if (typeof paper.methodology === 'string' && paper.methodology.trim()) {
    return paper.methodology.trim().split(/\s+/)[0];
  }
  if (typeof paper.category === 'string' && paper.category.trim()) {
    return paper.category.trim();
  }
  if (Array.isArray(paper.categories) && paper.categories.length > 0) {
    const first = paper.categories[0];
    return typeof first === 'string' ? first : 'Other';
  }
  if (typeof paper.topic === 'string' && paper.topic.trim()) {
    return paper.topic.trim();
  }
  return 'Other';
}

const TOPIC_COLORS = [
  '#f43f5e', // rose
  '#10b981', // emerald
  '#f59e0b', // amber
  '#3b82f6', // blue
  '#8b5cf6', // violet
] as const;

export function OverviewTab({ artifacts, totalPaperCount, dbPapers, topicName, lastSyncAt }: OverviewTabProps) {
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [activeMonth, setActiveMonth] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [timeWindowMonths, setTimeWindowMonths] = useState<number>(0);

  const trendArtifact = artifacts.find((a) => a.agentType === 'trend-mapper');
  const paperArtifact = artifacts.find((a) => a.agentType === 'paper-analyzer');
  const benchmarkArtifact = artifacts.find((a) => a.agentType === 'benchmark-extractor');

  const trendData = trendArtifact?.data ?? {};
  const paperData = paperArtifact?.data ?? {};
  const benchmarkData = benchmarkArtifact?.data ?? {};

  const papers: any[] = paperData.papers ?? [];
  const topicEvolution: any[] = trendData.topicEvolution ?? [];
  const emergingTopics: any[] = trendData.emergingTopics ?? [];
  const methodShifts: any[] = trendData.methodShifts ?? [];
  const benchmarkTables: any[] = benchmarkData.benchmarkTables ?? [];
  const newBenchmarks: any[] = benchmarkData.newBenchmarks ?? [];

  const insightCount =
    (trendData.emergingTopics?.length ?? 0) +
    (trendData.methodShifts?.length ?? 0);

  // Single source of truth for header stats — stat cards and banner must agree.
  const displayPaperCount = totalPaperCount ?? papers.length;

  // Derive sorted unique months from topicEvolution data for timeline scrubber
  const months: string[] = Array.from(
    new Set(
      topicEvolution.flatMap((entry: any) =>
        Array.isArray(entry.data)
          ? entry.data.map((d: any) => (typeof d.month === 'string' ? d.month : '')).filter(Boolean)
          : []
      )
    )
  ).sort() as string[];

  // Topic legend for timeline scrubber
  const topicLegend = topicEvolution.slice(0, 5).map((entry: any, i: number) => ({
    name: typeof entry.topic === 'string' ? entry.topic : `Topic ${i + 1}`,
    color: TOPIC_COLORS[i % TOPIC_COLORS.length],
  }));

  // Filter papers by active month (using date/year field) for key results
  const monthFilteredPapers =
    activeMonth === null
      ? papers
      : papers.filter((p: any) => {
          const d: string = p.date ?? p.year ?? p.publishedAt ?? '';
          // Match "YYYY-MM" prefix
          return typeof d === 'string' && d.startsWith(activeMonth);
        });

  // Derive unique filter labels from the paper clusters
  const uniqueClusters: string[] = Array.from(
    new Set(papers.map((p) => derivePaperCluster(p)))
  ).filter((c) => c !== 'Other');

  // Single source of truth for topic count — max of the two signals so
  // the stat card and the description banner never disagree.
  const displayTopicCount = Math.max(uniqueClusters.length, topicEvolution.length);

  // Papers visible to the filtered views (cluster filter applied on top of month filter)
  const filteredPapers =
    activeFilter === 'all'
      ? monthFilteredPapers
      : monthFilteredPapers.filter((p) => derivePaperCluster(p).toLowerCase() === activeFilter.toLowerCase());

  // Filtered benchmark tables (pass-through — filtering is paper-level only)
  const visibleBenchmarkTables = benchmarkTables;

  // Time-window filtered db papers (for landscape chart and drawer)
  const timeFilteredDbPapers = filterPapersByWindow(dbPapers ?? [], timeWindowMonths);

  const agentCount = new Set(artifacts.map((a) => a.agentType)).size;
  const relativeSync = formatRelativeTime(lastSyncAt);

  return (
    <div className="space-y-6">
      {/* Topic headline + analysis meta */}
      {(topicName || relativeSync || agentCount > 0) && (
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          {topicName && (
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              {topicName}
            </h2>
          )}
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground tabular-nums">
            {relativeSync && <span>Last analyzed {relativeSync}</span>}
            {relativeSync && agentCount > 0 && <span className="mx-1.5">·</span>}
            {agentCount > 0 && <span>{agentCount} agents</span>}
            {(relativeSync || agentCount > 0) && displayPaperCount > 0 && <span className="mx-1.5">·</span>}
            {displayPaperCount > 0 && <span>{displayPaperCount} papers</span>}
          </p>
        </div>
      )}

      {/* Gradient stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <button onClick={() => setDrawerOpen(true)} className="text-left">
          <GradientStatCard label="Papers" value={displayPaperCount} clickable />
        </button>
        <GradientStatCard label="Topics Tracked" value={displayTopicCount} />
        <GradientStatCard label="Insights" value={insightCount} />
        <GradientStatCard label="Emerging Topics" value={emergingTopics.length} />
      </div>

      {/* Collection description banner */}
      {(displayPaperCount > 0 || topicEvolution.length > 0) && (
        <p className="text-sm text-muted-foreground">
          {displayPaperCount} paper{displayPaperCount !== 1 ? 's' : ''} spanning{' '}
          {displayTopicCount} distinct research topic{displayTopicCount !== 1 ? 's' : ''}.
          The topics are grouped in the chart below based on research clusters discovered
          in the current batch analysis.
        </p>
      )}

      {/* Timeline scrubber */}
      {months.length > 0 && (
        <TimelineScrubber
          months={months}
          topics={topicLegend}
          activeMonth={activeMonth}
          onMonthClick={setActiveMonth}
        />
      )}

      {/* Consolidated filter toolbar — cluster chips on top row, time window on bottom */}
      {(uniqueClusters.length > 0 || (dbPapers && dbPapers.length > 0)) && (
        <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2.5">
          {uniqueClusters.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground shrink-0 w-20">
                Cluster
              </span>
              <div className="flex flex-wrap gap-1.5 flex-1">
                <FilterChip
                  label="All"
                  active={activeFilter === 'all'}
                  onClick={() => setActiveFilter('all')}
                />
                {uniqueClusters.map((cluster) => (
                  <FilterChip
                    key={cluster}
                    label={cluster}
                    active={activeFilter === cluster.toLowerCase()}
                    onClick={() => setActiveFilter(cluster.toLowerCase())}
                  />
                ))}
              </div>
            </div>
          )}
          {dbPapers && dbPapers.length > 0 && (
            <div className="flex items-center gap-3 border-t border-border/60 pt-2.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground shrink-0 w-20">
                Time window
              </span>
              <div className="flex-1">
                <TemporalSlider activeMonths={timeWindowMonths} onChange={setTimeWindowMonths} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Side-by-side: Research Landscape + Topic Evolution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Research Landscape — 2D cluster scatter */}
        <Card>
          <CardHeader>
            <CardTitle>Research Landscape</CardTitle>
            <CardDescription>
              Each dot is a paper, positioned by semantic cluster. Hover to preview.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResearchLandscape papers={timeFilteredDbPapers.length > 0 ? timeFilteredDbPapers : (dbPapers && dbPapers.length > 0 ? dbPapers : papers)} activeFilter={activeFilter} />
          </CardContent>
        </Card>

        {/* Topic Evolution chart */}
        <Card>
          <CardHeader>
            <CardTitle>Topic Evolution Over Time</CardTitle>
            <CardDescription>Tracked data showing research intensity across key topics</CardDescription>
          </CardHeader>
          <CardContent>
            <TopicEvolutionChart data={topicEvolution} />
          </CardContent>
        </Card>
      </div>

      {/* Two-column: Benchmark Highlights + Key Results */}
      {(visibleBenchmarkTables.length > 0 || filteredPapers.length > 0) && (
        <div className="flex gap-4">
          {/* Left: Benchmark Highlights */}
          <div className="w-1/2 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Benchmark Highlights from Papers</h3>
            {visibleBenchmarkTables.length > 0 ? (
              <div className="space-y-4">
                {visibleBenchmarkTables.slice(0, 2).map((table, i) => (
                  <BenchmarkTable key={i} table={table} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No benchmark data available.</p>
            )}
          </div>

          {/* Right: Key Results */}
          <div className="w-1/2 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Key Results Worth Knowing</h3>
            {filteredPapers.length > 0 ? (
              <div className="space-y-3">
                {filteredPapers.slice(0, 5).map((p, i) => (
                  <ResultCard
                    key={i}
                    paper={p}
                    accent={FINDING_COLORS[i % FINDING_COLORS.length]}
                    hero={i === 0}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {activeFilter !== 'all' ? 'No papers match the selected filter.' : 'No key results available.'}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Method adoption */}
      {methodShifts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Method Shifts</CardTitle>
            <CardDescription>How methodologies are evolving</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {methodShifts.map((m, i) => {
                const method: string = m.method ?? '';
                const replacedBy: string = m.replacedBy ?? m.status ?? '';
                const status: string = m.status ?? '';
                return (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-xs"
                  >
                    <span className="text-muted-foreground">{method}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-medium">{replacedBy}</span>
                    <Badge variant="outline" className="ml-1 text-[10px]">
                      {status}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* New Benchmarks Grid */}
      {newBenchmarks.length > 0 && (
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">New Benchmarks Introduced in This Collection</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              These papers introduce new evaluation frameworks and datasets for the research community.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {newBenchmarks.map((b, i) => {
              const name: string = b.name ?? 'Untitled Benchmark';
              const measures: string = b.measures ?? '';
              return (
                <div
                  key={i}
                  className="rounded-lg border border-border bg-card p-3 space-y-1.5"
                >
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-bold text-foreground">{name}</span>
                    <span className="text-muted-foreground text-xs" aria-hidden="true">↗</span>
                  </div>
                  {measures && (
                    <p className="text-xs text-muted-foreground leading-relaxed">{measures}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {papers.length === 0 && topicEvolution.length === 0 && (
        <EmptyState message="Run an analysis to populate the overview." />
      )}

      {/* Paper drawer */}
      <PaperDrawer
        papers={timeFilteredDbPapers.length > 0 ? timeFilteredDbPapers : (dbPapers && dbPapers.length > 0 ? dbPapers : papers)}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}

function ResultCard({
  paper: p,
  accent,
  hero,
}: {
  paper: any;
  accent: string;
  hero: boolean;
}) {
  const title: string = p.mainResult ?? p.takeaway ?? '—';
  const paperTitle: string = p.title ?? p.paperId ?? '';
  const authorName: string = p.authors ?? p.author ?? '';
  const date: string = p.date ?? p.year ?? p.publishedAt ?? '';
  const paperId: string = p.paperId ?? p.id ?? '';

  const tag1: string | undefined =
    typeof p.methodology === 'string' && p.methodology.trim()
      ? p.methodology.trim().split(/\s+/)[0]
      : typeof p.category === 'string' && p.category.trim()
      ? p.category.trim()
      : undefined;
  const tag2: string | undefined =
    typeof p.topic === 'string' && p.topic.trim() ? p.topic.trim() : undefined;

  const citationInner = (
    <>
      <span>↗</span>
      <span className="italic">{paperTitle}</span>
      {(authorName || date) && (
        <span className="text-muted-foreground">
          {'— '}
          {authorName ? authorName : ''}
          {authorName && date ? ', ' : ''}
          {date ? date : ''}
        </span>
      )}
    </>
  );

  const citationEl = paperTitle
    ? paperId
      ? (
        <a
          href={`https://www.semanticscholar.org/paper/${paperId}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`text-xs text-primary/70 hover:text-primary transition-colors flex items-center gap-1 ${hero ? 'mt-2' : 'mt-1.5 pl-4'}`}
        >
          {citationInner}
        </a>
      )
      : (
        <p className={`text-xs text-muted-foreground/80 flex items-center gap-1 ${hero ? 'mt-2' : 'mt-1.5 pl-4'}`}>
          {citationInner}
        </p>
      )
    : null;

  if (hero) {
    return (
      <div className="relative rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4 space-y-2 overflow-hidden">
        <div className="absolute top-0 left-0 h-full w-0.5 bg-primary" aria-hidden="true" />
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold uppercase tracking-wider text-primary">
            Top finding
          </span>
          {tag1 && (
            <span className="text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded font-medium">
              {tag1}
            </span>
          )}
          {tag2 && (
            <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded font-medium">
              {tag2}
            </span>
          )}
        </div>
        <p className="text-base font-semibold leading-snug text-foreground">{title}</p>
        {p.approach && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{p.approach}</p>
        )}
        {citationEl}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-1.5">
      {(tag1 || tag2) && (
        <div className="flex gap-1 mb-1">
          {tag1 && (
            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
              {tag1}
            </span>
          )}
          {tag2 && (
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded">
              {tag2}
            </span>
          )}
        </div>
      )}
      <div className="flex items-start gap-2">
        <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${accent}`} aria-hidden="true" />
        <p className="text-sm font-semibold leading-snug">{title}</p>
      </div>
      {p.approach && (
        <p className="text-xs text-muted-foreground leading-relaxed pl-4 line-clamp-2">{p.approach}</p>
      )}
      {citationEl}
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-full px-3 py-1 text-xs font-medium transition-colors',
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted/50 text-muted-foreground hover:bg-muted',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

function GradientStatCard({ label, value, clickable }: { label: string; value: number; clickable?: boolean }) {
  return (
    <div className={`rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 p-4 ${clickable ? 'cursor-pointer hover:from-primary/30 hover:to-primary/10 transition-colors' : ''}`}>
      <div className="flex items-center gap-1.5">
        <p className="text-3xl font-bold tabular-nums text-foreground">{value}</p>
        {clickable && <span className="text-xs text-primary/60 mt-1">↗</span>}
      </div>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
      {message}
    </div>
  );
}
