'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import dynamic from 'next/dynamic';
import { BenchmarkTable } from '@/components/charts/benchmark-table';

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

export function OverviewTab({ artifacts }: OverviewTabProps) {
  const [activeFilter, setActiveFilter] = useState<string>('all');

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

  // Derive unique filter labels from the paper clusters
  const uniqueClusters: string[] = Array.from(
    new Set(papers.map((p) => derivePaperCluster(p)))
  ).filter((c) => c !== 'Other');

  // Papers visible to the filtered views
  const filteredPapers =
    activeFilter === 'all'
      ? papers
      : papers.filter((p) => derivePaperCluster(p).toLowerCase() === activeFilter.toLowerCase());

  // Filtered benchmark tables (pass-through — filtering is paper-level only)
  const visibleBenchmarkTables = benchmarkTables;

  return (
    <div className="space-y-6">
      {/* Gradient stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <GradientStatCard label="Papers" value={papers.length} />
        <GradientStatCard label="Topics Tracked" value={topicEvolution.length} />
        <GradientStatCard label="Insights" value={insightCount} />
        <GradientStatCard label="Emerging Topics" value={emergingTopics.length} />
      </div>

      {/* Collection description banner */}
      {(papers.length > 0 || topicEvolution.length > 0) && (
        <p className="text-sm text-muted-foreground">
          {papers.length} paper{papers.length !== 1 ? 's' : ''} spanning{' '}
          {topicEvolution.length} distinct research topic{topicEvolution.length !== 1 ? 's' : ''}.
          The topics are grouped in the chart below based on research clusters discovered
          in the current batch analysis.
        </p>
      )}

      {/* Sub-tab filter chips */}
      {uniqueClusters.length > 0 && (
        <div className="flex flex-wrap gap-2">
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
      )}

      {/* Research Landscape scatter plot */}
      {papers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Research Landscape</CardTitle>
            <CardDescription>Papers plotted by semantic similarity — colored by cluster</CardDescription>
          </CardHeader>
          <CardContent>
            <ResearchLandscape papers={papers} activeFilter={activeFilter} />
          </CardContent>
        </Card>
      )}

      {/* Topic Evolution chart */}
      <Card>
        <CardHeader>
          <CardTitle>Topic Evolution</CardTitle>
          <CardDescription>Monthly paper volume per topic</CardDescription>
        </CardHeader>
        <CardContent>
          <TopicEvolutionChart data={topicEvolution} />
        </CardContent>
      </Card>

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
                {filteredPapers.slice(0, 5).map((p, i) => {
                  const dotColor = FINDING_COLORS[i % FINDING_COLORS.length];
                  const title: string = p.mainResult ?? p.takeaway ?? '—';
                  const paperId: string = p.paperId ?? '';
                  return (
                    <div key={i} className="rounded-lg border border-border bg-card p-3 space-y-1.5">
                      <div className="flex items-start gap-2">
                        <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${dotColor}`} aria-hidden="true" />
                        <p className="text-sm font-semibold leading-snug">{title}</p>
                      </div>
                      {p.approach && (
                        <p className="text-xs text-muted-foreground leading-relaxed pl-4">{p.approach}</p>
                      )}
                      {paperId && (
                        <p className="text-[11px] text-muted-foreground/70 pl-4 font-mono">
                          {paperId}
                        </p>
                      )}
                    </div>
                  );
                })}
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

function GradientStatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 p-4">
      <p className="text-3xl font-bold tabular-nums text-foreground">{value}</p>
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
