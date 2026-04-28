'use client';

import { useState } from 'react';
import { Zap, CheckCircle2, HelpCircle, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { safeString, isArxivId } from '@/lib/paper-utils';
import {
  contradictionNatureColors as natureBadgeClass,
  importanceDotColors as importanceDot,
  warningIssueLabels as warningIssueLabel,
} from '@/lib/design-tokens';

interface InsightsTabProps {
  artifacts: { agentType: string; data: any }[];
  dbPapers?: any[];
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

function SectionDivider({ label, count }: { label: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <h3 className="text-caption text-muted-foreground whitespace-nowrap">
        {label}{count != null ? ` (${count})` : ''}
      </h3>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

function ContradictionCard({ c, arxivLink }: { c: any; arxivLink: (id?: string) => string }) {
  const [expanded, setExpanded] = useState(true);

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
    <Card className="h-[420px] flex flex-col" style={{ borderLeftWidth: '4px', borderLeftColor: '#f43f5e' }}>
      <CardContent className="p-3 space-y-2 flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Collapsed header — badge + importance + toggle */}
        <div
          className="flex items-center justify-between gap-2 cursor-pointer shrink-0"
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
            {claim1Statement && (claim1PaperId || claim1Title) ? (
              <a
                href={arxivLink(claim1PaperId || undefined) || undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-muted-foreground line-clamp-2 border-l-2 border-rose-500/30 pl-1.5 hover:text-primary transition-colors hover:underline underline-offset-2"
                onClick={(e) => e.stopPropagation()}
              >
                {claim1Statement}
              </a>
            ) : (
              <p className="text-[10px] text-muted-foreground line-clamp-2 border-l-2 border-rose-500/30 pl-1.5">{claim1Statement}</p>
            )}
            {claim2Statement && (claim2PaperId || claim2Title) ? (
              <a
                href={arxivLink(claim2PaperId || undefined) || undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-muted-foreground line-clamp-2 border-l-2 border-teal-500/30 pl-1.5 hover:text-primary transition-colors hover:underline underline-offset-2"
                onClick={(e) => e.stopPropagation()}
              >
                {claim2Statement}
              </a>
            ) : (
              <p className="text-[10px] text-muted-foreground line-clamp-2 border-l-2 border-teal-500/30 pl-1.5">{claim2Statement}</p>
            )}
          </div>
        )}

        {/* Expanded full analysis */}
        {expanded && (
          <>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 flex-1 min-h-0">
              <div className="rounded-md bg-rose-500/5 border border-rose-500/15 p-2 space-y-1 overflow-hidden flex flex-col">
                <p className="text-[10px] text-rose-400 font-semibold shrink-0">Claim A</p>
                {claim1Statement && (claim1PaperId || claim1Title) ? (
                  <a
                    href={arxivLink(claim1PaperId || undefined) || undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs hover:text-primary transition-colors hover:underline underline-offset-2 block line-clamp-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {claim1Statement}
                  </a>
                ) : (
                  <p className="text-xs line-clamp-3">{claim1Statement}</p>
                )}
                {claim1Title && (
                  <a
                    href={arxivLink(claim1PaperId || undefined) || undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-primary/70 hover:text-primary transition-colors flex items-center gap-1 hover:underline underline-offset-2 shrink-0"
                  >
                    <span>↗</span>
                    <span className="italic line-clamp-1">{claim1Title}</span>
                  </a>
                )}
                {c.claim1?.evidence && (
                  <p className="text-[10px] text-muted-foreground/70 italic line-clamp-3">
                    {typeof c.claim1.evidence === 'string' ? c.claim1.evidence : ''}
                  </p>
                )}
              </div>
              <div className="rounded-md bg-teal-500/5 border border-teal-500/15 p-2 space-y-1 overflow-hidden flex flex-col">
                <p className="text-[10px] text-teal-700 dark:text-teal-400 font-semibold shrink-0">Claim B</p>
                {claim2Statement && (claim2PaperId || claim2Title) ? (
                  <a
                    href={arxivLink(claim2PaperId || undefined) || undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs hover:text-primary transition-colors hover:underline underline-offset-2 block line-clamp-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {claim2Statement}
                  </a>
                ) : (
                  <p className="text-xs line-clamp-3">{claim2Statement}</p>
                )}
                {claim2Title && (
                  <a
                    href={arxivLink(claim2PaperId || undefined) || undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-primary/70 hover:text-primary transition-colors flex items-center gap-1 hover:underline underline-offset-2 shrink-0"
                  >
                    <span>↗</span>
                    <span className="italic line-clamp-1">{claim2Title}</span>
                  </a>
                )}
                {c.claim2?.evidence && (
                  <p className="text-[10px] text-muted-foreground/70 italic line-clamp-3">
                    {typeof c.claim2.evidence === 'string' ? c.claim2.evidence : ''}
                  </p>
                )}
              </div>
            </div>
            {analysis && (
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-6 shrink-0">{analysis}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function buildArxivLink(dbPapers?: any[]) {
  const s2ToArxiv = new Map<string, string>();
  for (const p of dbPapers ?? []) {
    if (p.id && p.arxivId) s2ToArxiv.set(p.id, p.arxivId);
  }
  return (id?: string): string => {
    if (!id) return '';
    if (isArxivId(id)) return `https://arxiv.org/abs/${id}`;
    const arxivId = s2ToArxiv.get(id);
    if (arxivId && isArxivId(arxivId)) return `https://arxiv.org/abs/${arxivId}`;
    return '';
  };
}

export function InsightsTab({ artifacts, dbPapers }: InsightsTabProps) {
  const arxivLink = buildArxivLink(dbPapers);
  const contradictionArtifact = artifacts.find((a) => a.agentType === 'contradiction-finder');
  const benchmarkArtifact = artifacts.find((a) => a.agentType === 'benchmark-extractor');

  const contradictionData = contradictionArtifact?.data ?? {};
  const benchmarkData = benchmarkArtifact?.data ?? {};

  const contradictions: any[] = contradictionData.contradictions ?? [];
  const consensus: any[] = contradictionData.consensus ?? [];
  const openDebates: any[] = contradictionData.openDebates ?? [];
  const warnings: any[] = benchmarkData.warnings ?? [];

  const hasData =
    contradictions.length > 0 ||
    consensus.length > 0 ||
    openDebates.length > 0 ||
    warnings.length > 0;

  if (!hasData) {
    return (
      <EmptyState
        icon={
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        }
        title="No insights yet"
        description="Run an analysis to discover contradictions and consensus."
      />
    );
  }

  return (
    <div className="space-y-3">
      {/* Row 1: Summary bar — color-coded stat tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: 'Contradictions', value: contradictions.length, Icon: Zap, color: '#f43f5e', bg: '#fff1f2', text: '#be123c' },
          { label: 'Consensus', value: consensus.length, Icon: CheckCircle2, color: '#10b981', bg: '#ecfdf5', text: '#047857' },
          { label: 'Open Debates', value: openDebates.length, Icon: HelpCircle, color: '#8b5cf6', bg: '#f5f3ff', text: '#6d28d9' },
          { label: 'Warnings', value: warnings.length, Icon: AlertTriangle, color: '#f59e0b', bg: '#fffbeb', text: '#b45309' },
        ].map((s, i) => (
          <div
            key={i}
            className="rounded-lg px-3 py-2 flex items-center gap-3"
            style={{ background: s.bg, borderLeft: `3px solid ${s.color}` }}
          >
            <s.Icon className="h-5 w-5 shrink-0" style={{ color: s.color }} aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <div className="text-lg font-bold tabular-nums leading-none" style={{ color: s.text }}>{s.value}</div>
              <div className="text-[10px] mt-0.5" style={{ color: s.text, opacity: 0.7 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Row 2: Contradictions — full width, masonry flow */}
      {contradictions.length > 0 && (
        <section>
          <SectionDivider label="Contradictions" count={contradictions.length} />
          <p className="text-[10px] text-muted-foreground mb-2">
            Claims where papers disagree — revealing where the field is still uncertain.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 auto-rows-fr">
            {contradictions.map((c, i) => (
              <ContradictionCard key={i} c={c} arxivLink={arxivLink} />
            ))}
          </div>
        </section>
      )}

      {/* Row 3: Open Debates */}
      {openDebates.length > 0 && (
        <section>
          <SectionDivider label="Open Debates" count={openDebates.length} />
          <p className="text-[10px] text-muted-foreground mb-2">
            Community is actively split on these unresolved questions.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {openDebates.map((d, i) => {
                  const question = typeof d.question === 'string' ? d.question : safeString(d.question);
                  const significance = typeof d.significance === 'string' ? d.significance : '';
                  const sides: any[] = Array.isArray(d.sides) ? d.sides : [];

                  return (
                    <Card key={i} className="flex flex-col" style={{ borderLeftWidth: '4px', borderLeftColor: '#8b5cf6' }}>
                      <CardHeader className="p-3 pb-1 shrink-0">
                        <CardTitle className="text-xs font-semibold leading-snug">{question}</CardTitle>
                        {significance && (
                          <CardDescription className="text-[10px]">{significance}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent className="px-3 pb-3 pt-0 shrink-0">
                        <div className="grid grid-cols-2 gap-1.5">
                          {[sides[0] ?? null, sides[1] ?? null].map((side: any, j: number) => {
                            const sideLabel = j === 0 ? 'A' : 'B';
                            const labelColor = j === 0 ? 'text-amber-700 dark:text-amber-400' : 'text-teal-700 dark:text-teal-400';
                            const borderColor = j === 0 ? 'border-amber-500/20 bg-amber-500/5' : 'border-teal-500/20 bg-teal-500/5';

                            if (!side) {
                              return (
                                <div key={j} className={`rounded border border-dashed border-border p-1.5 opacity-60`}>
                                  <p className={`text-[9px] font-semibold uppercase tracking-wide ${labelColor} mb-0.5`}>Side {sideLabel}</p>
                                  <p className="text-[10px] text-muted-foreground italic">No data available</p>
                                </div>
                              );
                            }

                            const position = typeof side === 'string' ? side : (typeof side?.position === 'string' ? side.position : '');
                            const sidePapers: any[] = Array.isArray(side?.papers) ? side.papers : [];
                            const firstSidePaper = sidePapers.length > 0 ? sidePapers[0] : null;
                            const sidePaperId: string = firstSidePaper
                              ? (typeof firstSidePaper?.paperId === 'string' ? firstSidePaper.paperId : typeof firstSidePaper?.id === 'string' ? firstSidePaper.id : typeof firstSidePaper === 'string' ? firstSidePaper : '')
                              : '';
                            const sidePaperTitle: string = firstSidePaper
                              ? (typeof firstSidePaper === 'string' ? firstSidePaper : firstSidePaper?.title ?? '')
                              : '';

                            return (
                              <div key={j} className={`rounded border p-1.5 ${borderColor}`}>
                                <p className={`text-[9px] font-semibold uppercase tracking-wide ${labelColor} mb-0.5`}>Side {sideLabel}</p>
                                {position && (sidePaperId || sidePaperTitle) ? (
                                  <a
                                    href={arxivLink(sidePaperId || undefined) || undefined}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[10px] font-medium leading-snug line-clamp-2 hover:text-primary transition-colors hover:underline underline-offset-2 block"
                                  >
                                    {position}
                                  </a>
                                ) : (
                                  <p className="text-[10px] font-medium leading-snug line-clamp-2">{position || <span className="italic text-muted-foreground">No position stated</span>}</p>
                                )}
                                {sidePapers.slice(0, 2).map((sp: any, si: number) => {
                                  const spTitle: string = typeof sp === 'string' ? sp : (sp?.title ?? '');
                                  const spId: string = typeof sp?.paperId === 'string' ? sp.paperId : typeof sp?.id === 'string' ? sp.id : '';
                                  return spTitle ? (
                                    <a
                                      key={si}
                                      href={arxivLink(spId || undefined) || undefined}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[9px] text-primary/60 hover:text-primary transition-colors hover:underline underline-offset-2 block mt-0.5 line-clamp-1"
                                    >
                                      ↗ {spTitle}
                                    </a>
                                  ) : null;
                                })}
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
          </div>
        </section>
      )}

      {/* Row 4: Consensus Findings (full width, CSS columns for balance) */}
      {consensus.length > 0 && (
        <section>
          <SectionDivider label="Consensus Findings" count={consensus.length} />
          <p className="text-[10px] text-muted-foreground mb-2">
            Findings confirmed independently by multiple research groups.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 auto-rows-fr">
            {consensus.map((c, i) => {
                  const finding = typeof c.finding === 'string' ? c.finding : safeString(c.finding);
                  const supportingPapers: any[] = Array.isArray(c.supportingPapers) ? c.supportingPapers : [];
                  const caveats: any[] = Array.isArray(c.caveats) ? c.caveats : [];
                  const strength = typeof c.strength === 'string' ? c.strength : '';

                  const firstSP = supportingPapers.length > 0 ? supportingPapers[0] : null;
                  const firstSPId: string = firstSP
                    ? (typeof firstSP?.paperId === 'string' ? firstSP.paperId : typeof firstSP?.id === 'string' ? firstSP.id : '')
                    : '';
                  const firstSPTitle: string = firstSP
                    ? (typeof firstSP === 'string' ? firstSP : firstSP?.title ?? '')
                    : '';

                  return (
                    <div
                      key={i}
                      className="rounded-md border border-border bg-emerald-50/30 dark:bg-emerald-950/10 px-3 py-2 space-y-1 h-[140px] flex flex-col overflow-hidden"
                      style={{ borderLeftWidth: '4px', borderLeftColor: '#10b981' }}
                    >
                      <div className="flex items-start gap-2 flex-1 min-h-0">
                        <CheckCircle2 className="h-3 w-3 shrink-0 mt-0.5 text-emerald-500" aria-hidden="true" />
                        <div className="space-y-0.5 flex-1 min-w-0">
                          {finding && (firstSPId || firstSPTitle) ? (
                            <a
                              href={arxivLink(firstSPId || undefined) || undefined}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-medium leading-snug hover:text-primary transition-colors hover:underline underline-offset-2 block line-clamp-2"
                            >
                              {finding}
                            </a>
                          ) : (
                            <p className="text-xs font-medium leading-snug line-clamp-2">{finding}</p>
                          )}
                          <div className="flex flex-wrap gap-x-1 gap-y-0.5">
                            {supportingPapers.slice(0, 3).map((sp: any, si: number) => {
                              const spTitle: string = typeof sp === 'string' ? sp : (sp?.title ?? '');
                              const spId: string = typeof sp?.paperId === 'string' ? sp.paperId : typeof sp?.id === 'string' ? sp.id : '';
                              return spTitle ? (
                                <a
                                  key={si}
                                  href={arxivLink(spId || undefined) || undefined}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-primary/60 hover:text-primary transition-colors hover:underline underline-offset-2"
                                >
                                  {spTitle}{si < Math.min(supportingPapers.length, 3) - 1 ? ' ·' : ''}
                                </a>
                              ) : null;
                            })}
                            {supportingPapers.length > 3 && (
                              <span className="text-[10px] text-muted-foreground">+{supportingPapers.length - 3} more</span>
                            )}
                            {supportingPapers.length > 0 && supportingPapers.every((sp: any) => !(typeof sp === 'string' ? sp : sp?.title ?? '')) && (
                              <span className="text-[10px] text-muted-foreground">
                                {supportingPapers.length} paper{supportingPapers.length === 1 ? '' : 's'}
                              </span>
                            )}
                          </div>
                          {strength && <p className="text-[10px] text-muted-foreground">{strength}</p>}
                          {caveats.length > 0 && (
                            <p className="text-[10px] text-muted-foreground/80 inline-flex items-start gap-1">
                              <AlertTriangle className="h-2.5 w-2.5 shrink-0 mt-0.5" aria-hidden="true" />
                              <span>
                                {caveats.slice(0, 1).map((caveat: any) =>
                                  typeof caveat === 'string' ? caveat : safeString(caveat)
                                ).join('')}
                                {caveats.length > 1 ? ` +${caveats.length - 1} more` : ''}
                              </span>
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

      {/* Row 4: Warnings (separate row, compact) */}
      {warnings.length > 0 && (
        <section>
          <SectionDivider label="Benchmark Warnings" count={warnings.length} />
          <p className="text-[10px] text-muted-foreground mb-2">
            Papers whose reported results may need closer scrutiny.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 auto-rows-fr">
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
                      className="rounded-md bg-amber-50/60 dark:bg-amber-950/20 border border-amber-300/40 dark:border-amber-800/30 px-3 py-2 space-y-1 h-[140px] flex flex-col overflow-hidden"
                      style={{ borderLeftWidth: '4px', borderLeftColor: '#f59e0b' }}
                    >
                      <div className="flex items-start gap-1.5 flex-1 min-h-0">
                        <AlertTriangle className="h-3 w-3 shrink-0 text-amber-600 dark:text-amber-500 mt-0.5" aria-hidden="true" />
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {issue && (paperRefId || paperRef) ? (
                              <a
                                href={arxivLink(paperRefId || undefined) || undefined}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-semibold text-orange-900 dark:text-amber-300 line-clamp-1 hover:text-orange-700 dark:hover:text-amber-200 transition-colors hover:underline underline-offset-2"
                              >
                                {issue}
                              </a>
                            ) : (
                              <p className="text-xs font-semibold text-orange-900 dark:text-amber-300 line-clamp-1">{issue}</p>
                            )}
                            {issueLabel && (
                              <span className="inline-flex items-center rounded border border-orange-500/40 bg-orange-100/60 dark:bg-amber-900/20 px-1 py-0.5 text-[9px] text-orange-800 dark:text-amber-400 font-medium shrink-0">
                                {issueLabel}
                              </span>
                            )}
                          </div>
                          {explanation && (
                            <p className="text-[10px] text-muted-foreground line-clamp-2">{explanation}</p>
                          )}
                          {paperRef && (
                            <a
                              href={arxivLink(paperRefId || undefined) || undefined}
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
  );
}
