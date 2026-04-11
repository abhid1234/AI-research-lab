'use client';

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
  Cell,
} from 'recharts';

const CATEGORIES = [
  'Agents',
  'Safety',
  'Reasoning',
  'Scaling',
  'Training',
  'Architecture',
  'Retrieval',
  'Multi-Agent',
  'Benchmarks',
] as const;

type Category = (typeof CATEGORIES)[number];

const CATEGORY_COLORS: Record<Category, string> = {
  'Agents': '#6366f1',
  'Safety': '#ef4444',
  'Reasoning': '#f59e0b',
  'Scaling': '#10b981',
  'Training': '#3b82f6',
  'Architecture': '#8b5cf6',
  'Retrieval': '#06b6d4',
  'Multi-Agent': '#ec4899',
  'Benchmarks': '#84cc16',
};

function derivePaperCategory(p: any): Category {
  const text = [
    p.title ?? '',
    p.abstract ?? '',
    p.category ?? '',
    p.topic ?? '',
    ...(Array.isArray(p.categories) ? p.categories : []),
    typeof p.methodology === 'string' ? p.methodology : (p.methodology?.type ?? ''),
    p.problem ?? '',
    p.approach ?? '',
  ]
    .join(' ')
    .toLowerCase();

  if (text.includes('multi-agent') || text.includes('collaborat')) return 'Multi-Agent';
  if (text.includes('agent')) return 'Agents';
  if (text.includes('safe') || text.includes('align')) return 'Safety';
  if (text.includes('reason') || text.includes('chain') || text.includes('cot')) return 'Reasoning';
  if (text.includes('scal')) return 'Scaling';
  if (text.includes('train') || text.includes('fine-tun') || text.includes('rlhf')) return 'Training';
  if (text.includes('architect') || text.includes('transform') || text.includes('attention')) return 'Architecture';
  if (text.includes('retriev') || text.includes('rag') || text.includes('search')) return 'Retrieval';
  if (text.includes('bench') || text.includes('eval') || text.includes('metric')) return 'Benchmarks';
  return 'Agents';
}

function toCategoryIndex(cat: Category): number {
  return CATEGORIES.indexOf(cat);
}

function toDateOrdinal(dateStr: string | null | undefined): number {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

function formatDate(ts: number): string {
  if (!ts) return 'Unknown';
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

interface DataPoint {
  categoryIndex: number;
  category: Category;
  date: number;
  title: string;
  authors: string;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: { payload: DataPoint }[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  return (
    <div
      style={{
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '10px 14px',
        fontSize: '12px',
        maxWidth: '260px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}
    >
      <p style={{ fontWeight: 600, marginBottom: 4, color: '#1a1a1a', lineHeight: 1.4 }}>
        {d.title}
      </p>
      {d.authors && (
        <p style={{ color: '#666', marginBottom: 2 }}>{d.authors}</p>
      )}
      <p style={{ color: d.color, fontWeight: 500 }}>{d.category}</p>
      <p style={{ color: '#999' }}>{formatDate(d.date)}</p>
    </div>
  );
}

interface LegendItemProps {
  category: Category;
  count: number;
}

function LegendItem({ category, count }: LegendItemProps) {
  const color = CATEGORY_COLORS[category];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: color,
          flexShrink: 0,
        }}
      />
      <span style={{ color: '#555' }}>
        {category} <span style={{ color: '#999' }}>({count})</span>
      </span>
    </div>
  );
}

export function CitationGraph({ papers }: { papers: any[] }) {
  if (!papers || papers.length === 0) {
    return (
      <div className="h-[320px] flex items-center justify-center text-muted-foreground text-sm">
        No paper data available for graph.
      </div>
    );
  }

  const points: DataPoint[] = papers.map((p) => {
    const cat = derivePaperCategory(p);
    const authors: any[] = Array.isArray(p.authors) ? p.authors : [];
    const authorStr = authors
      .slice(0, 3)
      .map((a: any) => (typeof a === 'string' ? a : (a?.name ?? '')))
      .filter(Boolean)
      .join(', ');

    return {
      categoryIndex: toCategoryIndex(cat),
      category: cat,
      date: toDateOrdinal(p.publishedAt ?? p.published_at ?? p.submittedDate),
      title: typeof p.title === 'string' ? p.title : 'Untitled',
      authors: authorStr,
      color: CATEGORY_COLORS[cat],
    };
  });

  // Count per category for legend
  const categoryCounts: Partial<Record<Category, number>> = {};
  for (const pt of points) {
    categoryCounts[pt.category] = (categoryCounts[pt.category] ?? 0) + 1;
  }

  const usedCategories = CATEGORIES.filter((c) => (categoryCounts[c] ?? 0) > 0);

  // Date axis ticks
  const validDates = points.map((p) => p.date).filter((d) => d > 0);
  const minDate = validDates.length > 0 ? Math.min(...validDates) : 0;
  const maxDate = validDates.length > 0 ? Math.max(...validDates) : Date.now();

  return (
    <div>
      <ResponsiveContainer width="100%" height={320}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            type="number"
            dataKey="categoryIndex"
            name="Category"
            domain={[-0.5, CATEGORIES.length - 0.5]}
            ticks={usedCategories.map(toCategoryIndex)}
            tickFormatter={(idx: number) => {
              const cat = CATEGORIES[idx];
              return cat ?? '';
            }}
            tick={{ fontSize: 10, fill: '#666' }}
            interval={0}
            label={{ value: 'Research Category', position: 'insideBottom', offset: -18, fontSize: 11, fill: '#888' }}
          />
          <YAxis
            type="number"
            dataKey="date"
            name="Published"
            domain={[minDate, maxDate]}
            tickFormatter={formatDate}
            tick={{ fontSize: 10, fill: '#666' }}
            width={72}
          />
          <ZAxis range={[40, 40]} />
          <Tooltip content={<CustomTooltip />} />
          <Scatter data={points} isAnimationActive={false}>
            {points.map((entry, index) => (
              <Cell key={index} fill={entry.color} fillOpacity={0.75} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px 16px',
          marginTop: 8,
          paddingLeft: 8,
        }}
      >
        {usedCategories.map((cat) => (
          <LegendItem key={cat} category={cat} count={categoryCounts[cat] ?? 0} />
        ))}
      </div>
    </div>
  );
}
