'use client';

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

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.min(Math.max(Math.round(value * 100), 0), 100);
  const color =
    pct >= 70 ? 'bg-emerald-500' :
    pct >= 40 ? 'bg-amber-500' :
    'bg-rose-500';
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Confidence</span>
        <span className="text-xs text-muted-foreground tabular-nums font-medium">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function safeString(val: any): string {
  return typeof val === 'string' ? val : val?.title ?? val?.id ?? '';
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
      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
        No frontier data available yet. Run an analysis to detect research frontiers.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header banner */}
      <div className="bg-gradient-to-r from-blue-600/20 to-indigo-600/10 border border-blue-500/20 rounded-xl p-5">
        <p className="text-lg font-bold text-foreground">Research Frontiers</p>
        <p className="text-sm text-muted-foreground mt-1">
          Key findings extracted from the actual papers — what researchers discovered, the methods that worked, and results that matter.
        </p>
      </div>

      {/* Summary stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Key Findings</p>
          <p className="text-lg font-bold mt-0.5">{frontiers.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {frontiers.filter(f => f.category === 'paradigm_shift').length} paradigm shifts,{' '}
            {frontiers.filter(f => f.category === 'method_breakthrough').length} breakthroughs
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Pivoting Trends</p>
          <p className="text-lg font-bold mt-0.5">{pivotingTrends.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Directional shifts in research focus
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Research Gaps</p>
          <p className="text-lg font-bold mt-0.5">{gaps.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Underexplored areas identified
          </p>
        </div>
      </div>

      {/* Frontier findings */}
      {frontiers.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
            Findings ({frontiers.length})
          </h3>
          <div className="space-y-4">
            {frontiers.map((f, i) => {
              const cat = typeof f.category === 'string' ? f.category : '';
              const emoji = categoryEmoji[cat] ?? '⚪';
              const label = categoryLabel[cat] ?? cat;
              const badgeStyle = categoryStyles[cat] ?? 'bg-muted text-muted-foreground border-border';
              const implications: string[] = Array.isArray(f.implications) ? f.implications : [];
              const openQuestions: string[] = Array.isArray(f.openQuestions) ? f.openQuestions : [];
              const sourcePapers: any[] = Array.isArray(f.sourcePapers) ? f.sourcePapers : [];
              const finding = safeString(f.finding);
              const explanation = typeof f.explanation === 'string' ? f.explanation : '';

              return (
                <Card key={i} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex flex-col sm:flex-row">
                      {/* Left — 2/3 */}
                      <div className="flex-1 min-w-0 p-5 space-y-3 sm:border-r border-border">
                        <div className="flex items-start gap-2 flex-wrap">
                          <span className="text-base leading-none mt-0.5">{emoji}</span>
                          <span
                            className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-medium ${badgeStyle}`}
                          >
                            {label}
                          </span>
                        </div>
                        {finding && (
                          <p className="text-sm font-semibold leading-snug">{finding}</p>
                        )}
                        {explanation && (
                          <p className="text-sm text-muted-foreground leading-relaxed">{explanation}</p>
                        )}
                        {sourcePapers.length > 0 && (
                          <div>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Sources</p>
                            <div className="space-y-0.5">
                              {sourcePapers.map((sp: any, j: number) => {
                                const title = typeof sp === 'string' ? sp : sp.title ?? sp.id ?? '';
                                const paperId: string = typeof sp?.paperId === 'string' ? sp.paperId : typeof sp?.id === 'string' ? sp.id : '';
                                const contribution = typeof sp?.contribution === 'string' ? sp.contribution : '';
                                const titleNode = (
                                  <>
                                    {title}
                                    {contribution && <span className="opacity-60"> — {contribution}</span>}
                                  </>
                                );
                                return (
                                  <div key={j} className="flex items-start gap-1.5">
                                    <span className="shrink-0 mt-1 w-1 h-1 rounded-full bg-muted-foreground/40" />
                                    {paperId ? (
                                      <a
                                        href={`https://www.semanticscholar.org/paper/${paperId}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-primary/70 hover:text-primary transition-colors"
                                      >
                                        {titleNode}
                                      </a>
                                    ) : (
                                      <span className="text-xs text-muted-foreground">{titleNode}</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Right — 1/3 sidebar */}
                      <div className="sm:w-64 shrink-0 p-4 space-y-4 bg-blue-500/5 border-l border-blue-500/20">
                        {f.confidence != null && (
                          <ConfidenceBar value={typeof f.confidence === 'number' ? f.confidence : 0} />
                        )}

                        {implications.length > 0 && (
                          <div>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Implications</p>
                            <ul className="space-y-1">
                              {implications.map((imp: any, j: number) => {
                                const impStr = typeof imp === 'string' ? imp : safeString(imp);
                                return (
                                  <li key={j} className="flex items-start gap-1.5 text-xs text-muted-foreground">
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
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Open Questions</p>
                            <ul className="space-y-1">
                              {openQuestions.map((q: any, j: number) => {
                                const qStr = typeof q === 'string' ? q : safeString(q);
                                return (
                                  <li key={j} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                    <span className="shrink-0 text-muted-foreground/50 text-[10px] mt-0.5">?</span>
                                    {qStr}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Pivoting Trends */}
      {pivotingTrends.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
            Pivoting Trends ({pivotingTrends.length})
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {pivotingTrends.map((t: any, i: number) => {
              const from = typeof t.from === 'string' ? t.from : safeString(t.from);
              const to = typeof t.to === 'string' ? t.to : safeString(t.to);
              const timespan = typeof t.timespan === 'string' ? t.timespan : '';
              const evidence: any[] = Array.isArray(t.evidence) ? t.evidence : [];

              return (
                <Card key={i}>
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="rounded bg-muted/60 border border-border px-2 py-0.5 text-xs">{from}</span>
                      <span className="text-muted-foreground text-sm">→</span>
                      <span className="rounded bg-primary/10 border border-primary/20 px-2 py-0.5 text-xs text-primary/80 font-medium">{to}</span>
                      {timespan && (
                        <span className="text-xs text-muted-foreground ml-auto">{timespan}</span>
                      )}
                    </div>
                    {evidence.length > 0 && (
                      <div className="space-y-2">
                        {evidence.map((e: any, j: number) => {
                          const quote = typeof e === 'string' ? e : (typeof e?.quote === 'string' ? e.quote : '');
                          if (!quote) return null;
                          return (
                            <blockquote
                              key={j}
                              className="border-l-2 border-primary/30 pl-3 text-xs text-muted-foreground italic"
                            >
                              {quote}
                            </blockquote>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Research Gaps */}
      {gaps.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
            Research Gaps ({gaps.length})
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {gaps.map((g: any, i: number) => {
              const area = typeof g.area === 'string' ? g.area : safeString(g.area);
              const why = typeof g.whyItMatters === 'string' ? g.whyItMatters : '';
              const adjacent: any[] = Array.isArray(g.adjacentWork) ? g.adjacentWork : [];

              return (
                <Card key={i}>
                  <CardContent className="pt-4 space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="shrink-0 mt-0.5 text-amber-400 text-base">⬡</span>
                      <p className="text-sm font-semibold leading-snug">{area}</p>
                    </div>
                    {why && (
                      <div className="rounded-md bg-amber-500/5 border border-amber-500/15 px-3 py-2">
                        <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-wide mb-0.5">Why it matters</p>
                        <p className="text-xs text-muted-foreground">{why}</p>
                      </div>
                    )}
                    {adjacent.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Adjacent Work</p>
                        <div className="space-y-0.5">
                          {adjacent.map((a: any, j: number) => {
                            const title = typeof a === 'string' ? a : (typeof a?.title === 'string' ? a.title : safeString(a));
                            return (
                              <p key={j} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                <span className="shrink-0 mt-1 w-1 h-1 rounded-full bg-muted-foreground/40" />
                                {title}
                              </p>
                            );
                          })}
                        </div>
                      </div>
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
