'use client';

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface PaperPoint {
  x: number;
  y: number;
  label: string;
  cluster: string;
}

const CLUSTER_COLORS = [
  '#6366f1',
  '#22d3ee',
  '#f59e0b',
  '#10b981',
  '#f43f5e',
  '#8b5cf6',
  '#14b8a6',
  '#fb923c',
];

/** Deterministic integer hash from a string + numeric seed */
function hashStr(str: string, seed: number): number {
  let h = seed;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 0x9e3779b9);
    h ^= h >>> 16;
  }
  return h;
}

/** Map a hash to [0, 100] */
function hashToCoord(str: string, seed: number): number {
  const raw = hashStr(str, seed);
  return Math.abs(raw % 1000) / 10; // 0–100
}

/** Derive a cluster label from available paper fields */
function deriveCluster(paper: any): string {
  if (typeof paper.methodology === 'string' && paper.methodology.trim()) {
    // Take first word of methodology to keep clusters manageable
    return paper.methodology.trim().split(/\s+/)[0];
  }
  if (typeof paper.category === 'string' && paper.category.trim()) {
    return paper.category.trim();
  }
  if (Array.isArray(paper.categories) && paper.categories.length > 0) {
    const first = paper.categories[0];
    return typeof first === 'string' ? first : 'Other';
  }
  if (typeof paper.topic === 'string' && paper.topic.trim()) {
    return paper.topic.trim();
  }
  return 'Other';
}

function buildPoints(papers: any[]): { points: PaperPoint[]; clusters: string[] } {
  const clusterSet = new Set<string>();

  const points: PaperPoint[] = papers.map((p) => {
    const id: string =
      typeof p.paperId === 'string' ? p.paperId :
      typeof p.id === 'string' ? p.id :
      JSON.stringify(p).slice(0, 32);

    const title: string =
      typeof p.title === 'string' ? p.title :
      typeof p.mainResult === 'string' ? p.mainResult :
      'Untitled';

    const cluster = deriveCluster(p);
    clusterSet.add(cluster);

    return {
      x: Math.round(hashToCoord(id, 1) * 10) / 10,
      y: Math.round(hashToCoord(id, 2) * 10) / 10,
      label: title,
      cluster,
    };
  });

  return { points, clusters: Array.from(clusterSet) };
}

interface CustomDotTooltipProps {
  active?: boolean;
  payload?: any[];
}

function CustomTooltip({ active, payload }: CustomDotTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const entry = payload[0]?.payload as PaperPoint | undefined;
  if (!entry) return null;

  return (
    <div
      className="rounded-lg border border-border bg-card px-3 py-2 shadow-md max-w-[240px]"
      style={{ fontSize: 12 }}
    >
      <p className="font-semibold leading-snug text-foreground line-clamp-3">{entry.label}</p>
      <p className="mt-1 text-muted-foreground text-[11px]">Cluster: {entry.cluster}</p>
    </div>
  );
}

export function ResearchLandscape({ papers, activeFilter }: { papers: any[]; activeFilter?: string }) {
  if (!papers || papers.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
        No papers to display
      </div>
    );
  }

  const filteredPapers =
    activeFilter && activeFilter !== 'all'
      ? papers.filter((p) => deriveCluster(p).toLowerCase() === activeFilter.toLowerCase())
      : papers;

  if (filteredPapers.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
        No papers match the selected filter.
      </div>
    );
  }

  const { points, clusters } = buildPoints(filteredPapers);

  // Group points by cluster for separate <Scatter> layers (one per cluster for color coding)
  const byCluster: Record<string, PaperPoint[]> = {};
  for (const pt of points) {
    if (!byCluster[pt.cluster]) byCluster[pt.cluster] = [];
    byCluster[pt.cluster].push(pt);
  }

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex flex-wrap gap-2 px-1">
        {clusters.map((c, i) => (
          <div key={c} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
              style={{ background: CLUSTER_COLORS[i % CLUSTER_COLORS.length] }}
            />
            {c}
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
          <XAxis
            type="number"
            dataKey="x"
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
            tickLine={false}
            axisLine={false}
            label={{ value: 'Semantic Axis A', position: 'insideBottomRight', offset: -5, fontSize: 10, fill: 'var(--muted-foreground)' }}
          />
          <YAxis
            type="number"
            dataKey="y"
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
            tickLine={false}
            axisLine={false}
            label={{ value: 'Semantic Axis B', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10, fill: 'var(--muted-foreground)' }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
          {Object.entries(byCluster).map(([cluster, pts], i) => (
            <Scatter
              key={cluster}
              name={cluster}
              data={pts}
              fill={CLUSTER_COLORS[i % CLUSTER_COLORS.length]}
            >
              {pts.map((_, j) => (
                <Cell
                  key={j}
                  fill={CLUSTER_COLORS[i % CLUSTER_COLORS.length]}
                  fillOpacity={0.8}
                />
              ))}
            </Scatter>
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
