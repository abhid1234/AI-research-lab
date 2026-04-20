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

// Categories aligned with our actual ingested topics (and keep "Other" so we
// can see what falls through the keyword classifier).
const CATEGORIES = [
  'Agents',
  'Multi-Agent',
  'Reasoning',
  'Vision/Multimodal',
  'Retrieval',
  'Code',
  'Safety',
  'Training',
  'Scaling',
  'Architecture',
  'Benchmarks',
  'Other',
];

function derivePaperCategory(p: any): string {
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

  // arXiv categories (most reliable signal — check first)
  const arxivCats = (Array.isArray(p.categories) ? p.categories : []).map((c: any) => String(c).toLowerCase());
  if (arxivCats.some((c: string) => c === 'cs.cv' || c === 'cs.mm')) return 'Vision/Multimodal';
  if (arxivCats.some((c: string) => c === 'cs.ma')) return 'Multi-Agent';
  if (arxivCats.some((c: string) => c === 'cs.cr')) return 'Safety';
  if (arxivCats.some((c: string) => c === 'cs.se' || c === 'cs.pl')) return 'Code';

  // Keyword fallback (specific → general, multimodal/vision before generic agent)
  if (text.includes('multimodal') || text.includes('vision-language') || text.includes(' vlm') || text.includes(' mllm') || text.includes('image') || text.includes('video')) return 'Vision/Multimodal';
  if (text.includes('multi-agent') || text.includes('collaborat')) return 'Multi-Agent';
  if (text.includes('retriev') || text.includes(' rag ') || text.includes('rag-') || text.includes('-augmented gen')) return 'Retrieval';
  if (text.includes('code generation') || text.includes('code synthesis') || text.includes('program synthesis') || text.includes(' coder ')) return 'Code';
  if (text.includes('safe') || text.includes('align') || text.includes('jailbreak') || text.includes('red team')) return 'Safety';
  if (text.includes('reason') || text.includes('chain-of-thought') || text.includes(' cot ') || text.includes('mathematical')) return 'Reasoning';
  if (text.includes('agent')) return 'Agents';
  if (text.includes('scaling law') || text.includes(' scaling ') || text.includes('mixture of experts')) return 'Scaling';
  if (text.includes('fine-tun') || text.includes('rlhf') || text.includes(' dpo ') || text.includes('lora') || text.includes('peft')) return 'Training';
  if (text.includes('transformer') || text.includes('attention mechanism') || text.includes('architecture')) return 'Architecture';
  if (text.includes('benchmark') || text.includes('evaluation') || text.includes('leaderboard')) return 'Benchmarks';
  return 'Other';
}

export function ResearchLandscape({ papers }: { papers: any[] }) {
  if (!papers || papers.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
        No landscape data
      </div>
    );
  }

  const categoryCounts: Record<string, number> = {};
  for (const cat of CATEGORIES) categoryCounts[cat] = 0;

  for (const p of papers) {
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
