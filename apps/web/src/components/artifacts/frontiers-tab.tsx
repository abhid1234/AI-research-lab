'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface FrontiersTabProps {
  artifacts: { agentType: string; data: any }[];
}

const categoryEmoji: Record<string, string> = {
  paradigm_shift: '🔴',
  method_breakthrough: '🔵',
  surprising_result: '🟡',
  convergence: '🟢',
  capability_unlock: '🟣',
};

const categoryLabel: Record<string, string> = {
  paradigm_shift: 'Paradigm Shift',
  method_breakthrough: 'Method Breakthrough',
  surprising_result: 'Surprising Result',
  convergence: 'Convergence',
  capability_unlock: 'Capability Unlock',
};

const categoryStyles: Record<string, string> = {
  paradigm_shift: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  method_breakthrough: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  surprising_result: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  convergence: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  capability_unlock: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
};

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

function safeString(val: any): string {
  return typeof val === 'string' ? val : val?.title ?? val?.id ?? '';
}

function paperLink(id: string | undefined, title?: string): string {
  if (!id) return title ? `https://scholar.google.com/scholar?q=${encodeURIComponent(title)}` : '#';
  if (id.includes('arxiv.org')) return id;
  if (id.includes('.') || id.includes('/')) return `https://arxiv.org/abs/${id}`;
  return `https://scholar.google.com/scholar?q=${encodeURIComponent(title ?? id)}`;
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

        {finding && <p className="text-sm font-semibold leading-snug">{finding}</p>}

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
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Implications</p>
                <ul className="space-y-0.5">
                  {implications.map((imp: any, j: number) => {
                    const impStr = typeof imp === 'string' ? imp : safeString(imp);
                    return (
                      <li key={j} className="flex items-start gap-1 text-[10px] text-muted-foreground line-clamp-1">
                        <span className="shrink-0 mt-1 w-1 h-1 rounded-full bg-primary/50" />
                        {impStr}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            {openQuestions.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Open Questions</p>
                <ul className="space-y-0.5">
                  {openQuestions.map((q: any, j: number) => {
                    const qStr = typeof q === 'string' ? q : safeString(q);
                    return (
                      <li key={j} className="flex items-start gap-1 text-[10px] text-muted-foreground line-clamp-1">
                        <span className="shrink-0 text-muted-foreground/50 text-[9px] mt-0.5">?</span>
                        {qStr}
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

        return (
          <div key={i} className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs">
            <span className="rounded bg-muted/60 border border-border px-1.5 py-0.5 text-[10px] shrink-0 max-w-[120px] truncate" title={from}>{from}</span>
            <span className="text-muted-foreground shrink-0">→</span>
            <span className="rounded bg-primary/10 border border-primary/20 px-1.5 py-0.5 text-[10px] text-primary/80 font-medium shrink-0 max-w-[120px] truncate" title={to}>{to}</span>
            {firstEvidence && (
              <span className="text-[10px] text-muted-foreground italic line-clamp-1 flex-1 min-w-0">{firstEvidence}</span>
            )}
            {timespan && <span className="text-[10px] text-muted-foreground shrink-0 ml-auto">{timespan}</span>}
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

export function FrontiersTab({ artifacts }: FrontiersTabProps) {
  const frontierArtifact = artifacts.find((a) => a.agentType === 'frontier-detector');
  const data = frontierArtifact?.data ?? {};

  const frontiers: any[] = data.frontiers ?? [];
  const pivotingTrends: any[] = data.pivotingTrends ?? [];
  const gaps: any[] = data.gaps ?? [];

  const hasData = frontiers.length > 0 || pivotingTrends.length > 0 || gaps.length > 0;

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-40">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
        <p className="text-sm">No frontiers yet. Run an analysis to detect emerging research directions.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
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
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Pivoting Trends ({pivotingTrends.length})
          </h3>
          <PivotingTrendsList pivotingTrends={pivotingTrends} />
        </section>
      )}

      {/* Research Gaps — 3-column grid */}
      {gaps.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Research Gaps ({gaps.length})
          </h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {gaps.map((g: any, i: number) => {
              const area = typeof g.area === 'string' ? g.area : safeString(g.area);
              const why = typeof g.whyItMatters === 'string' ? g.whyItMatters : '';
              const adjacent: any[] = Array.isArray(g.adjacentWork) ? g.adjacentWork : [];

              return (
                <Card key={i}>
                  <CardContent className="p-2 space-y-1.5">
                    <div className="flex items-start gap-1.5">
                      <span className="shrink-0 mt-0.5 text-amber-400 text-sm">⬡</span>
                      <p className="text-xs font-semibold leading-snug">{area}</p>
                    </div>
                    {why && (
                      <p className="text-[10px] text-muted-foreground line-clamp-2">{why}</p>
                    )}
                    {adjacent.length > 0 && (
                      <p className="text-[10px] text-muted-foreground">
                        {adjacent.length} adjacent work{adjacent.length !== 1 ? 's' : ''}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
