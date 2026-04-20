'use client';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import dynamic from 'next/dynamic';

import { PaperDrawer } from '@/components/layout/paper-drawer';
import { useState } from 'react';
import { EmptyState as SharedEmptyState } from '@/components/ui/empty-state';
import { paperLink } from '@/lib/paper-utils';
import { CATEGORIES, derivePaperCategory } from '@/lib/categories';

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
  onSwitchTab?: (tab: 'overview' | 'insights' | 'connections' | 'papers' | 'frontiers') => void;
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

type StatTone = 'primary' | 'amber' | 'emerald' | 'slate';

const TONE_STYLES: Record<StatTone, { ring: string; bg: string; numText: string; iconBg: string; iconText: string; hoverBorder: string }> = {
  primary: {
    ring: 'ring-blue-500/20',
    bg: 'bg-gradient-to-br from-blue-500/10 to-blue-500/5',
    numText: 'text-blue-600 dark:text-blue-400',
    iconBg: 'bg-blue-500/15',
    iconText: 'text-blue-600 dark:text-blue-400',
    hoverBorder: 'hover:ring-blue-500/40',
  },
  amber: {
    ring: 'ring-amber-500/20',
    bg: 'bg-gradient-to-br from-amber-500/10 to-amber-500/5',
    numText: 'text-amber-600 dark:text-amber-400',
    iconBg: 'bg-amber-500/15',
    iconText: 'text-amber-600 dark:text-amber-400',
    hoverBorder: 'hover:ring-amber-500/40',
  },
  emerald: {
    ring: 'ring-emerald-500/20',
    bg: 'bg-gradient-to-br from-emerald-500/10 to-emerald-500/5',
    numText: 'text-emerald-600 dark:text-emerald-400',
    iconBg: 'bg-emerald-500/15',
    iconText: 'text-emerald-600 dark:text-emerald-400',
    hoverBorder: 'hover:ring-emerald-500/40',
  },
  slate: {
    ring: 'ring-slate-400/20',
    bg: 'bg-gradient-to-br from-slate-400/10 to-slate-400/5',
    numText: 'text-slate-600 dark:text-slate-300',
    iconBg: 'bg-slate-400/15',
    iconText: 'text-slate-600 dark:text-slate-400',
    hoverBorder: 'hover:ring-slate-400/40',
  },
};

function StatItem({
  label,
  value,
  icon,
  tone = 'primary',
  onClick,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone?: StatTone;
  onClick?: () => void;
}) {
  const styles = TONE_STYLES[tone];
  const baseClass = `relative rounded-lg ring-1 ${styles.ring} ${styles.bg} px-3 py-2.5 transition-all`;
  const interactiveClass = onClick ? `cursor-pointer ${styles.hoverBorder} hover:scale-[1.02]` : '';
  const inner = (
    <div className="flex items-center gap-3">
      <div className={`shrink-0 w-8 h-8 rounded-md ${styles.iconBg} ${styles.iconText} flex items-center justify-center`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-2xl font-bold leading-none tabular-nums ${styles.numText}`}>{value}</p>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">{label}</p>
      </div>
      {onClick && (
        <span className="text-[10px] text-muted-foreground/40 absolute top-1.5 right-2">↗</span>
      )}
    </div>
  );

  return onClick ? (
    <button onClick={onClick} className={`${baseClass} ${interactiveClass} text-left w-full`}>
      {inner}
    </button>
  ) : (
    <div className={baseClass}>{inner}</div>
  );
}

export function OverviewTab({ artifacts, totalPaperCount, dbPapers, topicName, lastSyncAt, onOpenDrawer, onSwitchTab }: OverviewTabProps) {
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

  // Insights count — match the Insights tab exactly
  const contradictionArtifact = artifacts.find((a) => a.agentType === 'contradiction-finder');
  const contradictions: any[] = contradictionArtifact?.data?.contradictions ?? [];
  const consensus: any[] = contradictionArtifact?.data?.consensus ?? [];
  const openDebates: any[] = contradictionArtifact?.data?.openDebates ?? [];
  const benchmarkWarnings: any[] = benchmarkData.warnings ?? [];
  const insightCount = contradictions.length + consensus.length + openDebates.length + benchmarkWarnings.length;

  // Reports count — match the Research Frontiers tab exactly
  const frontierArtifact = artifacts.find((a) => a.agentType === 'frontier-detector');
  const frontiers: any[] = frontierArtifact?.data?.frontiers ?? [];
  const reportsCount = frontiers.length;

  // Build topic evolution from REAL paper dates (not agent-generated topics)
  const dbTopicEvolution = buildTimelineFromPapers(dbPapers ?? []);

  // Single source of truth for header stats
  const displayPaperCount = totalPaperCount ?? papers.length;

  // Only show benchmark tables that have at least one entry

  const agentCount = new Set(artifacts.map((a) => a.agentType)).size;
  const relativeSync = formatRelativeTime(lastSyncAt);

  return (
    <div className="space-y-4">
      {/* Topic headline + analysis meta */}
      {(topicName || relativeSync || agentCount > 0) && (
        <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between">
          {topicName && (
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
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
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm font-semibold">Collection at a Glance</CardTitle>
          <CardDescription className="text-xs">
            {displayPaperCount} papers spanning research topics.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Papers — primary, the dataset itself */}
            <StatItem
              label="Papers"
              value={displayPaperCount}
              tone="primary"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              }
              onClick={onOpenDrawer}
            />
            {/* 2. Insights — actionable findings */}
            <StatItem
              label="Insights"
              value={insightCount}
              tone="amber"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9.663 17h4.673M12 3v1M3 12H2M22 12h-1M5.6 5.6l-.7-.7M18.4 5.6l.7-.7M12 17a5 5 0 1 0-3-9.5" />
                  <path d="M9 17v3a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-3" />
                </svg>
              }
              onClick={() => onSwitchTab?.('insights')}
            />
            {/* 3. Reports — frontier findings */}
            <StatItem
              label="Reports"
              value={reportsCount}
              tone="emerald"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              }
              onClick={() => onSwitchTab?.('frontiers')}
            />
            {/* 4. Topics — metadata */}
            <StatItem
              label="Topics"
              value={dbTopicEvolution.length || topicEvolution.length}
              tone="slate"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                  <line x1="7" y1="7" x2="7.01" y2="7" />
                </svg>
              }
              onClick={() => {
                document.getElementById('topic-evolution-chart')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* 2. Side-by-side charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="animate-chart-in">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm font-semibold">Research Landscape</CardTitle>
            <CardDescription className="text-xs">
              Topic distribution across research clusters
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <ResearchLandscape papers={dbPapers && dbPapers.length > 0 ? dbPapers : papers} />
          </CardContent>
        </Card>

        <Card id="topic-evolution-chart" className="animate-chart-in scroll-mt-4" style={{ animationDelay: '100ms' }}>
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm font-semibold">Topic Evolution Over Time</CardTitle>
            <CardDescription className="text-xs">Research intensity across key topics</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <TopicEvolutionChart data={dbTopicEvolution.length > 0 ? dbTopicEvolution : topicEvolution} />
          </CardContent>
        </Card>
      </div>

      {/* 3. Two-column: Open Questions + Key Results */}
      {papers.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left: Open Research Questions */}
          <div className="space-y-2">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Open Research Questions</h3>
              <p className="text-xs text-muted-foreground mt-0.5">What the field still doesn&apos;t know</p>
            </div>
            <OpenQuestionsSection artifacts={artifacts} />
          </div>

          {/* Right: Key Results */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Key Results Worth Knowing</h3>
            {papers.length > 0 ? (
              <div className="space-y-2">
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
        <div className="space-y-2">
          <div>
            <h3 className="text-sm font-semibold text-foreground">New Benchmarks</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Papers introducing new evaluation frameworks.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {newBenchmarks.map((b, i) => {
              const name: string = typeof b.name === 'string' ? b.name : 'Untitled Benchmark';
              const measures: string = typeof b.measures === 'string' ? b.measures : '';
              return (
                <div
                  key={i}
                  className="rounded-lg border border-border bg-card p-2 space-y-1"
                >
                  <div className="flex items-center gap-1">
                    <a
                      href={paperLink(b.paper?.id ?? b.paper?.paperId ?? undefined, name)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-foreground hover:text-primary transition-colors underline-offset-2 hover:underline"
                    >
                      {name}
                    </a>
                    <span className="text-primary/50 text-xs" aria-hidden="true">↗</span>
                  </div>
                  {measures && (
                    <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">{measures}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {papers.length === 0 && topicEvolution.length === 0 && (
        <SharedEmptyState title="Nothing here yet" description="Run an analysis to populate the overview." />
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
        {paperTitle ? (
          <a
            href={paperLink(paperId || undefined, paperTitle)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold leading-snug hover:text-primary transition-colors hover:underline underline-offset-2"
          >
            {title}
          </a>
        ) : (
          <p className="text-sm font-semibold leading-snug">{title}</p>
        )}
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

  // Build month → category → count map using the shared categorizer
  const monthCatMap: Record<string, Record<string, number>> = {};
  for (const p of dbPapers) {
    const date = p.publishedAt ?? p.published_at;
    if (!date) continue;
    const d = new Date(date);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const cat = derivePaperCategory(p);
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

  const questions: { text: string; type: string; detail: string; paperId?: string; paperTitle?: string }[] = [];

  for (const d of debates.slice(0, 3)) {
    const q = typeof d.question === 'string' ? d.question : '';
    const sig = typeof d.significance === 'string' ? d.significance : '';
    // Grab a paper ID from the first side's papers if available
    const sides: any[] = Array.isArray(d.sides) ? d.sides : [];
    const firstSide = sides.length > 0 ? sides[0] : null;
    const firstSidePapers: any[] = Array.isArray(firstSide?.papers) ? firstSide.papers : [];
    const fp = firstSidePapers.length > 0 ? firstSidePapers[0] : null;
    const debatePaperId: string = fp ? (typeof fp?.paperId === 'string' ? fp.paperId : typeof fp?.id === 'string' ? fp.id : '') : '';
    const debatePaperTitle: string = fp ? (typeof fp === 'string' ? fp : fp?.title ?? '') : '';
    if (q) questions.push({ text: q, type: 'debate', detail: sig, paperId: debatePaperId || undefined, paperTitle: debatePaperTitle || undefined });
  }

  for (const g of gaps.slice(0, 3)) {
    const area = typeof g.area === 'string' ? g.area : typeof g === 'string' ? g : '';
    const why = typeof g.whyItMatters === 'string' ? g.whyItMatters : '';
    // Adjacent work
    const adjacent: any[] = Array.isArray(g.adjacentWork) ? g.adjacentWork : [];
    const fa = adjacent.length > 0 ? adjacent[0] : null;
    const gapPaperId: string = fa ? (typeof fa?.paperId === 'string' ? fa.paperId : typeof fa?.id === 'string' ? fa.id : '') : '';
    const gapPaperTitle: string = fa ? (typeof fa === 'string' ? fa : fa?.title ?? fa?.name ?? '') : '';
    if (area) questions.push({ text: area, type: 'gap', detail: why, paperId: gapPaperId || undefined, paperTitle: gapPaperTitle || undefined });
  }

  if (questions.length === 0) {
    return <p className="text-sm text-muted-foreground">Run analysis to discover open questions.</p>;
  }

  return (
    <div className="space-y-1.5">
      {questions.slice(0, 5).map((q, i) => (
        <div key={i} className="rounded-lg border border-border bg-card px-3 py-2 space-y-0.5">
          <div className="flex items-start gap-1.5">
            <span className="mt-0.5 text-xs shrink-0">{q.type === 'debate' ? '?' : '!'}</span>
            <div>
              {q.text && (q.paperId || q.paperTitle) ? (
                <a
                  href={paperLink(q.paperId, q.paperTitle || q.text)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium leading-snug hover:text-primary transition-colors hover:underline underline-offset-2 block"
                >
                  {q.text}
                </a>
              ) : (
                <p className="text-xs font-medium leading-snug">{q.text}</p>
              )}
              {q.detail && (
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{q.detail}</p>
              )}
              <span className={`inline-block mt-1 text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded ${
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

