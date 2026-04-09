'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PaperDrawerProps {
  papers: any[];
  open: boolean;
  onClose: () => void;
}

export function PaperDrawer({ papers, open, onClose }: PaperDrawerProps) {
  const [search, setSearch] = useState('');

  if (!open) return null;

  const filtered = search.trim()
    ? papers.filter((p) => {
        const q = search.toLowerCase();
        const title = typeof p.title === 'string' ? p.title : '';
        const abstract = typeof p.abstract === 'string' ? p.abstract : '';
        return title.toLowerCase().includes(q) || abstract.toLowerCase().includes(q);
      })
    : papers;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div className="fixed top-0 right-0 h-full w-[480px] max-w-[90vw] bg-white border-l border-[oklch(0.9_0_0)] shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[oklch(0.9_0_0)]">
          <div>
            <h2 className="text-base font-bold text-[oklch(0.145_0_0)]">
              All Papers ({papers.length})
            </h2>
            <p className="text-xs text-[oklch(0.45_0_0)] mt-0.5">
              Click a paper title to view on arxiv
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-[oklch(0.45_0_0)]">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </Button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-[oklch(0.9_0_0)]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search papers..."
            className="w-full px-3 py-1.5 text-sm rounded-md bg-[oklch(0.97_0_0)] border border-[oklch(0.9_0_0)] text-[oklch(0.145_0_0)] placeholder:text-[oklch(0.6_0_0)] focus:outline-none focus:ring-1 focus:ring-[oklch(0.55_0.19_260)]"
          />
        </div>

        {/* Paper list */}
        <ScrollArea className="flex-1">
          <div className="divide-y divide-[oklch(0.95_0_0)]">
            {filtered.map((paper, i) => {
              const title = typeof paper.title === 'string' ? paper.title : paper.paperId ?? `Paper ${i + 1}`;
              const abstract = typeof paper.abstract === 'string' ? paper.abstract : '';
              const arxivId = typeof paper.arxivId === 'string' ? paper.arxivId : (typeof paper.id === 'string' ? paper.id : '');
              const categories: string[] = Array.isArray(paper.categories) ? paper.categories : [];
              const date = paper.publishedAt
                ? new Date(paper.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
                : '';
              const authors: string = Array.isArray(paper.authors)
                ? paper.authors.map((a: any) => typeof a === 'string' ? a : a?.name ?? '').filter(Boolean).slice(0, 3).join(', ')
                : '';
              const citationCount = typeof paper.citationCount === 'number' ? paper.citationCount : 0;

              const paperUrl = arxivId.includes('arxiv.org')
                ? arxivId
                : arxivId
                  ? `https://arxiv.org/abs/${arxivId}`
                  : `https://www.semanticscholar.org/paper/${paper.id ?? ''}`;

              return (
                <div key={paper.id ?? i} className="px-5 py-3 hover:bg-[oklch(0.98_0_0)] transition-colors">
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] text-[oklch(0.6_0_0)] font-mono mt-1 shrink-0 w-5">{i + 1}.</span>
                    <div className="min-w-0 flex-1">
                      <a
                        href={paperUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-[oklch(0.2_0_0)] hover:text-[oklch(0.4_0.19_260)] transition-colors leading-snug block"
                      >
                        {title}
                        <span className="inline-block ml-1 text-[oklch(0.5_0.19_260)] text-xs">↗</span>
                      </a>

                      {/* Meta line */}
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-[oklch(0.5_0_0)]">
                        {authors && <span>{authors}</span>}
                        {date && <span>· {date}</span>}
                        {citationCount > 0 && <span>· {citationCount} citations</span>}
                      </div>

                      {/* Abstract snippet */}
                      {abstract && (
                        <p className="text-xs text-[oklch(0.45_0_0)] mt-1.5 line-clamp-2 leading-relaxed">
                          {abstract}
                        </p>
                      )}

                      {/* Category badges */}
                      {categories.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {categories.slice(0, 3).map((cat, j) => (
                            <span
                              key={j}
                              className="text-[9px] px-1.5 py-0.5 rounded bg-[oklch(0.95_0_0)] text-[oklch(0.4_0_0)]"
                            >
                              {typeof cat === 'string' ? cat : ''}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {filtered.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-[oklch(0.5_0_0)]">
                No papers match "{search}"
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </>
  );
}
