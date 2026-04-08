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

function ModelBadge({ name, index }: { name: string; index: number }) {
  const colorClass = MODEL_BADGE_COLORS[index % MODEL_BADGE_COLORS.length];
  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${colorClass}`}
        aria-hidden="true"
      >
        ●
      </span>
      <span className="font-medium">{name}</span>
    </div>
  );
}

function ScoreCell({ value }: { value: number | string }) {
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  if (isNaN(num)) {
    return <span className="text-muted-foreground">{String(value)}</span>;
  }
  const color =
    num >= 80 ? 'text-emerald-400' :
    num >= 60 ? 'text-amber-400' :
    'text-rose-400';
  return <span className={`font-medium tabular-nums ${color}`}>{num.toFixed(1)}</span>;
}

export function BenchmarkTable({ table }: { table: BenchmarkTableData }) {
  if (!table.entries || table.entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No benchmark entries</p>;
  }

  const scoreKeys = table.entries.length > 0
    ? Object.keys(table.entries[0].scores)
    : [];

  return (
    <div className="rounded-lg overflow-hidden ring-1 ring-foreground/10">
      <div className="px-4 py-2 bg-muted/50 border-b border-border text-sm font-medium">
        {table.benchmarkName}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Model</TableHead>
            {scoreKeys.map((k) => (
              <TableHead key={k}>{k}</TableHead>
            ))}
            <TableHead>Conditions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {table.entries.map((entry, i) => (
            <TableRow key={i}>
              <TableCell>
                <ModelBadge name={entry.model} index={i} />
              </TableCell>
              {scoreKeys.map((k) => (
                <TableCell key={k}>
                  <ScoreCell value={entry.scores[k]} />
                </TableCell>
              ))}
              <TableCell className="text-muted-foreground text-xs">
                {entry.conditions ?? '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
