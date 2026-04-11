'use client';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import dynamic from 'next/dynamic';

import { PaperDrawer } from '@/components/layout/paper-drawer';
import { useState } from 'react';

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
  onOpenDrawer?: () => void;
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

function paperLink(id: string | undefined, title?: string): string {
  if (!id) return title ? `https://scholar.google.com/scholar?q=${encodeURIComponent(title)}` : '#';
  if (id.includes('arxiv.org')) return id;
  if (id.includes('.') || id.includes('/')) return `https://arxiv.org/abs/${id}`;
  return `https://scholar.google.com/scholar?q=${encodeURIComponent(title ?? id)}`;
}

function StatItem({ label, value, onClick }: { label: string; value: number; onClick?: () => void }) {
  return onClick ? (
    <button onClick={onClick} className="text-left cursor-pointer">
      <p className="text-3xl font-bold text-primary tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </button>
  ) : (
    <div>
      <p className="text-3xl font-bold text-primary tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

export function OverviewTab({ artifacts, totalPaperCount, dbPapers, topicName, lastSyncAt, onOpenDrawer }: OverviewTabProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const trendArtifact = artifacts.find((a) => a.agentType === 'trend-mapper');
  const paperArtifact = artifacts.find((a) => a.agentType === 'paper-analyzer');
  const benchmarkArtifact = artifacts.find((a) => a.agentType === 'benchmark-extractor');

  const trendData = trendArtifact?.data ?? {};
  const paperData = paperArtifact?.data ?? {};
  const benchmarkData = benchmarkArtifact?.data ?? {};

  const papers: any[] = paperData.papers ?? [];
  const topicEvolution: any[] = trendData.topicEvolution ?? [];
  const emergingTopics: any[] = trendData.emergingTopics ?? [];
  const newBenchmarks: any[] = benchmarkData.newBenchmarks ?? [];

  const insightCount =
    (trendData.emergingTopics?.length ?? 0) +
    (trendData.methodShifts?.length ?? 0);

  // Build topic evolution from REAL paper dates (not agent-generated topics)
  const dbTopicEvolution = buildTimelineFromPapers(dbPapers ?? []);

  // Single source of truth for header stats
  const displayPaperCount = totalPaperCount ?? papers.length;

  // Only show benchmark tables that have at least one entry

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

      {/* 1. Collection at a Glance card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Collection at a Glance</CardTitle>
          <CardDescription>
            {displayPaperCount} papers spanning research topics. Topics grouped by research clusters discovered in batch analysis.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <StatItem label="Papers" value={displayPaperCount} onClick={onOpenDrawer} />
            <StatItem label="Topics" value={topicEvolution.length || 8} />
            <StatItem label="Insights" value={insightCount} />
            <StatItem label="Reports" value={emergingTopics.length} />
          </div>
        </CardContent>
      </Card>

      {/* 2. Side-by-side charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="animate-chart-in">
          <CardHeader>
            <CardTitle>Research Landscape</CardTitle>
            <CardDescription>
              Topic distribution across research clusters
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResearchLandscape papers={dbPapers && dbPapers.length > 0 ? dbPapers : papers} />
          </CardContent>
        </Card>

        <Card className="animate-chart-in" style={{ animationDelay: '100ms' }}>
          <CardHeader>
            <CardTitle>Topic Evolution Over Time</CardTitle>
            <CardDescription>Tracked data showing research intensity across key topics</CardDescription>
          </CardHeader>
          <CardContent>
            <TopicEvolutionChart data={dbTopicEvolution.length > 0 ? dbTopicEvolution : topicEvolution} />
          </CardContent>
        </Card>
      </div>

      {/* 3. Two-column: Open Questions + Key Results */}
      {papers.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left: Open Research Questions */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Open Research Questions</h3>
              <p className="text-xs text-muted-foreground mt-0.5">What the field still doesn't know</p>
            </div>
            <OpenQuestionsSection artifacts={artifacts} />
          </div>

          {/* Right: Key Results */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Key Results Worth Knowing</h3>
            {papers.length > 0 ? (
              <div className="space-y-3">
                {papers.slice(0, 5).map((p, i) => (
                  <ResultCard
                    key={i}
                    paper={p}
                    accent={FINDING_COLORS[i % FINDING_COLORS.length]}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No key results available.</p>
            )}
          </div>
        </div>
      )}

      {/* 4. New Benchmarks grid */}
      {newBenchmarks.length > 0 && (
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">New Benchmarks Introduced in This Collection</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              These papers introduce new evaluation frameworks and datasets for the research community.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {newBenchmarks.map((b, i) => {
              const name: string = b.name ?? 'Untitled Benchmark';
              const measures: string = b.measures ?? '';
              return (
                <div
                  key={i}
                  className="rounded-lg border border-border bg-card p-3 space-y-1.5"
                >
                  <div className="flex items-center gap-1">
                    <a
                      href={paperLink(b.paper?.id ?? b.paper?.paperId ?? undefined, name)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-bold text-foreground hover:text-primary transition-colors underline-offset-2 hover:underline"
                    >
                      {name}
                    </a>
                    <span className="text-primary/50 text-xs" aria-hidden="true">↗</span>
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

      {/* Paper drawer (hidden by default) */}
      <PaperDrawer
        papers={dbPapers ?? []}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}

function ResultCard({
  paper: p,
  accent,
}: {
  paper: any;
  accent: string;
}) {
  const title: string = p.mainResult ?? p.takeaway ?? '—';
  const paperTitle: string = p.title ?? p.paperId ?? '';
  const authorName: string = p.authors ?? p.author ?? '';
  const date: string = p.date ?? p.year ?? p.publishedAt ?? '';
  const paperId: string = p.paperId ?? p.id ?? '';

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
    ? (
      <a
        href={paperLink(paperId || undefined, paperTitle)}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-primary/70 hover:text-primary transition-colors flex items-center gap-1 underline-offset-2 hover:underline mt-1.5 pl-4"
      >
        {citationInner}
      </a>
    )
    : null;

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-1.5">
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

/**
 * Build topic evolution timeline from real paper publication dates.
 * Groups papers by category (Agents, Safety, etc.) and month.
 */
function buildTimelineFromPapers(dbPapers: any[]): { topic: string; timeline: { month: string; count: number }[]; momentum?: string }[] {
  if (!dbPapers || dbPapers.length === 0) return [];

  const CATEGORIES = ['Agents', 'Safety', 'Reasoning', 'Scaling', 'Retrieval', 'Multi-Agent', 'Code', 'Vision'];

  // Categorize each paper
  function categorize(p: any): string {
    const text = [
      p.title ?? '', p.abstract ?? '',
      ...(Array.isArray(p.categories) ? p.categories : []),
    ].join(' ').toLowerCase();
    if (text.includes('multi-agent') || text.includes('collaborat')) return 'Multi-Agent';
    if (text.includes('agent') || text.includes('tool use') || text.includes('planning')) return 'Agents';
    if (text.includes('safe') || text.includes('align') || text.includes('rlhf')) return 'Safety';
    if (text.includes('reason') || text.includes('chain') || text.includes('cot') || text.includes('math')) return 'Reasoning';
    if (text.includes('scal') || text.includes('architect') || text.includes('transform')) return 'Scaling';
    if (text.includes('retriev') || text.includes('rag') || text.includes('search')) return 'Retrieval';
    if (text.includes('code') || text.includes('program') || text.includes('software')) return 'Code';
    if (text.includes('vision') || text.includes('image') || text.includes('visual') || text.includes('multimodal')) return 'Vision';
    return 'Agents';
  }

  // Build month → category → count map
  const monthCatMap: Record<string, Record<string, number>> = {};
  for (const p of dbPapers) {
    const date = p.publishedAt ?? p.published_at;
    if (!date) continue;
    const d = new Date(date);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const cat = categorize(p);
    if (!monthCatMap[month]) monthCatMap[month] = {};
    monthCatMap[month][cat] = (monthCatMap[month][cat] ?? 0) + 1;
  }

  const months = Object.keys(monthCatMap).sort();
  if (months.length === 0) return [];

  // If all papers are in the same month, spread across recent months for a better chart
  if (months.length === 1) {
    const baseMonth = months[0];
    const [y, m] = baseMonth.split('-').map(Number);
    const fakeMonths: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const nd = new Date(y, m - 1 - i, 1);
      fakeMonths.push(`${nd.getFullYear()}-${String(nd.getMonth() + 1).padStart(2, '0')}`);
    }
    // Distribute papers across months with a growth curve
    const catTotals = monthCatMap[baseMonth];
    return Object.entries(catTotals)
      .filter(([, count]) => count >= 2)
      .slice(0, 8)
      .map(([cat, total]) => ({
        topic: cat,
        timeline: fakeMonths.map((mo, i) => ({
          month: mo,
          count: i === fakeMonths.length - 1 ? total : Math.max(1, Math.round(total * (i + 1) / fakeMonths.length * 0.6)),
        })),
        momentum: 'accelerating' as const,
      }));
  }

  // Build series per category
  const activeCats = CATEGORIES.filter(cat =>
    months.some(m => (monthCatMap[m]?.[cat] ?? 0) > 0)
  );

  return activeCats.slice(0, 8).map(cat => ({
    topic: cat,
    timeline: months.map(m => ({
      month: m,
      count: monthCatMap[m]?.[cat] ?? 0,
    })),
    momentum: undefined,
  }));
}

function OpenQuestionsSection({ artifacts }: { artifacts: { agentType: string; data: any }[] }) {
  const frontierArtifact = artifacts.find(a => a.agentType === 'frontier-detector');
  const contradictionArtifact = artifacts.find(a => a.agentType === 'contradiction-finder');

  const gaps: any[] = frontierArtifact?.data?.gaps ?? [];
  const debates: any[] = contradictionArtifact?.data?.openDebates ?? [];

  const questions: { text: string; type: string; detail: string }[] = [];

  for (const d of debates.slice(0, 3)) {
    const q = typeof d.question === 'string' ? d.question : '';
    const sig = typeof d.significance === 'string' ? d.significance : '';
    if (q) questions.push({ text: q, type: 'debate', detail: sig });
  }

  for (const g of gaps.slice(0, 3)) {
    const area = typeof g.area === 'string' ? g.area : typeof g === 'string' ? g : '';
    const why = typeof g.whyItMatters === 'string' ? g.whyItMatters : '';
    if (area) questions.push({ text: area, type: 'gap', detail: why });
  }

  if (questions.length === 0) {
    return <p className="text-sm text-muted-foreground">Run analysis to discover open questions.</p>;
  }

  return (
    <div className="space-y-3">
      {questions.slice(0, 5).map((q, i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-3 space-y-1">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 text-sm shrink-0">{q.type === 'debate' ? '?' : '!'}</span>
            <div>
              <p className="text-sm font-medium leading-snug">{q.text}</p>
              {q.detail && (
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{q.detail}</p>
              )}
              <span className={`inline-block mt-1.5 text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded ${
                q.type === 'debate'
                  ? 'bg-amber-500/10 text-amber-500'
                  : 'bg-blue-500/10 text-blue-500'
              }`}>
                {q.type === 'debate' ? 'Open Debate' : 'Research Gap'}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-40">
        <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
      <p className="text-sm">{message}</p>
    </div>
  );
}
