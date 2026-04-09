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
  category: string;
  count: number;
}

const CATEGORIES = [
  'Agents', 'Safety', 'Reasoning', 'Scaling', 'Training',
  'Architecture', 'Retrieval', 'Multi-Agent', 'Benchmarks',
];

function derivePaperCategory(p: any): string {
  const text = [
    p.category ?? '',
    p.topic ?? '',
    ...(Array.isArray(p.categories) ? p.categories : []),
    typeof p.methodology === 'string' ? p.methodology : p.methodology?.type ?? '',
    p.problem ?? '',
    p.approach ?? '',
  ].join(' ').toLowerCase();

  if (text.includes('multi-agent') || text.includes('collaborat')) return 'Multi-Agent';
  if (text.includes('agent')) return 'Agents';
  if (text.includes('safe') || text.includes('align')) return 'Safety';
  if (text.includes('reason') || text.includes('chain') || text.includes('cot')) return 'Reasoning';
  if (text.includes('scal')) return 'Scaling';
  if (text.includes('train') || text.includes('fine-tun') || text.includes('rlhf')) return 'Training';
  if (text.includes('architect') || text.includes('transform') || text.includes('attention')) return 'Architecture';
  if (text.includes('retriev') || text.includes('rag') || text.includes('search')) return 'Retrieval';
  if (text.includes('bench') || text.includes('eval') || text.includes('metric')) return 'Benchmarks';
  return 'Agents'; // default
}

export function ResearchLandscape({ papers, activeFilter }: { papers: any[]; activeFilter?: string }) {
  if (!papers || papers.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
        No landscape data
      </div>
    );
  }

  const filteredPapers =
    activeFilter && activeFilter !== 'all'
      ? papers.filter((p) => derivePaperCategory(p).toLowerCase() === activeFilter.toLowerCase())
      : papers;

  if (filteredPapers.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
        No papers match the selected filter.
      </div>
    );
  }

  const categoryCounts: Record<string, number> = {};
  for (const cat of CATEGORIES) categoryCounts[cat] = 0;

  for (const p of filteredPapers) {
    const cat = derivePaperCategory(p);
    if (categoryCounts[cat] !== undefined) {
      categoryCounts[cat]++;
    }
  }

  const data: RadarDataPoint[] = CATEGORIES.map((cat) => ({
    category: cat,
    count: categoryCounts[cat],
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
        <PolarGrid stroke="oklch(0.8 0 0)" />
        <PolarAngleAxis
          dataKey="category"
          tick={{ fontSize: 11, fill: 'oklch(0.45 0 0)' }}
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
          fillOpacity={0.15}
          strokeWidth={2}
        />
        <Tooltip
          contentStyle={{
            background: 'white',
            border: '1px solid oklch(0.9 0 0)',
            borderRadius: '8px',
            fontSize: '12px',
          }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
