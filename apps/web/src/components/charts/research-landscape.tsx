'use client';

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';

/**
 * ResearchLandscape renders a 2D "landscape" of papers colored by cluster.
 *
 * Since the API doesn't ship precomputed UMAP coordinates, we do a
 * deterministic pseudo-projection:
 *   1. Classify each paper into a semantic cluster (keyword match).
 *   2. Anchor each cluster at a fixed polar position on the canvas.
 *   3. Jitter each paper around its cluster center using a stable hash of
 *      its ID, so visually-similar papers end up near each other and the
 *      same paper always lands in the same spot across renders.
 *
 * The result reads like a real embedding projection — every cluster is a
 * visible blob of points — without the cost of streaming embeddings to the
 * client.
 */

interface ScatterPoint {
  x: number;
  y: number;
  title: string;
  cluster: string;
}

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

/** Deterministic 32-bit string hash (FNV-1a variant) — stable across renders */
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Map a hash integer to a float in [0, 1) */
function norm(h: number): number {
  return (h % 10000) / 10000;
}

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

/** Project a paper to a (x, y) point anchored near its cluster's center. */
function projectPaper(paper: any, clusterIndex: number, totalClusters: number): ScatterPoint {
  const cluster = CLUSTERS[clusterIndex];

  // Anchor each cluster on a ring around the origin
  const angle = (clusterIndex / totalClusters) * Math.PI * 2;
  const ringRadius = 6;
  const cx = Math.cos(angle) * ringRadius;
  const cy = Math.sin(angle) * ringRadius;

  // Jitter based on a stable hash of the paper identifier so the scatter
  // looks organic but the same paper always lands in the same spot.
  const id = String(paper.id ?? paper.paperId ?? paper.arxivId ?? paper.title ?? '');
  const h1 = hash(id);
  const h2 = hash(id + '::y');

  // Two uniform samples → polar coords for a disc (even distribution, no clumping)
  const r = Math.sqrt(norm(h1)) * 2.4; // max jitter radius ~2.4 units
  const theta = norm(h2) * Math.PI * 2;

  return {
    x: cx + Math.cos(theta) * r,
    y: cy + Math.sin(theta) * r,
    title: paper.title ?? 'Untitled',
    cluster: cluster.id,
  };
}

interface TooltipProps {
  active?: boolean;
  payload?: { payload: ScatterPoint; name?: string }[];
}

function ScatterTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 shadow-md max-w-xs">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {point.cluster}
      </p>
      <p className="text-xs font-medium text-foreground leading-snug mt-0.5 line-clamp-3">
        {point.title}
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

  // Group papers by cluster index, preserving stable ordering
  const clusterPoints: Record<ClusterId, ScatterPoint[]> = Object.fromEntries(
    CLUSTERS.map((c) => [c.id, [] as ScatterPoint[]]),
  ) as Record<ClusterId, ScatterPoint[]>;

  for (const p of papers) {
    const clusterId = classifyPaper(p);
    const clusterIndex = CLUSTERS.findIndex((c) => c.id === clusterId);
    const point = projectPaper(p, clusterIndex, CLUSTERS.length);
    clusterPoints[clusterId].push(point);
  }

  const hasFilter = activeFilter && activeFilter !== 'all';
  const visibleClusters = CLUSTERS.filter((c) => clusterPoints[c.id].length > 0);

  if (hasFilter && visibleClusters.every((c) => c.id.toLowerCase() !== activeFilter!.toLowerCase())) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
        No papers match the selected filter.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ScatterChart margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
        <CartesianGrid stroke="oklch(0.92 0 0)" strokeDasharray="3 3" />
        <XAxis
          type="number"
          dataKey="x"
          domain={[-10, 10]}
          tick={false}
          axisLine={false}
          label={{ value: '', position: 'insideBottom' }}
        />
        <YAxis
          type="number"
          dataKey="y"
          domain={[-10, 10]}
          tick={false}
          axisLine={false}
        />
        <ZAxis type="number" range={[40, 40]} />
        <Tooltip content={<ScatterTooltip />} cursor={{ strokeDasharray: '3 3' }} />
        <Legend
          wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }}
          iconSize={8}
          iconType="circle"
        />
        {visibleClusters.map((cluster) => {
          const dimmed =
            hasFilter && cluster.id.toLowerCase() !== activeFilter!.toLowerCase();
          return (
            <Scatter
              key={cluster.id}
              name={cluster.id}
              data={clusterPoints[cluster.id]}
              fill={cluster.color}
              fillOpacity={dimmed ? 0.15 : 0.75}
              stroke={cluster.color}
              strokeOpacity={dimmed ? 0.3 : 1}
              strokeWidth={1}
            />
          );
        })}
      </ScatterChart>
    </ResponsiveContainer>
  );
}
