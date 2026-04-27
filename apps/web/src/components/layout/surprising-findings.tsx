'use client';

import { Zap } from 'lucide-react';

interface SurprisingFindingsProps {
  frontiers: any[];
}

export function SurprisingFindings({ frontiers }: SurprisingFindingsProps) {
  // Filter to controversial findings
  const surprising = frontiers
    .filter((f) => typeof f.confidence === 'number' && f.confidence < 0.7)
    .sort((a, b) => (a.confidence ?? 0) - (b.confidence ?? 0))
    .slice(0, 5);

  if (surprising.length === 0) return null;

  return (
    <div className="rounded-lg border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent p-4">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="h-4 w-4 text-amber-500" aria-hidden="true" />
        <h3 className="text-sm font-bold text-foreground">Surprising / Controversial Findings</h3>
        <span className="text-[10px] text-muted-foreground ml-auto">Lower confidence = more debate-worthy</span>
      </div>
      <div className="space-y-2">
        {surprising.map((f, i) => {
          const finding = typeof f.finding === 'string' ? f.finding : '';
          const explanation = typeof f.explanation === 'string' ? f.explanation : '';
          const confidence = typeof f.confidence === 'number' ? f.confidence : 0;
          return (
            <div key={i} className="rounded-md bg-card p-3 border border-border">
              <div className="flex items-start gap-2">
                <span className="text-xs font-mono text-amber-600 shrink-0 mt-0.5">{Math.round(confidence * 100)}%</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground leading-snug">{finding}</p>
                  {explanation && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{explanation}</p>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
