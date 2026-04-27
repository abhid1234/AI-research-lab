'use client';

import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { paperLink } from '@/lib/paper-utils';

interface SOTAEntry {
  task: string;
  benchmark: string;
  currentBest: { model: string; score: number; paper?: { id?: string; title?: string } };
  previousBest?: { model: string; score: number; paper?: { id?: string; title?: string } } | null;
  improvement: string;
}

export function SOTATable({ entries }: { entries: SOTAEntry[] }) {
  if (!entries || entries.length === 0) return null;

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground">State of the Art</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Current best results across benchmarks, extracted from analyzed papers
        </p>
      </div>
      <div className="rounded-lg ring-1 ring-foreground/10 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Task</TableHead>
                <TableHead className="text-xs">Benchmark</TableHead>
                <TableHead className="text-xs">Current Best</TableHead>
                <TableHead className="text-xs text-right">Score</TableHead>
                <TableHead className="text-xs">Previous Best</TableHead>
                <TableHead className="text-xs">Improvement</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry, i) => {
                const currentPaperId = entry.currentBest?.paper?.id ?? '';
                const previousPaperId = entry.previousBest?.paper?.id ?? '';

                return (
                  <TableRow key={i}>
                    <TableCell className="text-xs font-medium">{entry.task}</TableCell>
                    <TableCell>
                      <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
                        {entry.benchmark}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                        {(() => {
                          const href = paperLink(currentPaperId || undefined, entry.currentBest.model);
                          return href ? (
                            <a
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-medium hover:text-primary transition-colors underline-offset-2 hover:underline"
                            >
                              {entry.currentBest.model}
                            </a>
                          ) : (
                            <span className="text-xs font-medium">{entry.currentBest.model}</span>
                          );
                        })()}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-xs font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                        {typeof entry.currentBest.score === 'number'
                          ? entry.currentBest.score.toFixed(1)
                          : entry.currentBest.score}
                      </span>
                    </TableCell>
                    <TableCell>
                      {entry.previousBest ? (
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-muted-foreground/40 shrink-0" />
                          {(() => {
                            const href = paperLink(previousPaperId || undefined, entry.previousBest!.model);
                            const inner = (
                              <>
                                {entry.previousBest!.model}
                                {typeof entry.previousBest!.score === 'number' && (
                                  <span className="ml-1 tabular-nums">({entry.previousBest!.score.toFixed(1)})</span>
                                )}
                              </>
                            );
                            return href ? (
                              <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-muted-foreground hover:text-primary transition-colors underline-offset-2 hover:underline"
                              >
                                {inner}
                              </a>
                            ) : (
                              <span className="text-xs text-muted-foreground">{inner}</span>
                            );
                          })()}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded font-medium">
                        {entry.improvement}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
