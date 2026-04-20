'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { safeString, paperLink } from '@/lib/paper-utils';
import {
  frontierCategoryColors as categoryStyles,
  frontierCategoryEmoji as categoryEmoji,
  frontierCategoryLabel as categoryLabel,
} from '@/lib/design-tokens';
import { SurprisingFindings } from '@/components/layout/surprising-findings';

interface FrontiersTabProps {
  artifacts: { agentType: string; data: any }[];
}

function ConfidenceInline({ value }: { value: number }) {
  const pct = Math.min(Math.max(Math.round(value * 100), 0), 100);
  const color =
    pct >= 70 ? 'bg-emerald-500' :
    pct >= 40 ? 'bg-amber-500' :
    'bg-rose-500';
  return (
    <span className="flex items-center gap-1.5">
      <span className="text-[10px] text-muted-foreground">Confidence</span>
      <span className="w-16 h-1.5 rounded-full bg-muted overflow-hidden inline-block">
        <span className={`h-full rounded-full block ${color}`} style={{ width: `${pct}%` }} />
      </span>
      <span className="text-[10px] text-muted-foreground tabular-nums">{pct}%</span>
    </span>
  );
}

function FrontierCard({ f }: { f: any }) {
  const [expanded, setExpanded] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);

  const cat = typeof f.category === 'string' ? f.category : '';
  const emoji = categoryEmoji[cat] ?? '⚪';
  const label = categoryLabel[cat] ?? cat;
  const badgeStyle = categoryStyles[cat] ?? 'bg-muted text-muted-foreground border-border';
  const implications: string[] = Array.isArray(f.implications) ? f.implications.slice(0, 5) : [];
  const openQuestions: string[] = Array.isArray(f.openQuestions) ? f.openQuestions.slice(0, 5) : [];
  const sourcePapers: any[] = Array.isArray(f.sourcePapers) ? f.sourcePapers : [];
  const finding = safeString(f.finding);
  const explanation = typeof f.explanation === 'string' ? f.explanation : '';

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3 space-y-2">
        {/* Title row */}
        <div className="flex items-start gap-2 flex-wrap">
          <span className="text-sm leading-none mt-0.5">{emoji}</span>
          <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium ${badgeStyle}`}>
            {label}
          </span>
          {f.confidence != null && (
            <span className="ml-auto">
              <ConfidenceInline value={typeof f.confidence === 'number' ? f.confidence : 0} />
            </span>
          )}
        </div>

        {finding && (() => {
          const primaryPaper = sourcePapers.length > 0 ? sourcePapers[0] : null;
          const primaryId: string = primaryPaper
            ? (typeof primaryPaper?.paperId === 'string' ? primaryPaper.paperId : typeof primaryPaper?.id === 'string' ? primaryPaper.id : '')
            : '';
          const primaryTitle: string = primaryPaper
            ? (typeof primaryPaper === 'string' ? primaryPaper : primaryPaper?.title ?? '')
            : '';
          return primaryId || primaryTitle ? (
            <a
              href={paperLink(primaryId || undefined, primaryTitle || finding)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold leading-snug hover:text-primary transition-colors hover:underline underline-offset-2 block"
              onClick={(e) => e.stopPropagation()}
            >
              {finding}
            </a>
          ) : (
            <p className="text-sm font-semibold leading-snug">{finding}</p>
          );
        })()}

        {explanation && (
          <p className={`text-xs text-muted-foreground leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>
            {explanation}
          </p>
        )}
        {explanation && explanation.length > 120 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[10px] text-primary/70 hover:text-primary transition-colors"
          >
            {expanded ? 'Show less' : 'Show more'}
          </button>
        )}

        {/* Sources collapsed */}
        {sourcePapers.length > 0 && (
          <div>
            <button
              onClick={() => setSourcesOpen(!sourcesOpen)}
              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              {sourcesOpen ? '▾' : '▸'} {sourcePapers.length} source{sourcePapers.length !== 1 ? 's' : ''}
            </button>
            {sourcesOpen && (
              <div className="mt-1 space-y-0.5 pl-2">
                {sourcePapers.map((sp: any, j: number) => {
                  const title = typeof sp === 'string' ? sp : sp.title ?? sp.id ?? '';
                  const paperId: string = typeof sp?.paperId === 'string' ? sp.paperId : typeof sp?.id === 'string' ? sp.id : '';
                  const contribution = typeof sp?.contribution === 'string' ? sp.contribution : '';
                  return (
                    <div key={j} className="flex items-start gap-1">
                      <span className="shrink-0 mt-1 w-1 h-1 rounded-full bg-muted-foreground/40" />
                      <a
                        href={paperLink(paperId || undefined, title)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-primary/70 hover:text-primary transition-colors underline-offset-2 hover:underline line-clamp-1"
                      >
                        {title}{contribution ? ` — ${contribution}` : ''}
                      </a>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Implications + Open Questions — 2-col compact grid */}
        {(implications.length > 0 || openQuestions.length > 0) && (
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border">
            {implications.length > 0 && (
              <div>
                <p className="text-caption text-muted-foreground mb-1">Implications</p>
                <ul className="space-y-0.5">
                  {implications.map((imp: any, j: number) => {
                    const impStr = typeof imp === 'string' ? imp : safeString(imp);
                    const impPaperId: string = typeof imp?.paperId === 'string' ? imp.paperId : '';
                    const impPaperTitle: string = typeof imp?.paperTitle === 'string' ? imp.paperTitle : '';
                    // Fall back to first source paper
                    const fallbackPaper = sourcePapers.length > 0 ? sourcePapers[0] : null;
                    const fallbackId: string = fallbackPaper
                      ? (typeof fallbackPaper?.paperId === 'string' ? fallbackPaper.paperId : typeof fallbackPaper?.id === 'string' ? fallbackPaper.id : '')
                      : '';
                    const fallbackTitle: string = fallbackPaper
                      ? (typeof fallbackPaper === 'string' ? fallbackPaper : fallbackPaper?.title ?? '')
                      : '';
                    const linkId = impPaperId || fallbackId;
                    const linkTitle = impPaperTitle || fallbackTitle;
                    return (
                      <li key={j} className="flex items-start gap-1 text-[10px] text-muted-foreground line-clamp-1">
                        <span className="shrink-0 mt-1 w-1 h-1 rounded-full bg-primary/50" />
                        {linkId || linkTitle ? (
                          <a
                            href={paperLink(linkId || undefined, linkTitle || impStr)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-primary transition-colors hover:underline underline-offset-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {impStr}
                          </a>
                        ) : impStr}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            {openQuestions.length > 0 && (
              <div>
                <p className="text-caption text-muted-foreground mb-1">Open Questions</p>
                <ul className="space-y-0.5">
                  {openQuestions.map((q: any, j: number) => {
                    const qStr = typeof q === 'string' ? q : safeString(q);
                    const qPaperId: string = typeof q?.paperId === 'string' ? q.paperId : '';
                    const qPaperTitle: string = typeof q?.paperTitle === 'string' ? q.paperTitle : '';
                    const fallbackPaper = sourcePapers.length > 0 ? sourcePapers[0] : null;
                    const fallbackId: string = fallbackPaper
                      ? (typeof fallbackPaper?.paperId === 'string' ? fallbackPaper.paperId : typeof fallbackPaper?.id === 'string' ? fallbackPaper.id : '')
                      : '';
                    const fallbackTitle: string = fallbackPaper
                      ? (typeof fallbackPaper === 'string' ? fallbackPaper : fallbackPaper?.title ?? '')
                      : '';
                    const linkId = qPaperId || fallbackId;
                    const linkTitle = qPaperTitle || fallbackTitle;
                    return (
                      <li key={j} className="flex items-start gap-1 text-[10px] text-muted-foreground line-clamp-1">
                        <span className="shrink-0 text-muted-foreground/50 text-[9px] mt-0.5">?</span>
                        {linkId || linkTitle ? (
                          <a
                            href={paperLink(linkId || undefined, linkTitle || qStr)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-primary transition-colors hover:underline underline-offset-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {qStr}
                          </a>
                        ) : qStr}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PivotingTrendsList({ pivotingTrends }: { pivotingTrends: any[] }) {
  const [showAll, setShowAll] = useState(false);
  const MAX = 5;
  const visible = showAll ? pivotingTrends : pivotingTrends.slice(0, MAX);

  return (
    <div className="space-y-1">
      {visible.map((t: any, i: number) => {
        const from = typeof t.from === 'string' ? t.from : safeString(t.from);
        const to = typeof t.to === 'string' ? t.to : safeString(t.to);
        const timespan = typeof t.timespan === 'string' ? t.timespan : '';
        const evidence: any[] = Array.isArray(t.evidence) ? t.evidence : [];
        const firstEvidence = evidence.length > 0
          ? (typeof evidence[0] === 'string' ? evidence[0] : (typeof evidence[0]?.quote === 'string' ? evidence[0].quote : ''))
          : '';
        // First evidence paper link
        const firstEvidencePaperId: string = evidence.length > 0 && typeof evidence[0] === 'object'
          ? (typeof evidence[0]?.paperId === 'string' ? evidence[0].paperId : typeof evidence[0]?.id === 'string' ? evidence[0].id : '')
          : '';
        const firstEvidencePaperTitle: string = evidence.length > 0 && typeof evidence[0] === 'object'
          ? (typeof evidence[0]?.paperTitle === 'string' ? evidence[0].paperTitle : typeof evidence[0]?.title === 'string' ? evidence[0].title : '')
          : '';
        const trendHref = firstEvidencePaperId || firstEvidencePaperTitle
          ? paperLink(firstEvidencePaperId || undefined, firstEvidencePaperTitle || `${from} → ${to}`)
          : undefined;

        const trendContent = (
          <div className="flex items-center gap-2 text-xs w-full">
            <span className="rounded bg-muted/60 border border-border px-1.5 py-0.5 text-[10px] shrink-0 max-w-[120px] truncate" title={from}>{from}</span>
            <span className="text-muted-foreground shrink-0">→</span>
            <span className="rounded bg-primary/10 border border-primary/20 px-1.5 py-0.5 text-[10px] text-primary/80 font-medium shrink-0 max-w-[120px] truncate" title={to}>{to}</span>
            {firstEvidence && (
              <span className="text-[10px] text-muted-foreground italic line-clamp-1 flex-1 min-w-0">{firstEvidence}</span>
            )}
            {timespan && <span className="text-[10px] text-muted-foreground shrink-0 ml-auto">{timespan}</span>}
          </div>
        );

        return trendHref ? (
          <a
            key={i}
            href={trendHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 hover:border-primary/30 hover:bg-primary/5 transition-colors"
          >
            {trendContent}
          </a>
        ) : (
          <div key={i} className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs">
            {trendContent}
          </div>
        );
      })}
      {pivotingTrends.length > MAX && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-[10px] text-primary/70 hover:text-primary transition-colors mt-1"
        >
          {showAll ? 'Show less' : `Show all (${pivotingTrends.length})`}
        </button>
      )}
    </div>
  );
}

function GapCard({ g }: { g: any }) {
  const [adjacentOpen, setAdjacentOpen] = useState(false);
  const area = typeof g.area === 'string' ? g.area : safeString(g.area);
  const why = typeof g.whyItMatters === 'string' ? g.whyItMatters : '';
  const adjacent: any[] = Array.isArray(g.adjacentWork) ? g.adjacentWork : [];
  // Try to link the gap title to a source paper if available
  const sourcePaperId: string = typeof g.sourcePaperId === 'string' ? g.sourcePaperId : '';
  const sourcePaperTitle: string = typeof g.sourcePaperTitle === 'string' ? g.sourcePaperTitle : '';
  // Or use first adjacent work
  const firstAdj = adjacent.length > 0 ? adjacent[0] : null;
  const firstAdjId: string = firstAdj
    ? (typeof firstAdj?.paperId === 'string' ? firstAdj.paperId : typeof firstAdj?.id === 'string' ? firstAdj.id : '')
    : '';
  const firstAdjTitle: string = firstAdj
    ? (typeof firstAdj === 'string' ? firstAdj : firstAdj?.title ?? firstAdj?.name ?? '')
    : '';
  const gapLinkId = sourcePaperId || firstAdjId;
  const gapLinkTitle = sourcePaperTitle || firstAdjTitle;

  return (
    <Card>
      <CardContent className="p-2 space-y-1.5">
        <div className="flex items-start gap-1.5">
          <span className="shrink-0 mt-0.5 text-amber-400 text-sm">⬡</span>
          {gapLinkId || gapLinkTitle ? (
            <a
              href={paperLink(gapLinkId || undefined, gapLinkTitle || area)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold leading-snug hover:text-primary transition-colors hover:underline underline-offset-2"
            >
              {area}
            </a>
          ) : (
            <p className="text-xs font-semibold leading-snug">{area}</p>
          )}
        </div>
        {why && (
          <p className="text-[10px] text-muted-foreground line-clamp-2">{why}</p>
        )}
        {adjacent.length > 0 && (
          <div>
            <button
              onClick={() => setAdjacentOpen(!adjacentOpen)}
              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              {adjacentOpen ? '▾' : '▸'} {adjacent.length} adjacent work{adjacent.length !== 1 ? 's' : ''}
            </button>
            {adjacentOpen && (
              <ul className="mt-1 space-y-0.5 pl-2">
                {adjacent.map((adj: any, j: number) => {
                  const adjTitle: string = typeof adj === 'string' ? adj : (adj?.title ?? adj?.name ?? adj?.id ?? '');
                  const adjId: string = typeof adj?.paperId === 'string' ? adj.paperId : typeof adj?.id === 'string' ? adj.id : '';
                  return (
                    <li key={j} className="flex items-start gap-1">
                      <span className="shrink-0 mt-1 w-1 h-1 rounded-full bg-muted-foreground/40" />
                      <a
                        href={paperLink(adjId || undefined, adjTitle)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-primary/70 hover:text-primary transition-colors underline-offset-2 hover:underline line-clamp-1"
                      >
                        {adjTitle}
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function FrontiersTab({ artifacts }: FrontiersTabProps) {
  const frontierArtifact = artifacts.find((a) => a.agentType === 'frontier-detector');
  const data = frontierArtifact?.data ?? {};

  const frontiers: any[] = data.frontiers ?? [];
  const pivotingTrends: any[] = data.pivotingTrends ?? [];
  const gaps: any[] = data.gaps ?? [];

  const hasData = frontiers.length > 0 || pivotingTrends.length > 0 || gaps.length > 0;

  if (!hasData) {
    return (
      <EmptyState
        icon={
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        }
        title="No frontiers yet"
        description="Run an analysis to detect emerging research directions."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Surprising / Controversial findings widget */}
      <SurprisingFindings frontiers={frontiers} />

      {/* Summary stats — single horizontal bar */}
      <div className="flex items-center gap-4 rounded-lg border border-blue-500/20 bg-gradient-to-r from-blue-600/10 to-indigo-600/5 px-4 py-2">
        <p className="text-xs font-semibold text-foreground mr-2">Research Frontiers</p>
        <div className="flex items-center gap-1">
          <span className="text-sm font-bold">{frontiers.length}</span>
          <span className="text-[10px] text-muted-foreground">
            findings
            {frontiers.filter(f => f.category === 'paradigm_shift').length > 0
              ? ` · ${frontiers.filter(f => f.category === 'paradigm_shift').length} paradigm shifts`
              : ''}
          </span>
        </div>
        <span className="text-muted-foreground/30">·</span>
        <div className="flex items-center gap-1">
          <span className="text-sm font-bold">{pivotingTrends.length}</span>
          <span className="text-[10px] text-muted-foreground">pivoting trends</span>
        </div>
        <span className="text-muted-foreground/30">·</span>
        <div className="flex items-center gap-1">
          <span className="text-sm font-bold">{gaps.length}</span>
          <span className="text-[10px] text-muted-foreground">research gaps</span>
        </div>
      </div>

      {/* Frontier findings — 2-col grid on wide screens */}
      {frontiers.length > 0 && (
        <section>
          <h3 className="text-caption text-muted-foreground mb-2">
            Findings ({frontiers.length})
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {frontiers.map((f, i) => (
              <FrontierCard key={i} f={f} />
            ))}
          </div>
        </section>
      )}

      {/* Pivoting Trends */}
      {pivotingTrends.length > 0 && (
        <section>
          <h3 className="text-caption text-muted-foreground mb-2">
            Pivoting Trends ({pivotingTrends.length})
          </h3>
          <PivotingTrendsList pivotingTrends={pivotingTrends} />
        </section>
      )}

      {/* Research Gaps — 3-column grid */}
      {gaps.length > 0 && (
        <section>
          <h3 className="text-caption text-muted-foreground mb-2">
            Research Gaps ({gaps.length})
          </h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {gaps.map((g: any, i: number) => (
              <GapCard key={i} g={g} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
