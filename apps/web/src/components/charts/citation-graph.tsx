'use client';

import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { CATEGORIES, CATEGORY_COLORS as SHARED_COLORS, derivePaperCategory, type Category } from '@/lib/categories';

// Two-tone fill for bars: a soft pastel body with the saturated border color
// kept available for accents (tooltip header, modal). Lightens the L of the
// canonical border color and reduces chroma so the chart reads editorial
// rather than poster-paint.
function softenOklch(oklch: string): string {
  const m = oklch.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/);
  if (!m) return oklch;
  const L = parseFloat(m[1]);
  const C = parseFloat(m[2]);
  const H = parseFloat(m[3]);
  return `oklch(${Math.min(0.92, L + 0.25).toFixed(2)} ${(C * 0.55).toFixed(3)} ${H})`;
}

const CATEGORY_FILL: Record<Category, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c, softenOklch(SHARED_COLORS[c].border)])
) as Record<Category, string>;
const CATEGORY_BORDER: Record<Category, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c, SHARED_COLORS[c].border])
) as Record<Category, string>;

interface PaperRef {
  title: string;
  arxivId: string;
  authors: string;
  fullPaper: any;
}

interface BarPoint {
  category: Category;
  count: number;
  color: string;       // saturated accent (border)
  fillColor: string;   // soft pastel fill
  papers: PaperRef[];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: { payload: BarPoint }[];
}

function paperUrl(p: PaperRef): string {
  const isRealArxiv = p.arxivId && !p.arxivId.startsWith('demo-') && (p.arxivId.includes('.') || p.arxivId.includes('/'));
  if (isRealArxiv) return `https://arxiv.org/abs/${p.arxivId}`;
  if (p.title) return `https://scholar.google.com/scholar?q=${encodeURIComponent(p.title)}`;
  return '#';
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  return (
    <div
      style={{
        background: 'white',
        border: `1px solid ${d.color}40`,
        borderLeft: `3px solid ${d.color}`,
        borderRadius: '8px',
        padding: '10px 14px',
        fontSize: '12px',
        maxWidth: '320px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
        // Critical: allow pointer events through to the tooltip itself so
        // the user can move the mouse onto the links and click them.
        pointerEvents: 'auto',
      }}
    >
      <p style={{ fontWeight: 600, color: d.color, marginBottom: 6, fontSize: '13px' }}>
        {d.category} <span style={{ color: '#666', fontWeight: 400 }}>· {d.count} papers</span>
      </p>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {d.papers.slice(0, 5).map((p, i) => (
          <li key={i} style={{ marginBottom: 3, lineHeight: 1.35 }}>
            <a
              href={paperUrl(p)}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: '#374151',
                fontSize: '11px',
                textDecoration: 'none',
                borderBottom: '1px solid transparent',
                transition: 'color 120ms, border-color 120ms',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = d.color;
                e.currentTarget.style.borderBottomColor = `${d.color}60`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#374151';
                e.currentTarget.style.borderBottomColor = 'transparent';
              }}
            >
              {p.title.length > 70 ? `${p.title.slice(0, 70)}…` : p.title}
            </a>
          </li>
        ))}
      </ul>
      {d.papers.length > 5 && (
        <p style={{ color: d.color, marginTop: 6, fontSize: '11px', fontWeight: 500 }}>
          Click bar to view all {d.papers.length} →
        </p>
      )}
    </div>
  );
}

export function CitationGraph({ papers }: { papers: any[] }) {
  const [openCategory, setOpenCategory] = useState<BarPoint | null>(null);

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
      grouped[cat] = {
        category: cat,
        count: 0,
        color: CATEGORY_BORDER[cat],
        fillColor: CATEGORY_FILL[cat],
        papers: [],
      };
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
      fullPaper: p,
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
          onClick={(e: any) => {
            // Recharts onClick fires when clicking a bar — payload has the data point
            if (e?.activePayload?.[0]?.payload) {
              setOpenCategory(e.activePayload[0].payload);
            }
          }}
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
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: 'rgba(0,0,0,0.04)' }}
            wrapperStyle={{ pointerEvents: 'auto', outline: 'none' }}
            // Keep tooltip alive briefly so the cursor can travel from the bar
            // onto the tooltip links without flicker-dismissing.
            animationDuration={120}
          />
          <Bar dataKey="count" radius={[0, 6, 6, 0]} cursor="pointer">
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.fillColor}
                stroke={entry.color}
                strokeWidth={1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Total count caption */}
      <p className="text-[10px] text-muted-foreground mt-2 text-right pr-4">
        {papers.length} total papers across {data.length} categories — click any bar to explore
      </p>

      {/* Category papers modal */}
      {openCategory && (
        <CategoryPapersModal
          category={openCategory}
          onClose={() => setOpenCategory(null)}
        />
      )}
    </div>
  );
}

function CategoryPapersModal({ category, onClose }: { category: BarPoint; onClose: () => void }) {
  return (
    <>
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] max-w-[90vw] max-h-[80vh] bg-white rounded-xl shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div
          className="px-5 py-4 border-b border-gray-200 flex items-center justify-between"
          style={{ borderTopLeftRadius: '0.75rem', borderTopRightRadius: '0.75rem' }}
        >
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-sm"
                style={{ background: category.color }}
              />
              <span style={{ color: category.color }}>{category.category}</span>
              <span className="text-gray-500 font-normal">— {category.count} papers</span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              All papers categorized under {category.category}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 p-1 rounded transition-colors"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Paper list */}
        <div className="flex-1 overflow-y-auto">
          <div className="divide-y divide-gray-100">
            {category.papers.map((paper, i) => {
              const isRealArxiv = paper.arxivId && !paper.arxivId.startsWith('demo-') && (paper.arxivId.includes('.') || paper.arxivId.includes('/'));
              const url = isRealArxiv
                ? `https://arxiv.org/abs/${paper.arxivId}`
                : paper.title
                  ? `https://scholar.google.com/scholar?q=${encodeURIComponent(paper.title)}`
                  : '#';

              const date = paper.fullPaper?.publishedAt
                ? new Date(paper.fullPaper.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
                : '';

              return (
                <div key={i} className="px-5 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-gray-400 font-mono mt-0.5 shrink-0 w-6">{i + 1}.</span>
                    <div className="min-w-0 flex-1">
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-foreground hover:underline underline-offset-4 decoration-foreground/40 transition-colors leading-snug block"
                      >
                        {paper.title}
                        <span className="inline-block ml-1 text-foreground/50 text-xs">↗</span>
                      </a>
                      {(paper.authors || date) && (
                        <p className="text-[11px] text-gray-500 mt-1">
                          {paper.authors}
                          {paper.authors && date && ' · '}
                          {date}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
