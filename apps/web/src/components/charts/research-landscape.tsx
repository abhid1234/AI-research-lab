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

/**
 * ResearchLandscape renders a spider/radar chart showing the distribution
 * of papers across research clusters. Each axis is a category; the filled
 * polygon shows concentration at a glance.
 */

const CLUSTERS = [
  { id: 'Agents',       color: '#3b82f6' },
  { id: 'Multi-Agent',  color: '#8b5cf6' },
  { id: 'Safety',       color: '#f43f5e' },
  { id: 'Reasoning',    color: '#10b981' },
  { id: 'Scaling',      color: '#f59e0b' },
  { id: 'Training',     color: '#06b6d4' },
  { id: 'Architecture', color: '#ec4899' },
  { id: 'Retrieval',    color: '#84cc16' },
  { id: 'Benchmarks',   color: '#eab308' },
] as const;

type ClusterId = typeof CLUSTERS[number]['id'];

function classifyPaper(p: any): ClusterId {
  const text = [
    p.title ?? '',
    p.abstract ?? '',
    p.category ?? '',
    p.topic ?? '',
    ...(Array.isArray(p.categories) ? p.categories : []),
    typeof p.methodology === 'string' ? p.methodology : p.methodology?.type ?? '',
    p.problem ?? '',
    p.approach ?? '',
  ].join(' ').toLowerCase();

  if (text.includes('multi-agent') || text.includes('collaborat')) return 'Multi-Agent';
  if (text.includes('safe') || text.includes('align') || text.includes('rlhf')) return 'Safety';
  if (text.includes('reason') || text.includes('chain') || text.includes('cot')) return 'Reasoning';
  if (text.includes('scal')) return 'Scaling';
  if (text.includes('train') || text.includes('fine-tun') || text.includes('lora')) return 'Training';
  if (text.includes('architect') || text.includes('transform') || text.includes('attention')) return 'Architecture';
  if (text.includes('retriev') || text.includes('rag') || text.includes('search')) return 'Retrieval';
  if (text.includes('bench') || text.includes('eval') || text.includes('metric')) return 'Benchmarks';
  if (text.includes('agent')) return 'Agents';
  return 'Agents';
}

interface RadarPoint {
  category: string;
  count: number;
  fullMark: number;
}

interface TooltipProps {
  active?: boolean;
  payload?: { value: number; name: string; payload: RadarPoint }[];
}

function RadarTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 shadow-md">
      <p className="text-xs font-semibold text-foreground">{point.category}</p>
      <p className="text-[11px] text-muted-foreground tabular-nums">
        {point.count} paper{point.count !== 1 ? 's' : ''}
      </p>
    </div>
  );
}

export function ResearchLandscape({
  papers,
  activeFilter,
}: {
  papers: any[];
  activeFilter?: string;
}) {
  if (!papers || papers.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
        No landscape data
      </div>
    );
  }

  // Count papers per cluster
  const counts: Record<ClusterId, number> = {} as Record<ClusterId, number>;
  for (const c of CLUSTERS) counts[c.id] = 0;

  for (const p of papers) {
    const cluster = classifyPaper(p);
    counts[cluster]++;
  }

  const maxCount = Math.max(...Object.values(counts), 1);

  const data: RadarPoint[] = CLUSTERS.map((c) => ({
    category: c.id,
    count: counts[c.id],
    fullMark: maxCount,
  }));

  // Determine if a filter is active so we can dim the polygon
  const hasFilter = activeFilter && activeFilter !== 'all';

  // Use primary blue for the main polygon, with a highlight ring if filtered
  const primaryColor = '#3b82f6';

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data} cx="50%" cy="50%" outerRadius="72%">
        <PolarGrid
          stroke="oklch(0.88 0 0)"
          strokeDasharray="2 2"
        />
        <PolarAngleAxis
          dataKey="category"
          tick={{
            fontSize: 10,
            fill: 'oklch(0.4 0 0)',
            fontWeight: 500,
          }}
        />
        <PolarRadiusAxis
          tick={{ fontSize: 9, fill: 'oklch(0.6 0 0)' }}
          axisLine={false}
          tickCount={4}
        />
        <Radar
          name="Papers"
          dataKey="count"
          stroke={primaryColor}
          fill={primaryColor}
          fillOpacity={hasFilter ? 0.08 : 0.18}
          strokeWidth={2}
          strokeOpacity={hasFilter ? 0.3 : 1}
          dot={{
            r: 3,
            fill: primaryColor,
            strokeWidth: 0,
            fillOpacity: hasFilter ? 0.3 : 0.9,
          }}
          activeDot={{
            r: 5,
            fill: primaryColor,
            stroke: 'white',
            strokeWidth: 2,
          }}
        />
        {/* No second overlay — the main polygon + active dot handles highlighting */}
        <Tooltip content={<RadarTooltip />} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
