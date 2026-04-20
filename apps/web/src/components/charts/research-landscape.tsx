'use client';

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface RadarDataPoint {
  axis: string;       // short label shown on the chart axis
  fullName: string;   // full topic name for the tooltip
  count: number;
}

import { CATEGORIES, SHORT_LABELS, derivePaperCategory } from '@/lib/categories';

interface TooltipPayload {
  payload: RadarDataPoint;
  value: number;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: 'white', border: '1px solid oklch(0.9 0 0)', borderRadius: 8, padding: '8px 12px', fontSize: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
      <div style={{ fontWeight: 600, color: '#1f2937' }}>{d.fullName}</div>
      <div style={{ color: '#6b7280', marginTop: 2 }}>{d.count} paper{d.count === 1 ? '' : 's'}</div>
    </div>
  );
}

export function ResearchLandscape({ papers }: { papers: any[] }) {
  if (!papers || papers.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
        No landscape data
      </div>
    );
  }

  // Count papers per canonical topic
  const counts: Record<string, number> = {};
  for (const cat of CATEGORIES) counts[cat] = 0;
  for (const p of papers) {
    const cat = derivePaperCategory(p);
    counts[cat] = (counts[cat] ?? 0) + 1;
  }

  // Build data preserving canonical order so axes are always identical
  const data: RadarDataPoint[] = CATEGORIES.map((cat) => ({
    axis: SHORT_LABELS[cat],
    fullName: cat,
    count: counts[cat] ?? 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={320}>
      <RadarChart data={data} cx="50%" cy="50%" outerRadius="72%">
        <PolarGrid stroke="oklch(0.85 0 0)" />
        <PolarAngleAxis
          dataKey="axis"
          tick={{ fontSize: 11, fill: 'oklch(0.4 0 0)' }}
        />
        <PolarRadiusAxis
          tick={{ fontSize: 9, fill: 'oklch(0.6 0 0)' }}
          axisLine={false}
        />
        <Radar
          name="Papers"
          dataKey="count"
          stroke="#6366f1"
          fill="#6366f1"
          fillOpacity={0.18}
          strokeWidth={2}
          dot={{ r: 3, fill: '#6366f1', stroke: 'white', strokeWidth: 1.5 }}
        />
        <Tooltip content={<CustomTooltip />} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
