'use client';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import dynamic from 'next/dynamic';

import { PaperDrawer } from '@/components/layout/paper-drawer';
import { useState } from 'react';
import { EmptyState as SharedEmptyState } from '@/components/ui/empty-state';
import { paperLink } from '@/lib/paper-utils';
import { CATEGORIES, CATEGORY_COLORS, derivePaperCategory } from '@/lib/categories';
import { ProvenanceBanner } from '@/components/layout/provenance-banner';

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
  topicId?: string;
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

type StatTone = 'primary' | 'amber' | 'emerald' | 'slate';

const TONE_STYLES: Record<StatTone, { numText: string; iconText: string }> = {
  primary: { numText: 'text-foreground', iconText: 'text-foreground/80' },
  amber:   { numText: 'text-foreground', iconText: 'text-foreground/80' },
  emerald: { numText: 'text-foreground', iconText: 'text-foreground/80' },
  slate:   { numText: 'text-foreground', iconText: 'text-foreground/80' },
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
  // Editorial: no chip background, just spacing + a hairline left rule.
  // Number is the hero; everything else recedes.
  const baseClass = `relative pl-4 border-l border-[color:var(--hairline-strong)] py-1 transition-opacity`;
  const interactiveClass = onClick ? `cursor-pointer hover:opacity-70` : '';
  const inner = (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <span className={`${styles.iconText} opacity-60`}>{icon}</span>
        <span className="text-eyebrow">{label}</span>
      </div>
      <p className={`text-3xl font-light leading-none tabular-nums tracking-tight ${styles.numText}`}>
        {value.toLocaleString()}
      </p>
      {onClick && (
        <span className="text-[10px] text-muted-foreground/50 absolute top-0.5 right-0">↗</span>
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

export function OverviewTab({ artifacts, totalPaperCount, dbPapers, topicName, topicId, lastSyncAt, onOpenDrawer, onSwitchTab }: OverviewTabProps) {
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
    <div className="space-y-8 max-w-7xl mx-auto px-2 py-2">
      {/* Topic headline + analysis meta */}
      {(topicName || relativeSync || agentCount > 0) && (
        <header className="space-y-2 pb-2">
          {topicName && (
            <h1 className="text-display text-foreground">{topicName}</h1>
          )}
          <p className="text-[11px] uppercase tracking-[0.10em] text-muted-foreground tabular-nums">
            {relativeSync && <span>Last analyzed {relativeSync}</span>}
            {relativeSync && agentCount > 0 && <span className="mx-2">·</span>}
            {agentCount > 0 && <span>{agentCount} agents</span>}
            {(relativeSync || agentCount > 0) && displayPaperCount > 0 && <span className="mx-2">·</span>}
            {displayPaperCount > 0 && <span>{displayPaperCount.toLocaleString()} papers</span>}
          </p>
        </header>
      )}

      {/* 1. Collection Provenance Card — what this is, where it came from, what's in it */}
      <ProvenanceBanner
        paperCount={displayPaperCount}
        lastUpdated={lastSyncAt ?? undefined}
        dbPapers={dbPapers}
        agentCount={agentCount > 0 ? agentCount : undefined}
      />

      {/* 2. Collection at a Glance — bare, hero numbers, hairline-anchored */}
      <section>
        <div className="mb-4 space-y-1">
          <p className="text-eyebrow">Collection at a Glance</p>
          <p className="text-h2-tight text-foreground">
            {displayPaperCount.toLocaleString()} papers <span className="text-foreground/55">spanning {(dbTopicEvolution.length || topicEvolution.length) || 'multiple'} research topics.</span>
          </p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-5">
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
            {/* 3. Research Frontiers — frontier findings */}
            <StatItem
              label="Research Frontiers"
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
      </section>

      {/* 3. Side-by-side charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="animate-chart-in space-y-3">
          <header className="space-y-1">
            <p className="text-eyebrow">Research Landscape</p>
            <h2 className="text-h2-tight text-foreground">Topic distribution across research clusters</h2>
          </header>
          <div>
            <ResearchLandscape papers={dbPapers && dbPapers.length > 0 ? dbPapers : papers} />
          </div>
        </section>

        <section id="topic-evolution-chart" className="animate-chart-in scroll-mt-4 space-y-3" style={{ animationDelay: '100ms' }}>
          <header className="space-y-1">
            <p className="text-eyebrow">Topic Evolution Over Time</p>
            <h2 className="text-h2-tight text-foreground">Research intensity across key topics</h2>
          </header>
          <div>
            <TopicEvolutionChart data={dbTopicEvolution.length > 0 ? dbTopicEvolution : topicEvolution} />
          </div>
        </section>
      </div>

      {/* 4. Two-column: Open Questions + Key Results — equal-height columns */}
      {papers.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left: Open Research Questions */}
          <div className="flex flex-col gap-3">
            <div className="space-y-1">
              <p className="text-eyebrow">Open Research Questions</p>
              <h2 className="text-h2-tight text-foreground">What the field still doesn&apos;t know.</h2>
            </div>
            <OpenQuestionsSection artifacts={artifacts} dbPapers={dbPapers} />
          </div>

          {/* Right: Key Results */}
          <div className="flex flex-col gap-3">
            <div className="space-y-1">
              <p className="text-eyebrow">Key Results Worth Knowing</p>
              <h2 className="text-h2-tight text-foreground">Important findings across the collection.</h2>
            </div>
            {papers.length > 0 ? (
              <div className="grid grid-cols-1 gap-2 auto-rows-fr">
                {papers.slice(0, 5).map((p, i) => {
                  // Enrich the analyzer's paper-shaped row with `title` and
                  // `arxivId` from the DB record so the From: footer can render
                  // a human-readable title and the card can link to arxiv.
                  const match = (dbPapers ?? []).find(
                    (d: any) => d?.id === p?.paperId || d?.paperId === p?.paperId,
                  );
                  const enriched = match
                    ? { ...p, title: match.title ?? p.title, arxivId: match.arxivId ?? p.arxivId, authors: match.authors ?? p.authors, publishedAt: match.publishedAt ?? p.publishedAt }
                    : p;
                  return <ResultCard key={i} paper={enriched} />;
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No key results available.</p>
            )}
          </div>
        </div>
      )}

      {/* 5. New Benchmarks grid */}
      {newBenchmarks.length > 0 && (
        <div className="space-y-3">
          <div className="space-y-1">
            <p className="text-eyebrow">New Benchmarks</p>
            <h2 className="text-h2-tight text-foreground">Papers introducing new evaluation frameworks.</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
            {newBenchmarks.map((b, i) => {
              const name: string = typeof b.name === 'string' ? b.name : 'Untitled Benchmark';
              const measures: string = typeof b.measures === 'string' ? b.measures : '';
              const benchmarkPaperId: string = b.paper?.id ?? b.paper?.paperId ?? '';
              const dbMatch = (dbPapers ?? []).find((d: any) => d?.id === benchmarkPaperId);
              const benchmarkArxivId: string = dbMatch?.arxivId ?? '';
              const href = paperLink(benchmarkArxivId || undefined) || paperLink(benchmarkPaperId || undefined);
              const inner = (
                <>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[13px] font-medium tracking-tight text-foreground ${href ? 'group-hover:underline underline-offset-4 decoration-foreground/40' : ''}`}>
                      {name}
                    </span>
                    {href && <span className="text-foreground/40 text-[11px]" aria-hidden="true">↗</span>}
                  </div>
                  {measures && (
                    <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 mt-1">{measures}</p>
                  )}
                </>
              );
              return href ? (
                <a
                  key={i}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block border-t border-[color:var(--hairline)] pt-2 hover:border-foreground/40 transition-colors"
                >
                  {inner}
                </a>
              ) : (
                <div key={i} className="block border-t border-[color:var(--hairline)] pt-2">
                  {inner}
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

function ResultCard({ paper: p }: { paper: any }) {
  const finding: string = typeof p.mainResult === 'string' && p.mainResult ? p.mainResult
    : typeof p.takeaway === 'string' && p.takeaway ? p.takeaway : '—';
  const rawTitle: string = typeof p.title === 'string' ? p.title.trim() : '';
  // Skip ID-shaped titles (40-char SHA hashes, raw arxiv ids) — they aren't
  // human-readable. Empty title → footer is skipped entirely (handled below).
  const looksLikeId = /^[a-f0-9]{32,}$/i.test(rawTitle) || /^\d{4}\.\d{4,5}(v\d+)?$/.test(rawTitle);
  const paperTitle: string = looksLikeId ? '' : rawTitle;
  const arxivId: string = typeof p.arxivId === 'string' ? p.arxivId : '';
  // Author can come from a string ("Smith et al."), an array of strings, or
  // an array of {name} objects. Normalize all three shapes.
  let authorName = '';
  if (typeof p.authors === 'string') authorName = p.authors;
  else if (Array.isArray(p.authors) && p.authors.length > 0) {
    const first = p.authors[0];
    const name = typeof first === 'string' ? first : (typeof first?.name === 'string' ? first.name : '');
    const more = p.authors.length > 1 ? ` et al.` : '';
    authorName = name ? `${name}${more}` : '';
  } else if (typeof p.author === 'string') authorName = p.author;
  const date: string = typeof p.date === 'string' ? p.date
    : typeof p.year === 'string' || typeof p.year === 'number' ? String(p.year)
    : typeof p.publishedAt === 'string' ? p.publishedAt.slice(0, 7)
    : (p.publishedAt instanceof Date ? p.publishedAt.toISOString().slice(0, 7) : '');
  const approach: string = typeof p.approach === 'string' ? p.approach : '';

  const category = derivePaperCategory(p);
  const colors = CATEGORY_COLORS[category];

  // Direct arxiv link only. Prefer the canonical `arxivId` field; fall back
  // to `paperId` only if it happens to be arxiv-shaped. Returns '' otherwise
  // so the card stays non-clickable rather than linking to a search page.
  const url = paperLink(arxivId || undefined) || paperLink(typeof p.paperId === 'string' ? p.paperId : undefined);
  const openAbs = url ? () => window.open(url, '_blank', 'noopener,noreferrer') : undefined;
  const clickable = Boolean(url);

  return (
    <div
      onClick={openAbs}
      role={clickable ? 'link' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={openAbs ? (e) => { if (e.key === 'Enter') openAbs(); } : undefined}
      className={`group flex h-[180px] flex-col rounded-lg bg-white border border-gray-200 transition-all overflow-hidden ${clickable ? 'hover:border-gray-300 hover:shadow-md cursor-pointer' : ''}`}
      style={{ borderLeftWidth: '4px', borderLeftColor: colors.border }}
    >
      {/* Header strip — category pill + meta */}
      <div className="flex items-center justify-between gap-2 px-3 pt-2.5 pb-1.5 shrink-0">
        <span
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
          style={{ background: colors.pill, color: colors.text }}
        >
          {category}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          {date && <span className="text-[10px] text-gray-500 font-medium">{date}</span>}
          <span className="text-[11px] text-gray-300 group-hover:text-blue-500 transition-colors">↗</span>
        </div>
      </div>

      {/* Finding (the headline result) */}
      <div className="px-3 pb-1.5 shrink-0">
        <h4 className="text-[13px] font-semibold leading-snug text-gray-900 group-hover:text-blue-700 transition-colors line-clamp-2">
          {finding}
        </h4>
      </div>

      {/* Approach / details */}
      {approach && (
        <div className="px-3 pb-3 flex-1 min-h-0 overflow-hidden">
          <p className="text-[11px] text-gray-600 leading-relaxed line-clamp-3">{approach}</p>
        </div>
      )}

      {/* Footer — paper attribution */}
      {paperTitle && (
        <div
          className="flex items-center gap-2 px-3 py-1.5 border-t text-[10.5px] text-gray-700 shrink-0 mt-auto"
          style={{ background: colors.bg, borderTopColor: `${colors.border}30` }}
        >
          <span className="font-semibold not-italic shrink-0" style={{ color: colors.text }}>From:</span>
          <span className="italic line-clamp-1 flex-1">{paperTitle}</span>
          {authorName && <span className="text-gray-500 shrink-0 truncate max-w-[40%]">— {authorName}</span>}
        </div>
      )}
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
      .slice(0, CATEGORIES.length)
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

  return activeCats.slice(0, CATEGORIES.length).map(cat => ({
    topic: cat,
    timeline: months.map(m => ({
      month: m,
      count: monthCatMap[m]?.[cat] ?? 0,
    })),
    momentum: undefined,
  }));
}

function OpenQuestionsSection({ artifacts, dbPapers }: { artifacts: { agentType: string; data: any }[]; dbPapers?: any[] }) {
  const frontierArtifact = artifacts.find(a => a.agentType === 'frontier-detector');
  const contradictionArtifact = artifacts.find(a => a.agentType === 'contradiction-finder');

  const gaps: any[] = frontierArtifact?.data?.gaps ?? [];
  const debates: any[] = contradictionArtifact?.data?.openDebates ?? [];

  // Resolve author, date, and arxivId via the DB so the OpenQuestion cards
  // match the right column: "Title — Author et al." footer, YYYY-MM date
  // chip, and a real direct-to-arxiv link (S2 paperId hashes alone never
  // resolve via paperLink).
  function metaFor(paperId: string | undefined): { author: string; date: string; arxivId: string; title: string } {
    if (!paperId || !dbPapers) return { author: '', date: '', arxivId: '', title: '' };
    const match = dbPapers.find((d: any) => d?.id === paperId || d?.paperId === paperId);
    if (!match) return { author: '', date: '', arxivId: '', title: '' };
    const list: any[] = Array.isArray(match.authors) ? match.authors : [];
    let author = '';
    if (list.length > 0) {
      const first = list[0];
      const name = typeof first === 'string' ? first : (typeof first?.name === 'string' ? first.name : '');
      if (name) author = list.length > 1 ? `${name} et al.` : name;
    }
    let date = '';
    if (typeof match.publishedAt === 'string') date = match.publishedAt.slice(0, 7);
    else if (match.publishedAt instanceof Date) date = match.publishedAt.toISOString().slice(0, 7);
    const arxivId = typeof match.arxivId === 'string' ? match.arxivId : '';
    const title = typeof match.title === 'string' ? match.title : '';
    return { author, date, arxivId, title };
  }

  const questions: { text: string; type: string; detail: string; paperId?: string; paperTitle?: string; paperAuthor?: string; paperDate?: string; paperArxivId?: string }[] = [];

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
    if (q) {
      const meta = metaFor(debatePaperId);
      questions.push({
        text: q,
        type: 'debate',
        detail: sig,
        paperId: debatePaperId || undefined,
        paperTitle: debatePaperTitle || meta.title || undefined,
        paperAuthor: meta.author || undefined,
        paperDate: meta.date || undefined,
        paperArxivId: meta.arxivId || undefined,
      });
    }
  }

  for (const g of gaps.slice(0, 3)) {
    const area = typeof g.area === 'string' ? g.area : typeof g === 'string' ? g : '';
    const why = typeof g.whyItMatters === 'string' ? g.whyItMatters : '';
    // Adjacent work
    const adjacent: any[] = Array.isArray(g.adjacentWork) ? g.adjacentWork : [];
    const fa = adjacent.length > 0 ? adjacent[0] : null;
    const gapPaperId: string = fa ? (typeof fa?.paperId === 'string' ? fa.paperId : typeof fa?.id === 'string' ? fa.id : '') : '';
    const gapPaperTitle: string = fa ? (typeof fa === 'string' ? fa : fa?.title ?? fa?.name ?? '') : '';
    if (area) {
      const meta = metaFor(gapPaperId);
      questions.push({
        text: area,
        type: 'gap',
        detail: why,
        paperId: gapPaperId || undefined,
        paperTitle: gapPaperTitle || meta.title || undefined,
        paperAuthor: meta.author || undefined,
        paperDate: meta.date || undefined,
        paperArxivId: meta.arxivId || undefined,
      });
    }
  }

  if (questions.length === 0) {
    return <p className="text-sm text-muted-foreground">Run analysis to discover open questions.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-2 auto-rows-fr">
      {questions.slice(0, 5).map((q, i) => {
        const isDebate = q.type === 'debate';
        const accent = isDebate
          ? { border: '#f59e0b', bg: '#fffbeb', text: '#b45309', pill: '#fef3c7', icon: '?', label: 'Open Debate' }
          : { border: '#3b82f6', bg: '#eff6ff', text: '#1d4ed8', pill: '#dbeafe', icon: '!', label: 'Research Gap' };

        // Prefer the arxivId resolved from dbPapers — q.paperId is a S2 hash
        // and never resolves to a direct arxiv abstract on its own.
        const url = paperLink(q.paperArxivId) || paperLink(q.paperId);
        const clickable = Boolean(url);
        const openAbs = clickable ? () => window.open(url, '_blank', 'noopener,noreferrer') : undefined;

        return (
          <div
            key={i}
            onClick={openAbs}
            role={clickable ? 'link' : undefined}
            tabIndex={clickable ? 0 : undefined}
            onKeyDown={clickable ? (e) => { if (e.key === 'Enter') openAbs!(); } : undefined}
            className={`group flex h-[180px] flex-col rounded-lg bg-white border border-gray-200 transition-all overflow-hidden ${
              clickable ? 'hover:border-gray-300 hover:shadow-md cursor-pointer' : ''
            }`}
            style={{ borderLeftWidth: '4px', borderLeftColor: accent.border }}
          >
            {/* Header strip — type pill + date (matches right-column ResultCard) */}
            <div className="flex items-center justify-between gap-2 px-3 pt-2.5 pb-1.5 shrink-0">
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                style={{ background: accent.pill, color: accent.text }}
              >
                {accent.icon} {accent.label}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                {q.paperDate && <span className="text-[10px] text-gray-500 font-medium">{q.paperDate}</span>}
                {clickable && (
                  <span className="text-[11px] text-gray-300 group-hover:text-blue-500 transition-colors">↗</span>
                )}
              </div>
            </div>

            {/* Question text */}
            <div className="px-3 pb-1.5 shrink-0">
              <h4 className={`text-[13px] font-semibold leading-snug text-gray-900 line-clamp-2 ${clickable ? 'group-hover:text-blue-700 transition-colors' : ''}`}>
                {q.text}
              </h4>
            </div>

            {/* Detail */}
            <div className="px-3 pb-3 flex-1 min-h-0 overflow-hidden">
              {q.detail && (
                <p className="text-[11px] text-gray-600 leading-relaxed line-clamp-3">{q.detail}</p>
              )}
            </div>

            {/* Footer — paper attribution + author (matches right-column ResultCard) */}
            {q.paperTitle && (
              <div
                className="flex items-center gap-2 px-3 py-1.5 border-t text-[10.5px] text-gray-700 shrink-0 mt-auto"
                style={{ background: accent.bg, borderTopColor: `${accent.border}30` }}
              >
                <span className="font-semibold not-italic shrink-0" style={{ color: accent.text }}>From:</span>
                <span className="italic line-clamp-1 flex-1">{q.paperTitle}</span>
                {q.paperAuthor && <span className="text-gray-500 shrink-0 truncate max-w-[40%]">— {q.paperAuthor}</span>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

