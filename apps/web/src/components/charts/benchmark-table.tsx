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
              <TableCell className="font-medium">{entry.model}</TableCell>
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
