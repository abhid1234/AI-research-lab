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

// Canonicalize agent-generated topic names into a small stable bucket set.
// The trend-mapper agent runs per-batch and invents many overlapping names
// (e.g., "RAG", "Retrieval-Augmented Generation (RAG)", "RAG and Knowledge
// Grounding") — we collapse them into a handful of canonical topics so the
// chart shows real signal instead of dozens of near-duplicate lines.
function canonicalizeTopic(raw: string): string {
  const t = raw.toLowerCase();
  if (t.includes('multi-agent') || t.includes('agent') || t.includes('tool use') || (t.includes('agent') && t.includes('coordinat'))) return 'LLM Agents';
  if (t.includes('rag') || t.includes('retriev')) return 'RAG & Retrieval';
  if (t.includes('multimodal') || t.includes('vision') || t.includes('vlm') || t.includes('mllm') || t.includes('lvlm') || t.includes('image') || t.includes('video')) return 'Vision/Multimodal';
  if (t.includes('reason') || t.includes('chain-of-thought') || t.includes('cot') || t.includes('mathematical') || t.includes('math')) return 'Reasoning & CoT';
  if (t.includes('safe') || t.includes('align') || t.includes('jailbreak') || t.includes('deception') || t.includes('trust') || t.includes('security')) return 'Safety';
  if (t.includes('code') || t.includes('program')) return 'Code';
  if (t.includes('rlhf') || t.includes('rlvr') || t.includes('grpo') || t.includes('reinforcement learning') || t.includes('dpo') || t.includes('preference')) return 'RL & Preference';
  if (t.includes('benchmark') || t.includes('evaluation') || t.includes('contamination')) return 'Evaluation';
  if (t.includes('scaling') || t.includes('mixture of experts') || t.includes('moe') || t.includes('efficient') || t.includes('inference')) return 'Scaling/Efficiency';
  if (t.includes('fine-tun') || t.includes('lora') || t.includes('peft') || t.includes('instruction')) return 'Fine-tuning';
  if (t.includes('medical') || t.includes('healthcare')) return 'Medical/Domain';
  return 'Other';
}

interface CanonicalSeries {
  topic: string;
  timeline: TimelinePoint[];
  momentum?: string;
  signal?: string;
}

function consolidateSeries(series: TopicSeries[]): CanonicalSeries[] {
  // bucket -> month -> summed count
  const buckets = new Map<string, Map<string, number>>();
  // bucket -> momentum (most common, prefer "accelerating" if any)
  const momentums = new Map<string, string[]>();

  for (const s of series) {
    const canon = canonicalizeTopic(s.topic ?? '');
    if (!buckets.has(canon)) {
      buckets.set(canon, new Map());
      momentums.set(canon, []);
    }
    const monthMap = buckets.get(canon)!;
    for (const pt of s.timeline ?? []) {
      monthMap.set(pt.month, (monthMap.get(pt.month) ?? 0) + (pt.count ?? 0));
    }
    if (s.momentum) momentums.get(canon)!.push(s.momentum);
  }

  const result: CanonicalSeries[] = [];
  for (const [topic, monthMap] of buckets) {
    const timeline = Array.from(monthMap.entries())
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));
    if (timeline.length === 0) continue;

    const momentumList = momentums.get(topic) ?? [];
    const momentum = momentumList.includes('accelerating')
      ? 'accelerating'
      : momentumList.includes('emerging')
        ? 'emerging'
        : momentumList[0];

    result.push({ topic, timeline, momentum });
  }

  // Sort by total volume so the biggest topics get drawn first / show in legend
  return result
    .map((s) => ({
      ...s,
      _total: s.timeline.reduce((a, b) => a + b.count, 0),
    }))
    .sort((a, b) => (b as any)._total - (a as any)._total)
    .slice(0, 8) // cap at 8 lines so chart stays readable
    .map(({ _total, ...s }: any) => s);
}

function mergeTimelines(series: CanonicalSeries[]): Record<string, number | string>[] {
  const monthMap: Record<string, Record<string, number>> = {};
  for (const s of series) {
    for (const pt of s.timeline) {
      if (!monthMap[pt.month]) monthMap[pt.month] = {};
      monthMap[pt.month][s.topic] = (monthMap[pt.month][s.topic] ?? 0) + pt.count;
    }
  }
  return Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, counts]) => ({ month, ...counts }));
}

export function TopicEvolutionChart({ data: rawData }: TopicEvolutionProps) {
  if (!rawData || rawData.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        No topic evolution data yet
      </div>
    );
  }

  // Collapse the agent's noisy topic names into stable canonical buckets
  const data = consolidateSeries(rawData);
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
            cursor={{ stroke: 'oklch(0.85 0 0)', strokeWidth: 1 }}
            content={({ active, payload, label }) => {
              if (!active || !payload || payload.length === 0) return null;
              // Sort by value descending, hide zeros
              const items = payload
                .map((p) => ({
                  name: String(p.name ?? p.dataKey ?? ''),
                  value: Number(p.value ?? 0),
                  color: String(p.color ?? p.stroke ?? '#999'),
                }))
                .filter((p) => p.value > 0)
                .sort((a, b) => b.value - a.value);
              if (items.length === 0) return null;
              const total = items.reduce((s, p) => s + p.value, 0);
              return (
                <div className="rounded-md border border-border bg-popover/95 backdrop-blur-sm shadow-md text-[11px] min-w-[160px] max-w-[220px]">
                  <div className="px-2.5 py-1.5 border-b border-border/60 flex items-baseline justify-between gap-2">
                    <span className="font-semibold text-foreground tabular-nums">{label}</span>
                    <span className="text-muted-foreground tabular-nums">{total} papers</span>
                  </div>
                  <div className="px-2.5 py-1.5 space-y-0.5">
                    {items.map((p) => (
                      <div key={p.name} className="flex items-center gap-2 leading-tight">
                        <span
                          className="h-1.5 w-1.5 rounded-full shrink-0"
                          style={{ background: p.color }}
                        />
                        <span className="flex-1 truncate text-foreground/80">{p.name}</span>
                        <span className="font-medium tabular-nums text-foreground">{p.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: '12px' }}
            content={() => (
              <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-2 px-2">
                {data.map((s, i) => {
                  const momentumIcon =
                    s.momentum === 'accelerating' ? '↑' :
                    s.momentum === 'declining' ? '↓' :
                    s.momentum === 'emerging' ? '★' : '';
                  const momentumColor =
                    s.momentum === 'accelerating' ? 'text-emerald-500' :
                    s.momentum === 'declining' ? 'text-rose-500' :
                    s.momentum === 'emerging' ? 'text-amber-500' : '';
                  return (
                    <span key={s.topic} className="flex items-center gap-1 text-[11px]">
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ background: COLORS[i % COLORS.length] }}
                      />
                      <span className="text-foreground/70">{s.topic}</span>
                      {momentumIcon && (
                        <span className={`text-[9px] font-bold ${momentumColor}`}>{momentumIcon}</span>
                      )}
                    </span>
                  );
                })}
              </div>
            )}
          />
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
