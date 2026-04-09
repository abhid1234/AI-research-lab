'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BenchmarkTable } from '@/components/charts/benchmark-table';

interface InsightsTabProps {
  artifacts: { agentType: string; data: any }[];
}

const natureBadgeClass: Record<string, string> = {
  temporal_shift: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  direct_contradiction: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  scope_difference: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  methodology_gap: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  // legacy keys kept for backwards compat
  direct: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  indirect: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  methodological: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  contextual: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
};

const importanceDot: Record<string, string> = {
  high: 'bg-rose-500',
  medium: 'bg-amber-400',
  low: 'bg-muted-foreground/40',
};

const warningIssueLabel: Record<string, string> = {
  cherry_picked_benchmarks: 'Cherry-Picked Benchmarks',
  incomparable_conditions: 'Incomparable Conditions',
  missing_baselines: 'Missing Baselines',
  overfitted_metrics: 'Overfitted Metrics',
};

function safeString(val: any): string {
  return typeof val === 'string' ? val : val?.title ?? val?.id ?? '';
}

function SummaryCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 flex items-center gap-3">
      <span className="text-xl">{icon}</span>
      <div>
        <p className="text-lg font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function ImportanceDot({ importance }: { importance: any }) {
  const key = typeof importance === 'string' ? importance.toLowerCase() : '';
  const dot = importanceDot[key] ?? importanceDot.low;
  return (
    <span className="flex items-center gap-1.5">
      <span className={`inline-block w-2 h-2 rounded-full ${dot}`} />
      <span className="text-xs text-muted-foreground capitalize">{key || 'unknown'}</span>
    </span>
  );
}

export function InsightsTab({ artifacts }: InsightsTabProps) {
  const contradictionArtifact = artifacts.find((a) => a.agentType === 'contradiction-finder');
  const benchmarkArtifact = artifacts.find((a) => a.agentType === 'benchmark-extractor');

  const contradictionData = contradictionArtifact?.data ?? {};
  const benchmarkData = benchmarkArtifact?.data ?? {};

  const contradictions: any[] = contradictionData.contradictions ?? [];
  const consensus: any[] = contradictionData.consensus ?? [];
  const openDebates: any[] = contradictionData.openDebates ?? [];
  const benchmarkTables: any[] = benchmarkData.benchmarkTables ?? [];
  const warnings: any[] = benchmarkData.warnings ?? [];

  const hasData =
    contradictions.length > 0 ||
    consensus.length > 0 ||
    openDebates.length > 0 ||
    benchmarkTables.length > 0;

  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
        No insights available yet. Run an analysis to discover contradictions and consensus.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Insights summary */}
      <div className="grid grid-cols-4 gap-3">
        <SummaryCard label="Contradictions" value={contradictions.length} icon="⚡" />
        <SummaryCard label="Consensus" value={consensus.length} icon="✓" />
        <SummaryCard label="Open Debates" value={openDebates.length} icon="?" />
        <SummaryCard label="Warnings" value={warnings.length} icon="⚠" />
      </div>

      {/* Contradictions */}
      {contradictions.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">
            Contradictions ({contradictions.length})
          </h3>
          <p className="text-xs text-muted-foreground mb-4">Claims where papers disagree — revealing where the field is still uncertain.</p>
          <div className="space-y-4">
            {contradictions.map((c, i) => {
              const nature = typeof c.nature === 'string' ? c.nature : '';
              const badgeClass = natureBadgeClass[nature] ?? 'bg-muted text-muted-foreground border-border';
              const claim1Statement = typeof c.claim1 === 'string' ? c.claim1 : (typeof c.claim1?.statement === 'string' ? c.claim1.statement : '');
              const claim1Title = typeof c.claim1?.paper?.title === 'string' ? c.claim1.paper.title : '';
              const claim1PaperId: string = typeof c.claim1?.paper?.paperId === 'string' ? c.claim1.paper.paperId : typeof c.claim1?.paper?.id === 'string' ? c.claim1.paper.id : '';
              const claim2Statement = typeof c.claim2 === 'string' ? c.claim2 : (typeof c.claim2?.statement === 'string' ? c.claim2.statement : '');
              const claim2Title = typeof c.claim2?.paper?.title === 'string' ? c.claim2.paper.title : '';
              const claim2PaperId: string = typeof c.claim2?.paper?.paperId === 'string' ? c.claim2.paper.paperId : typeof c.claim2?.paper?.id === 'string' ? c.claim2.paper.id : '';
              const analysis = typeof c.analysis === 'string' ? c.analysis : '';

              return (
                <Card key={i}>
                  <CardContent className="pt-4 space-y-3">
                    {/* Header row */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span
                        className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${badgeClass}`}
                      >
                        {nature
                          ? nature.replace(/_/g, ' ').replace(/\b\w/g, (ch: string) => ch.toUpperCase())
                          : 'Contradiction'}
                      </span>
                      {c.importance && <ImportanceDot importance={c.importance} />}
                    </div>

                    {/* Two-column claim comparison */}
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div className="rounded-md bg-rose-500/5 border border-rose-500/15 p-3 space-y-1">
                        <p className="text-xs text-rose-400 font-semibold">Claim A</p>
                        <p className="text-sm">{claim1Statement}</p>
                        {claim1Title && (
                          claim1PaperId ? (
                            <a
                              href={`https://www.semanticscholar.org/paper/${claim1PaperId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary/70 hover:text-primary transition-colors flex items-center gap-1"
                            >
                              <span>↗</span>
                              <span className="italic">{claim1Title}</span>
                            </a>
                          ) : (
                            <p className="text-xs text-muted-foreground">— {claim1Title}</p>
                          )
                        )}
                        {c.claim1?.evidence && (
                          <p className="text-[11px] text-muted-foreground/70 italic mt-1">
                            {typeof c.claim1.evidence === 'string' ? c.claim1.evidence : ''}
                          </p>
                        )}
                      </div>
                      <div className="rounded-md bg-blue-500/5 border border-blue-500/15 p-3 space-y-1">
                        <p className="text-xs text-blue-400 font-semibold">Claim B</p>
                        <p className="text-sm">{claim2Statement}</p>
                        {claim2Title && (
                          claim2PaperId ? (
                            <a
                              href={`https://www.semanticscholar.org/paper/${claim2PaperId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary/70 hover:text-primary transition-colors flex items-center gap-1"
                            >
                              <span>↗</span>
                              <span className="italic">{claim2Title}</span>
                            </a>
                          ) : (
                            <p className="text-xs text-muted-foreground">— {claim2Title}</p>
                          )
                        )}
                        {c.claim2?.evidence && (
                          <p className="text-[11px] text-muted-foreground/70 italic mt-1">
                            {typeof c.claim2.evidence === 'string' ? c.claim2.evidence : ''}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Analysis */}
                    {analysis && (
                      <p className="text-xs text-muted-foreground leading-relaxed">{analysis}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Consensus */}
      {consensus.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">
            Consensus Findings ({consensus.length})
          </h3>
          <p className="text-xs text-muted-foreground mb-4">Findings confirmed independently by multiple research groups.</p>
          <div className="space-y-3">
            {consensus.map((c, i) => {
              const finding = typeof c.finding === 'string' ? c.finding : safeString(c.finding);
              const supportingPapers: any[] = Array.isArray(c.supportingPapers) ? c.supportingPapers : [];
              const caveats: any[] = Array.isArray(c.caveats) ? c.caveats : [];
              const strength = typeof c.strength === 'string' ? c.strength : '';

              return (
                <Card key={i}>
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <span className="shrink-0 mt-0.5 text-emerald-400 text-base font-bold">✓</span>
                      <div className="space-y-1 flex-1">
                        <p className="text-sm font-medium leading-snug">{finding}</p>
                        {(supportingPapers.length > 0 || strength) && (
                          <p className="text-xs text-muted-foreground">
                            {supportingPapers.length > 0
                              ? `Supported by ${supportingPapers.length} paper${supportingPapers.length === 1 ? '' : 's'}`
                              : ''}
                            {strength ? ` · strength: ${strength}` : ''}
                          </p>
                        )}
                        {supportingPapers.length > 0 && (
                          <div className="space-y-0.5 mt-1">
                            {supportingPapers.map((sp: any, j: number) => {
                              const title = typeof sp === 'string' ? sp : (typeof sp?.title === 'string' ? sp.title : safeString(sp));
                              const claim = typeof sp?.relevantClaim === 'string' ? sp.relevantClaim : '';
                              return (
                                <p key={j} className="text-[11px] text-muted-foreground/70 flex items-start gap-1.5">
                                  <span className="shrink-0 mt-1 w-1 h-1 rounded-full bg-emerald-500/50" />
                                  {title}{claim ? <span className="opacity-70"> — {claim}</span> : null}
                                </p>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                    {caveats.length > 0 && (
                      <div className="rounded-md bg-amber-500/5 border border-amber-500/15 px-3 py-2">
                        <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-wide mb-1">Caveats</p>
                        <ul className="space-y-0.5">
                          {caveats.map((caveat: any, j: number) => {
                            const caveatStr = typeof caveat === 'string' ? caveat : safeString(caveat);
                            return (
                              <li key={j} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                <span className="shrink-0 mt-1 w-1 h-1 rounded-full bg-amber-400/50" />
                                {caveatStr}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Open Debates */}
      {openDebates.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">
            Open Debates ({openDebates.length})
          </h3>
          <p className="text-xs text-muted-foreground mb-4">Unresolved questions where the community is actively split.</p>
          <div className="space-y-4">
            {openDebates.map((d, i) => {
              const question = typeof d.question === 'string' ? d.question : safeString(d.question);
              const significance = typeof d.significance === 'string' ? d.significance : '';
              const sides: any[] = Array.isArray(d.sides) ? d.sides : [];

              return (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">{question}</CardTitle>
                    {significance && (
                      <CardDescription className="text-xs">{significance}</CardDescription>
                    )}
                  </CardHeader>
                  {sides.length > 0 && (
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {sides.map((side: any, j: number) => {
                          const position = typeof side === 'string' ? side : (typeof side?.position === 'string' ? side.position : '');
                          const evidence = typeof side?.strongestEvidence === 'string' ? side.strongestEvidence : '';
                          const papers: any[] = Array.isArray(side?.papers) ? side.papers : [];
                          const label = j === 0 ? 'Position A' : j === 1 ? 'Position B' : `Position ${j + 1}`;
                          const labelColor = j === 0 ? 'text-violet-400' : 'text-sky-400';
                          const borderColor = j === 0 ? 'border-violet-500/20 bg-violet-500/5' : 'border-sky-500/20 bg-sky-500/5';

                          return (
                            <div key={j} className={`rounded-md border p-3 space-y-1.5 ${borderColor}`}>
                              <p className={`text-[10px] font-semibold uppercase tracking-wide ${labelColor}`}>{label}</p>
                              <p className="text-sm font-medium leading-snug">{position}</p>
                              {evidence && (
                                <p className="text-xs text-muted-foreground">{evidence}</p>
                              )}
                              {papers.length > 0 && (
                                <div className="space-y-0.5 pt-1">
                                  {papers.map((p: any, k: number) => {
                                    const t = typeof p === 'string' ? p : (typeof p?.title === 'string' ? p.title : safeString(p));
                                    return (
                                      <p key={k} className="text-[11px] text-muted-foreground/70 flex items-start gap-1">
                                        <span className="shrink-0 mt-1 w-1 h-1 rounded-full bg-muted-foreground/30" />
                                        {t}
                                      </p>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Benchmark Warnings */}
      {warnings.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">
            Benchmark Warnings ({warnings.length})
          </h3>
          <p className="text-xs text-muted-foreground mb-4">Papers whose reported results may need closer scrutiny.</p>
          <div className="space-y-2">
            {warnings.map((w: any, i: number) => {
              const issue = typeof w === 'string' ? w : (typeof w?.issue === 'string' ? w.issue : safeString(w));
              const issueType = typeof w?.issueType === 'string' ? w.issueType : '';
              const explanation = typeof w?.explanation === 'string' ? w.explanation : '';
              const paperRef = typeof w?.paper === 'string' ? w.paper : (typeof w?.paper?.title === 'string' ? w.paper.title : '');
              const issueLabel = warningIssueLabel[issueType] ?? (issueType ? issueType.replace(/_/g, ' ') : '');

              return (
                <div
                  key={i}
                  className="rounded-md bg-amber-500/5 border border-amber-500/15 px-4 py-3 space-y-1"
                >
                  <div className="flex items-start gap-2">
                    <span className="shrink-0 text-amber-400 mt-0.5">⚠</span>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-amber-300">{issue}</p>
                        {issueLabel && (
                          <span className="inline-flex items-center rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-400 font-medium">
                            {issueLabel}
                          </span>
                        )}
                      </div>
                      {explanation && (
                        <p className="text-xs text-muted-foreground">{explanation}</p>
                      )}
                      {paperRef && (
                        <p className="text-[11px] text-muted-foreground/60">— {paperRef}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Benchmark tables */}
      {benchmarkTables.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
            Benchmarks
          </h3>
          <div className="space-y-4">
            {benchmarkTables.map((t: any, i: number) => (
              <BenchmarkTable key={i} table={t} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
