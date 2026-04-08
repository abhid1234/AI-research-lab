'use client';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BenchmarkTable } from '@/components/charts/benchmark-table';

interface InsightsTabProps {
  artifacts: { agentType: string; data: any }[];
}

const natureBadgeClass: Record<string, string> = {
  direct: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  indirect: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  methodological: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  contextual: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
};

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
    <div className="space-y-6">
      {/* Contradictions */}
      {contradictions.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Contradictions ({contradictions.length})
          </h3>
          <div className="space-y-3">
            {contradictions.map((c, i) => (
              <Card key={i}>
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${natureBadgeClass[c.nature] ?? 'bg-muted text-muted-foreground'}`}
                    >
                      {c.nature ?? 'contradiction'}
                    </span>
                    {c.importance && (
                      <span className="text-xs text-muted-foreground">{c.importance}</span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="rounded-md bg-rose-500/5 border border-rose-500/15 p-3 text-sm">
                      <p className="text-xs text-rose-400 font-medium mb-1">Claim A</p>
                      {c.claim1}
                    </div>
                    <div className="rounded-md bg-blue-500/5 border border-blue-500/15 p-3 text-sm">
                      <p className="text-xs text-blue-400 font-medium mb-1">Claim B</p>
                      {c.claim2}
                    </div>
                  </div>
                  {c.analysis && (
                    <p className="text-xs text-muted-foreground">{c.analysis}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Consensus */}
      {consensus.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Consensus Findings ({consensus.length})
          </h3>
          <div className="space-y-2">
            {consensus.map((c, i) => (
              <Card key={i} size="sm">
                <CardContent className="pt-3 flex items-start gap-3">
                  <span className="shrink-0 mt-0.5 text-emerald-400">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2 7l3.5 3.5L12 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <div>
                    <p className="text-sm">{c.finding}</p>
                    {(c.supportingPapers?.length > 0 || c.strength) && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {c.supportingPapers?.length
                          ? `${c.supportingPapers.length} supporting papers`
                          : ''}
                        {c.strength ? ` · strength: ${c.strength}` : ''}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Open Debates */}
      {openDebates.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Open Debates ({openDebates.length})
          </h3>
          <div className="space-y-3">
            {openDebates.map((d, i) => (
              <Card key={i}>
                <CardHeader>
                  <CardTitle className="text-sm">{d.question}</CardTitle>
                  {d.significance && (
                    <CardDescription>{d.significance}</CardDescription>
                  )}
                </CardHeader>
                {d.sides && d.sides.length > 0 && (
                  <CardContent className="flex flex-wrap gap-2">
                    {d.sides.map((side: string, j: number) => (
                      <Badge key={j} variant="outline">{side}</Badge>
                    ))}
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Benchmark warnings */}
      {warnings && warnings.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Benchmark Warnings
          </h3>
          <div className="space-y-2">
            {warnings.map((w: string, i: number) => (
              <div key={i} className="flex gap-2 items-start rounded-md bg-amber-500/5 border border-amber-500/15 px-3 py-2 text-sm text-amber-300">
                <span className="shrink-0 mt-0.5">⚠</span>
                {w}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Benchmark tables */}
      {benchmarkTables.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
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
