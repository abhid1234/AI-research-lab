'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

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

interface BarPoint {
  category: Category;
  count: number;
  color: string;
  papers: { title: string; arxivId: string; authors: string }[];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: { payload: BarPoint }[];
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
        maxWidth: '300px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}
    >
      <p style={{ fontWeight: 600, color: d.color, marginBottom: 4, fontSize: '13px' }}>
        {d.category} ({d.count} papers)
      </p>
      {d.papers.slice(0, 3).map((p, i) => (
        <p key={i} style={{ color: '#666', marginBottom: 2, lineHeight: 1.4, fontSize: '11px' }}>
          · {p.title.length > 60 ? `${p.title.slice(0, 60)}…` : p.title}
        </p>
      ))}
      {d.papers.length > 3 && (
        <p style={{ color: '#999', marginTop: 4, fontSize: '10px' }}>
          + {d.papers.length - 3} more papers
        </p>
      )}
    </div>
  );
}

export function CitationGraph({ papers }: { papers: any[] }) {
  if (!papers || papers.length === 0) {
    return (
      <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
        No paper data available.
      </div>
    );
  }

  // Group papers by category
  const grouped: Partial<Record<Category, BarPoint>> = {};
  for (const p of papers) {
    const cat = derivePaperCategory(p);
    if (!grouped[cat]) {
      grouped[cat] = { category: cat, count: 0, color: CATEGORY_COLORS[cat], papers: [] };
    }
    const authors: any[] = Array.isArray(p.authors) ? p.authors : [];
    const authorStr = authors
      .slice(0, 2)
      .map((a: any) => (typeof a === 'string' ? a : (a?.name ?? '')))
      .filter(Boolean)
      .join(', ');
    grouped[cat]!.count += 1;
    grouped[cat]!.papers.push({
      title: typeof p.title === 'string' ? p.title : 'Untitled',
      arxivId: typeof p.arxivId === 'string' ? p.arxivId : (typeof p.id === 'string' ? p.id : ''),
      authors: authorStr,
    });
  }

  // Sort by count descending
  const data = Object.values(grouped)
    .filter((d): d is BarPoint => d != null)
    .sort((a, b) => b.count - a.count);

  if (data.length === 0) {
    return (
      <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
        No categorizable papers.
      </div>
    );
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={Math.max(280, data.length * 32 + 40)}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 30, bottom: 5, left: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 10, fill: '#666' }}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="category"
            tick={{ fontSize: 11, fill: '#444' }}
            width={90}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Total count caption */}
      <p className="text-[10px] text-muted-foreground mt-2 text-right pr-4">
        {papers.length} total papers across {data.length} categories
      </p>
    </div>
  );
}
