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

const CATEGORY_SET: Set<string> = new Set(CATEGORIES);

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

  // Count papers per canonical topic.
  //
  // Strategy:
  //   1. Trust topic_papers membership FIRST — that's the DB truth from
  //      the ingestion pipeline. A paper in N topics counts in N bars.
  //   2. ONLY for papers without ANY content-topic membership (e.g., HF
  //      backfill papers tagged only "All AI Papers" / "HuggingFace Trending")
  //      fall back to keyword detection.
  //
  // This avoids the previous bug where keyword detection over-claimed
  // ("reason" matches ~80% of all AI abstracts).
  const counts: Record<string, number> = {};
  for (const cat of CATEGORIES) counts[cat] = 0;

  for (const p of papers) {
    const topics: string[] = Array.isArray(p?.topics) ? p.topics : [];
    // Filter to canonical content topics only (skip "All AI Papers", "HuggingFace Trending")
    const explicitTopics = topics.filter((t) => CATEGORY_SET.has(t));

    if (explicitTopics.length > 0) {
      // DB truth — count once per matched membership
      for (const t of explicitTopics) counts[t] = (counts[t] ?? 0) + 1;
    } else {
      // No content-topic membership → fall back to single best-match category
      // (NOT the multi-category union, which over-counts orphan papers)
      const cat = derivePaperCategory(p);
      counts[cat] = (counts[cat] ?? 0) + 1;
    }
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
        <PolarGrid stroke="var(--hairline)" />
        <PolarAngleAxis
          dataKey="axis"
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
        />
        <PolarRadiusAxis
          tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }}
          axisLine={false}
        />
        <Radar
          name="Papers"
          dataKey="count"
          stroke="var(--chart-1)"
          fill="var(--chart-1)"
          fillOpacity={0.18}
          strokeWidth={2}
          dot={{ r: 3, fill: 'var(--chart-1)', stroke: 'var(--background)', strokeWidth: 1.5 }}
        />
        <Tooltip content={<CustomTooltip />} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
