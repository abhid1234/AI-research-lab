'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PaperDetailModal } from './paper-detail-modal';
import { PaperComparisonModal } from './paper-comparison-modal';
import { upvotePaper, getVoteCount } from '@/lib/votes';
import { paperLink } from '@/lib/paper-utils';


interface PaperDrawerProps {
  papers: any[];
  open: boolean;
  onClose: () => void;
}

export function PaperDrawer({ papers, open, onClose }: PaperDrawerProps) {
  const [search, setSearch] = useState('');
  const [selectedPaper, setSelectedPaper] = useState<any | null>(null);
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());
  const [comparingOpen, setComparingOpen] = useState(false);
  const [votes, setVotes] = useState<Record<string, number>>(() => {
    if (typeof window === 'undefined') return {};
    const all = papers.reduce<Record<string, number>>((acc, p) => {
      const id = String(p.id ?? '');
      if (id) acc[id] = getVoteCount(id);
      return acc;
    }, {});
    return all;
  });

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 3) {
        next.add(id);
      }
      return next;
    });
  };

  const handleUpvote = (e: React.MouseEvent, paperId: string) => {
    e.stopPropagation();
    const newCount = upvotePaper(paperId);
    setVotes((prev) => ({ ...prev, [paperId]: newCount }));
  };

  // We need a mounted ref for createPortal — it only works client-side
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!open || !mounted) return null;

  const filtered = search.trim()
    ? papers.filter((p) => {
        const q = search.toLowerCase();
        const title = typeof p.title === 'string' ? p.title : '';
        const abstract = typeof p.abstract === 'string' ? p.abstract : '';
        return title.toLowerCase().includes(q) || abstract.toLowerCase().includes(q);
      })
    : papers;

  const compareItems = papers.filter((p) => compareIds.has(String(p.id ?? '')));

  // Portal everything to document.body to escape ALL stacking contexts.
  // Use inline styles for position/z-index to bypass any Tailwind specificity issues.
  return createPortal(
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9998,
          background: 'rgba(0,0,0,0.2)',
          animation: 'drawerFadeIn 200ms ease-out both',
        }}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '480px',
          maxWidth: '90vw',
          zIndex: 9999,
          background: 'var(--card)',
          borderLeft: '1px solid var(--border)',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          display: 'flex',
          flexDirection: 'column' as const,
          animation: 'drawerSlideIn 200ms ease-out both',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-base font-bold text-foreground">
              All Papers ({papers.length})
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Click a title to view details · ↗ opens arxiv
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-muted-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </Button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-border">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search papers..."
            className="w-full px-3 py-1.5 text-sm rounded-md bg-muted border border-border text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Compare hint */}
        {compareIds.size > 0 && (
          <div className="px-5 py-2 border-b border-border bg-primary/5">
            <p className="text-[10px] text-primary/70">
              {compareIds.size} selected · {compareIds.size < 2 ? 'Select at least 2 to compare' : compareIds.size < 3 ? 'Select up to 1 more or compare now' : 'Max 3 papers selected'}
            </p>
          </div>
        )}

        {/* Paper list */}
        <div className="flex-1 overflow-y-auto">
          <div className="divide-y divide-border/50">
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

              // Build a valid URL — skip demo/fake IDs
              const isRealArxivId = arxivId && !arxivId.startsWith('demo-') && (arxivId.includes('.') || arxivId.includes('/'));
              const paperUrl = paperLink(isRealArxivId ? arxivId : undefined, title || undefined);

              const paperId = String(paper.id ?? i);
              const isChecked = compareIds.has(paperId);
              const voteCount = votes[paperId] ?? 0;

              return (
                <div key={paper.id ?? i} className="px-5 py-3 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start gap-2">
                    {/* Compare checkbox */}
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={!isChecked && compareIds.size >= 3}
                      onChange={() => toggleCompare(paperId)}
                      aria-label="Select for comparison"
                      className="mt-1 shrink-0 accent-primary cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className="text-[10px] text-muted-foreground/70 font-mono mt-1 shrink-0 w-5">{i + 1}.</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedPaper(paper)}
                          className="text-sm font-medium text-foreground hover:text-primary transition-colors leading-snug text-left flex-1"
                        >
                          {title}
                        </button>
                        <a
                          href={paperUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Open on arxiv"
                          className="shrink-0 mt-0.5 text-primary/60 hover:text-primary text-xs transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          ↗
                        </a>
                        {/* Upvote button */}
                        <button
                          type="button"
                          onClick={(e) => handleUpvote(e, paperId)}
                          aria-label="Upvote paper"
                          className="shrink-0 mt-0.5 flex items-center gap-0.5 text-muted-foreground hover:text-primary transition-colors text-[10px]"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="18 15 12 9 6 15" />
                          </svg>
                          {voteCount > 0 && <span className="tabular-nums">{voteCount}</span>}
                        </button>
                      </div>

                      {/* Meta line */}
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                        {authors && <span>{authors}</span>}
                        {date && <span>· {date}</span>}
                        {citationCount > 0 && <span>· {citationCount} citations</span>}
                      </div>

                      {/* Provenance line */}
                      {(() => {
                        const ingestedAt = paper.createdAt
                          ? new Date(paper.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                          : null;
                        const primaryCategory: string = Array.isArray(paper.categories) && paper.categories.length > 0
                          ? (typeof paper.categories[0] === 'string' ? paper.categories[0] : '')
                          : '';
                        if (!ingestedAt && !primaryCategory) return null;
                        return (
                          <p className="text-[9px] text-muted-foreground/70 italic mt-0.5">
                            {ingestedAt ? `Ingested ${ingestedAt}` : 'Ingested'}
                            {' from arxiv'}
                            {primaryCategory ? ` ${primaryCategory}` : ''}
                          </p>
                        );
                      })()}

                      {/* Abstract snippet */}
                      {abstract && (
                        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
                          {abstract}
                        </p>
                      )}

                      {/* Category badges */}
                      {categories.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {categories.slice(0, 3).map((cat, j) => (
                            <span
                              key={j}
                              className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
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
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                No papers match "{search}"
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating compare button */}
      {compareIds.size >= 2 && (
        <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none" style={{ zIndex: 60 }}>
          <button
            type="button"
            onClick={() => setComparingOpen(true)}
            className="pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold shadow-lg hover:bg-primary/80 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="18" rx="1" /><rect x="14" y="3" width="7" height="18" rx="1" />
            </svg>
            Compare selected ({compareIds.size})
          </button>
        </div>
      )}

      {/* Paper detail modal */}
      <PaperDetailModal
        paper={selectedPaper}
        onClose={() => setSelectedPaper(null)}
        allPapers={papers}
      />

      {/* Comparison modal */}
      {comparingOpen && compareItems.length >= 2 && (
        <PaperComparisonModal
          papers={compareItems}
          onClose={() => setComparingOpen(false)}
        />
      )}
    </>,
    document.body,
  );
}
