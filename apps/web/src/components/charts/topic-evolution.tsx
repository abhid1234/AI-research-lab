'use client';

import {
  AreaChart,
  Area,
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
    <div className="space-y-1">
      <p className="text-[11px] text-muted-foreground px-1">
        Tracked data showing research intensity (API) across key topics
      </p>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <defs>
            {data.map((s, i) => (
              <linearGradient key={s.topic} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.18} />
                <stop offset="95%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.01} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0 0)" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: 'oklch(0.5 0 0)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'oklch(0.5 0 0)' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: 'white',
              border: '1px solid oklch(0.9 0 0)',
              borderRadius: '8px',
              fontSize: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}
            labelStyle={{ color: 'oklch(0.3 0 0)', fontWeight: 600, marginBottom: 4 }}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          {data.map((s, i) => (
            <Area
              key={s.topic}
              type="monotone"
              dataKey={s.topic}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              fill={`url(#grad-${i})`}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
