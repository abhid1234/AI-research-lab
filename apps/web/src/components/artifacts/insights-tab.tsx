'use client';

import { useState } from 'react';
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

function paperLink(id: string | undefined, title?: string): string {
  if (!id) return title ? `https://scholar.google.com/scholar?q=${encodeURIComponent(title)}` : '#';
  if (id.includes('arxiv.org')) return id;
  if (id.includes('.') || id.includes('/')) return `https://arxiv.org/abs/${id}`;
  return `https://scholar.google.com/scholar?q=${encodeURIComponent(title ?? id)}`;
}

function ImportanceDot({ importance }: { importance: any }) {
  const key = typeof importance === 'string' ? importance.toLowerCase() : '';
  const dot = importanceDot[key] ?? importanceDot.low;
  return (
    <span className="flex items-center gap-1">
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${dot}`} />
      <span className="text-[10px] text-muted-foreground capitalize">{key || 'unknown'}</span>
    </span>
  );
}

function ContradictionCard({ c }: { c: any }) {
  const [expanded, setExpanded] = useState(false);

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
    <Card>
      <CardContent className="p-3 space-y-2">
        {/* Collapsed header — badge + importance + toggle */}
        <div
          className="flex items-center justify-between gap-2 cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium ${badgeClass}`}>
              {nature
                ? nature.replace(/_/g, ' ').replace(/\b\w/g, (ch: string) => ch.toUpperCase())
                : 'Contradiction'}
            </span>
            {c.importance && <ImportanceDot importance={c.importance} />}
          </div>
          <span className="text-[10px] text-muted-foreground shrink-0">{expanded ? '▴' : '▾'}</span>
        </div>

        {/* Collapsed view: claims side-by-side */}
        {!expanded && (
          <div className="grid grid-cols-2 gap-2">
            <p className="text-[10px] text-muted-foreground line-clamp-2 border-l-2 border-rose-500/30 pl-1.5">{claim1Statement}</p>
            <p className="text-[10px] text-muted-foreground line-clamp-2 border-l-2 border-blue-500/30 pl-1.5">{claim2Statement}</p>
          </div>
        )}

        {/* Expanded full analysis */}
        {expanded && (
          <>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="rounded-md bg-rose-500/5 border border-rose-500/15 p-2 space-y-1">
                <p className="text-[10px] text-rose-400 font-semibold">Claim A</p>
                <p className="text-xs">{claim1Statement}</p>
                {claim1Title && (
                  <a
                    href={paperLink(claim1PaperId || undefined, claim1Title)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-primary/70 hover:text-primary transition-colors flex items-center gap-1 hover:underline underline-offset-2"
                  >
                    <span>↗</span>
                    <span className="italic line-clamp-1">{claim1Title}</span>
                  </a>
                )}
                {c.claim1?.evidence && (
                  <p className="text-[10px] text-muted-foreground/70 italic">
                    {typeof c.claim1.evidence === 'string' ? c.claim1.evidence : ''}
                  </p>
                )}
              </div>
              <div className="rounded-md bg-blue-500/5 border border-blue-500/15 p-2 space-y-1">
                <p className="text-[10px] text-blue-400 font-semibold">Claim B</p>
                <p className="text-xs">{claim2Statement}</p>
                {claim2Title && (
                  <a
                    href={paperLink(claim2PaperId || undefined, claim2Title)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-primary/70 hover:text-primary transition-colors flex items-center gap-1 hover:underline underline-offset-2"
                  >
                    <span>↗</span>
                    <span className="italic line-clamp-1">{claim2Title}</span>
                  </a>
                )}
                {c.claim2?.evidence && (
                  <p className="text-[10px] text-muted-foreground/70 italic">
                    {typeof c.claim2.evidence === 'string' ? c.claim2.evidence : ''}
                  </p>
                )}
              </div>
            </div>
            {analysis && (
              <p className="text-xs text-muted-foreground leading-relaxed">{analysis}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
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
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-40">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <p className="text-sm">No insights yet. Run an analysis to discover contradictions and consensus.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary bar — compact horizontal */}
      <div className="flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-2">
        {[
          { label: 'Contradictions', value: contradictions.length, icon: '⚡' },
          { label: 'Consensus', value: consensus.length, icon: '✓' },
          { label: 'Open Debates', value: openDebates.length, icon: '?' },
          { label: 'Warnings', value: warnings.length, icon: '⚠' },
        ].map((s, i) => (
          <span key={i} className="flex items-center gap-1.5">
            <span className="text-sm">{s.icon}</span>
            <span className="text-sm font-bold tabular-nums">{s.value}</span>
            <span className="text-[10px] text-muted-foreground">{s.label}</span>
            {i < 3 && <span className="text-muted-foreground/30 ml-2">·</span>}
          </span>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left column: Contradictions + Open Debates */}
        <div className="space-y-4">
          {contradictions.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Contradictions ({contradictions.length})
              </h3>
              <p className="text-[10px] text-muted-foreground mb-2">Click a card to expand full analysis.</p>
              <div className="space-y-2">
                {contradictions.map((c, i) => (
                  <ContradictionCard key={i} c={c} />
                ))}
              </div>
            </section>
          )}

          {openDebates.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Open Debates ({openDebates.length})
              </h3>
              <p className="text-[10px] text-muted-foreground mb-2">Unresolved questions where the community is actively split.</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {openDebates.map((d, i) => {
                  const question = typeof d.question === 'string' ? d.question : safeString(d.question);
                  const significance = typeof d.significance === 'string' ? d.significance : '';
                  const sides: any[] = Array.isArray(d.sides) ? d.sides : [];

                  return (
                    <Card key={i}>
                      <CardHeader className="p-3 pb-1">
                        <CardTitle className="text-xs font-semibold leading-snug">{question}</CardTitle>
                        {significance && (
                          <CardDescription className="text-[10px] line-clamp-2">{significance}</CardDescription>
                        )}
                      </CardHeader>
                      {sides.length > 0 && (
                        <CardContent className="px-3 pb-3 pt-0">
                          <div className="grid grid-cols-2 gap-1.5">
                            {sides.map((side: any, j: number) => {
                              const position = typeof side === 'string' ? side : (typeof side?.position === 'string' ? side.position : '');
                              const sideLabel = j === 0 ? 'A' : j === 1 ? 'B' : `${j + 1}`;
                              const labelColor = j === 0 ? 'text-violet-400' : 'text-sky-400';
                              const borderColor = j === 0 ? 'border-violet-500/20 bg-violet-500/5' : 'border-sky-500/20 bg-sky-500/5';

                              return (
                                <div key={j} className={`rounded border p-1.5 ${borderColor}`}>
                                  <p className={`text-[9px] font-semibold uppercase tracking-wide ${labelColor} mb-0.5`}>Side {sideLabel}</p>
                                  <p className="text-[10px] font-medium leading-snug line-clamp-2">{position}</p>
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
        </div>

        {/* Right column: Consensus + Benchmark Warnings */}
        <div className="space-y-4">
          {consensus.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Consensus Findings ({consensus.length})
              </h3>
              <p className="text-[10px] text-muted-foreground mb-2">Confirmed independently by multiple research groups.</p>
              <div className="space-y-1.5">
                {consensus.map((c, i) => {
                  const finding = typeof c.finding === 'string' ? c.finding : safeString(c.finding);
                  const supportingPapers: any[] = Array.isArray(c.supportingPapers) ? c.supportingPapers : [];
                  const caveats: any[] = Array.isArray(c.caveats) ? c.caveats : [];
                  const strength = typeof c.strength === 'string' ? c.strength : '';

                  return (
                    <div key={i} className="rounded-md border border-border bg-card px-3 py-2 space-y-1">
                      <div className="flex items-start gap-2">
                        <span className="shrink-0 mt-0.5 text-emerald-400 text-xs font-bold">✓</span>
                        <div className="space-y-0.5 flex-1 min-w-0">
                          <p className="text-xs font-medium leading-snug">{finding}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {supportingPapers.length > 0
                              ? `${supportingPapers.length} paper${supportingPapers.length === 1 ? '' : 's'}`
                              : ''}
                            {strength ? ` · ${strength}` : ''}
                          </p>
                          {caveats.length > 0 && (
                            <p className="text-[10px] text-amber-400/80">
                              ⚠ {caveats.slice(0, 1).map((caveat: any) =>
                                typeof caveat === 'string' ? caveat : safeString(caveat)
                              ).join('')}
                              {caveats.length > 1 ? ` +${caveats.length - 1} more` : ''}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {warnings.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Benchmark Warnings ({warnings.length})
              </h3>
              <p className="text-[10px] text-muted-foreground mb-2">Papers whose reported results may need closer scrutiny.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2">
                {warnings.map((w: any, i: number) => {
                  const issue = typeof w === 'string' ? w : (typeof w?.issue === 'string' ? w.issue : safeString(w));
                  const issueType = typeof w?.issueType === 'string' ? w.issueType : '';
                  const explanation = typeof w?.explanation === 'string' ? w.explanation : '';
                  const paperRef = typeof w?.paper === 'string' ? w.paper : (typeof w?.paper?.title === 'string' ? w.paper.title : '');
                  const paperRefId: string = typeof w?.paper?.paperId === 'string' ? w.paper.paperId : typeof w?.paper?.id === 'string' ? w.paper.id : '';
                  const issueLabel = warningIssueLabel[issueType] ?? (issueType ? issueType.replace(/_/g, ' ') : '');

                  return (
                    <div
                      key={i}
                      className="rounded-md bg-amber-500/5 border border-amber-500/15 px-3 py-2 space-y-1"
                    >
                      <div className="flex items-start gap-1.5">
                        <span className="shrink-0 text-amber-400 mt-0.5 text-xs">⚠</span>
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-xs font-medium text-amber-300 line-clamp-1">{issue}</p>
                            {issueLabel && (
                              <span className="inline-flex items-center rounded border border-amber-500/30 bg-amber-500/10 px-1 py-0.5 text-[9px] text-amber-400 font-medium shrink-0">
                                {issueLabel}
                              </span>
                            )}
                          </div>
                          {explanation && (
                            <p className="text-[10px] text-muted-foreground line-clamp-2">{explanation}</p>
                          )}
                          {paperRef && (
                            <a
                              href={paperLink(paperRefId || undefined, paperRef)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-muted-foreground/60 hover:text-primary transition-colors underline-offset-2 hover:underline line-clamp-1 block"
                            >
                              — {paperRef}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Benchmark tables — full width below columns */}
      {benchmarkTables.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Benchmarks
          </h3>
          <div className="space-y-3">
            {benchmarkTables.map((t: any, i: number) => (
              <BenchmarkTable key={i} table={t} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
