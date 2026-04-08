'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface TimelinePoint {
  month: string;
  count: number;
}

interface TopicSeries {
  topic: string;
  timeline: TimelinePoint[];
  momentum?: string;
  signal?: string;
}

interface TopicEvolutionProps {
  data: TopicSeries[];
}

const COLORS = [
  '#6366f1', '#22d3ee', '#f59e0b', '#10b981', '#f43f5e',
  '#8b5cf6', '#14b8a6', '#fb923c', '#84cc16', '#ec4899',
];

function mergeTimelines(series: TopicSeries[]): Record<string, number | string>[] {
  const monthMap: Record<string, Record<string, number>> = {};
  for (const s of series) {
    for (const pt of s.timeline) {
      if (!monthMap[pt.month]) monthMap[pt.month] = {};
      monthMap[pt.month][s.topic] = pt.count;
    }
  }
  return Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, counts]) => ({ month, ...counts }));
}

export function TopicEvolutionChart({ data }: TopicEvolutionProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        No topic evolution data yet
      </div>
    );
  }

  const chartData = mergeTimelines(data);

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
        <Tooltip
          contentStyle={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            fontSize: '12px',
          }}
        />
        <Legend wrapperStyle={{ fontSize: '12px' }} />
        {data.map((s, i) => (
          <Line
            key={s.topic}
            type="monotone"
            dataKey={s.topic}
            stroke={COLORS[i % COLORS.length]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
