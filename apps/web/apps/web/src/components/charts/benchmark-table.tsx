'use client';

import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';

interface BenchmarkEntry {
  model: string;
  scores: Record<string, number | string>;
  conditions?: string;
}

interface BenchmarkTableData {
  benchmarkName: string;
  entries: BenchmarkEntry[];
}

const MODEL_BADGE_COLORS = [
  'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'bg-teal-500/20 text-teal-400 border-teal-500/30',
  'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'bg-pink-500/20 text-pink-400 border-pink-500/30',
] as const;

function ModelBadge({ name, index, conditions }: { name: string; index: number; conditions?: string }) {
  const colorClass = MODEL_BADGE_COLORS[index % MODEL_BADGE_COLORS.length];
  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${colorClass}`}
        aria-hidden="true"
      >
        ●
      </span>
      <div>
        <span className="font-medium">{name}</span>
        {conditions && (
          <span className="block text-[10px] text-muted-foreground mt-0.5">{conditions}</span>
        )}
      </div>
    </div>
  );
}

function ScoreCell({ value }: { value: number | string }) {
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  if (isNaN(num)) {
    return <span className="text-muted-foreground">{String(value)}</span>;
  }
  const barColor =
    num >= 80 ? 'bg-emerald-500' :
    num >= 60 ? 'bg-amber-500' :
    'bg-rose-500';
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs tabular-nums w-10 text-right">{num.toFixed(1)}</span>
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor}`}
          style={{ width: `${Math.min(num, 100)}%` }}
        />
      </div>
    </div>
  );
}

export function BenchmarkTable({ table }: { table: BenchmarkTableData }) {
  if (!table.entries || table.entries.length === 0) {
    return null; // Don't show empty tables
  }

  // Collect ALL score keys across all entries (not just first)
  const scoreKeySet = new Set<string>();
  for (const entry of table.entries) {
    if (entry.scores && typeof entry.scores === 'object') {
      for (const k of Object.keys(entry.scores)) {
        scoreKeySet.add(k);
      }
    }
  }
  const scoreKeys = Array.from(scoreKeySet);
  const hasScores = scoreKeys.length > 0;

  return (
    <div className="rounded-lg ring-1 ring-foreground/10">
      <div className="px-4 py-2 bg-muted/50 border-b border-border text-sm font-medium">
        {table.benchmarkName}
      </div>
      <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Model</TableHead>
            {hasScores ? (
              scoreKeys.map((k) => (
                <TableHead key={k}>{k}</TableHead>
              ))
            ) : (
              <TableHead>Details</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {table.entries.map((entry, i) => (
            <TableRow key={i}>
              <TableCell>
                <ModelBadge name={entry.model} index={i} conditions={hasScores ? entry.conditions : undefined} />
              </TableCell>
              {hasScores ? (
                scoreKeys.map((k) => (
                  <TableCell key={k}>
                    {entry.scores[k] != null ? (
                      <ScoreCell value={entry.scores[k]} />
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                ))
              ) : (
                <TableCell>
                  <span className="text-xs text-muted-foreground">{entry.conditions ?? '—'}</span>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>
    </div>
  );
}
