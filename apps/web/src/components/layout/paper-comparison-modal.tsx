'use client';

import { useEffect } from 'react';

interface PaperComparisonModalProps {
  papers: any[];
  onClose: () => void;
}

function escapeText(value: unknown): string {
  if (typeof value === 'string') return value;
  return '';
}

function AuthorList({ authors }: { authors: unknown }) {
  if (!Array.isArray(authors) || authors.length === 0) return <span className="text-[oklch(0.55_0_0)]">—</span>;
  const names = authors
    .map((a) => (typeof a === 'string' ? a : escapeText(a?.name)))
    .filter(Boolean)
    .slice(0, 5);
  return <span>{names.join(', ')}{authors.length > 5 ? ` +${authors.length - 5} more` : ''}</span>;
}

function CategoryList({ categories }: { categories: unknown }) {
  if (!Array.isArray(categories) || categories.length === 0) return <span className="text-[oklch(0.55_0_0)]">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {categories.slice(0, 4).map((cat, i) => (
        <span
          key={i}
          className="text-[9px] px-1.5 py-0.5 rounded bg-[oklch(0.93_0.04_260)] text-[oklch(0.35_0.15_260)]"
        >
          {typeof cat === 'string' ? cat : ''}
        </span>
      ))}
    </div>
  );
}

const ROWS: { label: string; render: (paper: any) => React.ReactNode }[] = [
  {
    label: 'Authors',
    render: (p) => <AuthorList authors={p.authors} />,
  },
  {
    label: 'Date',
    render: (p) => {
      if (!p.publishedAt) return <span className="text-[oklch(0.55_0_0)]">—</span>;
      return <span>{new Date(p.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>;
    },
  },
  {
    label: 'Citations',
    render: (p) => {
      const count = typeof p.citationCount === 'number' ? p.citationCount : null;
      return count !== null
        ? <span className="font-semibold">{count.toLocaleString()}</span>
        : <span className="text-[oklch(0.55_0_0)]">—</span>;
    },
  },
  {
    label: 'Abstract',
    render: (p) => {
      const abstract = escapeText(p.abstract);
      return abstract
        ? <p className="text-xs leading-relaxed line-clamp-6">{abstract}</p>
        : <span className="text-[oklch(0.55_0_0)]">—</span>;
    },
  },
  {
    label: 'Categories',
    render: (p) => <CategoryList categories={p.categories} />,
  },
];

export function PaperComparisonModal({ papers, onClose }: PaperComparisonModalProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  if (papers.length < 2) return null;

  const colWidth = papers.length === 2 ? 'w-1/2' : 'w-1/3';

  return (
    <div
      className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[oklch(0.9_0_0)] shrink-0">
          <h2 className="text-base font-bold text-[oklch(0.145_0_0)]">
            Comparing {papers.length} Papers
          </h2>
          <button
            onClick={onClose}
            aria-label="Close comparison"
            className="p-1.5 rounded-md text-[oklch(0.5_0_0)] hover:text-[oklch(0.145_0_0)] hover:bg-[oklch(0.95_0_0)] transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Scrollable table body */}
        <div className="overflow-y-auto flex-1">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 bg-[oklch(0.97_0_0)] z-10">
              <tr>
                <th className="w-28 px-4 py-3 text-left text-[10px] font-semibold text-[oklch(0.45_0_0)] uppercase tracking-wide border-b border-[oklch(0.9_0_0)]">
                  Field
                </th>
                {papers.map((p, i) => {
                  const title = escapeText(p.title) || `Paper ${i + 1}`;
                  return (
                    <th
                      key={p.id ?? i}
                      className={`${colWidth} px-4 py-3 text-left border-b border-[oklch(0.9_0_0)] border-l border-[oklch(0.92_0_0)]`}
                    >
                      <span className="text-xs font-semibold text-[oklch(0.145_0_0)] leading-snug line-clamp-2 block">
                        {title}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.label} className="even:bg-[oklch(0.985_0_0)]">
                  <td className="px-4 py-3 text-[10px] font-semibold text-[oklch(0.45_0_0)] uppercase tracking-wide align-top whitespace-nowrap border-r border-[oklch(0.92_0_0)]">
                    {row.label}
                  </td>
                  {papers.map((p, i) => (
                    <td
                      key={p.id ?? i}
                      className="px-4 py-3 text-xs text-[oklch(0.25_0_0)] align-top border-l border-[oklch(0.92_0_0)]"
                    >
                      {row.render(p)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
