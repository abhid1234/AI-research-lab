'use client';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface FrontiersTabProps {
  artifacts: { agentType: string; data: any }[];
}

const categoryStyles: Record<string, string> = {
  paradigm_shift: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  method_breakthrough: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  surprising_result: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  convergence: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  capability_unlock: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
};

const categoryLabel: Record<string, string> = {
  paradigm_shift: 'Paradigm Shift',
  method_breakthrough: 'Method Breakthrough',
  surprising_result: 'Surprising Result',
  convergence: 'Convergence',
  capability_unlock: 'Capability Unlock',
};

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.min(Math.max(Math.round(value * 100), 0), 100);
  const color =
    pct >= 70 ? 'bg-emerald-500' :
    pct >= 40 ? 'bg-amber-500' :
    'bg-rose-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground tabular-nums">{pct}%</span>
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
      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
        No frontier data available yet. Run an analysis to detect research frontiers.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Frontier findings */}
      {frontiers.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Research Frontiers ({frontiers.length})
          </h3>
          <div className="space-y-3">
            {frontiers.map((f, i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <CardTitle className="text-sm leading-snug flex-1">{f.finding}</CardTitle>
                    {f.category && (
                      <span
                        className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-medium shrink-0 ${categoryStyles[f.category] ?? 'bg-muted text-muted-foreground'}`}
                      >
                        {categoryLabel[f.category] ?? f.category}
                      </span>
                    )}
                  </div>
                  {f.explanation && (
                    <CardDescription>{f.explanation}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  {f.confidence != null && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Confidence</p>
                      <ConfidenceBar value={f.confidence} />
                    </div>
                  )}
                  {f.implications && (
                    <div>
                      <p className="text-xs text-muted-foreground font-medium mb-0.5">Implications</p>
                      <p className="text-sm text-muted-foreground">{Array.isArray(f.implications) ? f.implications.join('. ') : f.implications}</p>
                    </div>
                  )}
                  {f.sourcePapers && f.sourcePapers.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground font-medium mb-1.5">Source Papers</p>
                      <div className="flex flex-wrap gap-1.5">
                        {f.sourcePapers.map((sp: any, j: number) => (
                          <Badge key={j} variant="outline" className="text-[10px]">{typeof sp === 'string' ? sp : sp.title ?? sp.id ?? ''}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {f.openQuestions && f.openQuestions.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground font-medium mb-1.5">Open Questions</p>
                      <ul className="space-y-1">
                        {f.openQuestions.map((q: string, j: number) => (
                          <li key={j} className="text-xs text-muted-foreground flex gap-1.5 items-start">
                            <span className="shrink-0 mt-0.5 text-muted-foreground/50">?</span>
                            {q}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Pivoting Trends */}
      {pivotingTrends.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Pivoting Trends ({pivotingTrends.length})
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {pivotingTrends.map((t: any, i: number) => (
              <Card key={i} size="sm">
                <CardContent className="pt-3 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="rounded bg-muted/60 border border-border px-2 py-0.5 text-xs">{t.from}</span>
                    <span className="text-muted-foreground text-sm">→</span>
                    <span className="rounded bg-primary/10 border border-primary/20 px-2 py-0.5 text-xs text-primary/80 font-medium">{t.to}</span>
                    {t.timespan && (
                      <span className="text-xs text-muted-foreground ml-auto">{t.timespan}</span>
                    )}
                  </div>
                  {t.evidence && (
                    <p className="text-xs text-muted-foreground">
                      {Array.isArray(t.evidence)
                        ? t.evidence.map((e: any) => typeof e === 'string' ? e : e.quote ?? '').join('; ')
                        : String(t.evidence)}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Research Gaps */}
      {gaps.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Research Gaps ({gaps.length})
          </h3>
          <div className="space-y-2">
            {gaps.map((g: any, i: number) => (
              <Card key={i} size="sm">
                <CardContent className="pt-3 flex items-start gap-3">
                  <span className="shrink-0 mt-0.5 text-amber-400">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M7 4.5v3M7 9.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </span>
                  <div>
                    <p className="text-sm font-medium">{g.area}</p>
                    {g.whyItMatters && (
                      <p className="text-xs text-muted-foreground mt-0.5">{g.whyItMatters}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
