'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { paperLink } from '@/lib/paper-utils';

interface PaperDetailModalProps {
  paper: any | null;
  onClose: () => void;
  allPapers?: any[];
}

export function PaperDetailModal({ paper, onClose, allPapers = [] }: PaperDetailModalProps) {
  // Close on Escape key
  useEffect(() => {
    if (!paper) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [paper, onClose]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!paper || !mounted) return null;

  const title = typeof paper.title === 'string' ? paper.title : 'Untitled Paper';
  const abstract = typeof paper.abstract === 'string' ? paper.abstract : '';
  const venue = typeof paper.venue === 'string' ? paper.venue : '';
  const citationCount = typeof paper.citationCount === 'number' ? paper.citationCount : 0;
  const categories: string[] = Array.isArray(paper.categories) ? paper.categories : [];
  const pdfUrl = typeof paper.pdfUrl === 'string' ? paper.pdfUrl : '';
  const arxivId = typeof paper.arxivId === 'string' ? paper.arxivId : '';

  const date = paper.publishedAt
    ? new Date(paper.publishedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  const authors: string = Array.isArray(paper.authors)
    ? paper.authors
        .map((a: any) => (typeof a === 'string' ? a : typeof a?.name === 'string' ? a.name : ''))
        .filter(Boolean)
        .join(', ')
    : '';

  // Build arxiv/scholar URL
  const isRealArxivId =
    arxivId && !arxivId.startsWith('demo-') && (arxivId.includes('.') || arxivId.includes('/'));
  const paperUrl = paperLink(isRealArxivId ? arxivId : undefined, title);

  const pdfLink = pdfUrl || (isRealArxivId ? `https://arxiv.org/pdf/${arxivId}` : '');

  // Find similar papers by shared categories (simple heuristic)
  const similarPapers = allPapers
    .filter((p: any) => {
      if (!p || p.id === paper.id) return false;
      const pCats: string[] = Array.isArray(p.categories) ? p.categories : [];
      return pCats.some((c: string) => categories.includes(c));
    })
    .slice(0, 3);

  return createPortal(
    <>
      {/* Backdrop — z-index above drawer (9999) */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10000,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          animation: 'drawerFadeIn 150ms ease-out both',
        }}
        onClick={onClose}
      >
        {/* Modal panel */}
        <div
          className="relative rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
          style={{ background: 'var(--card)', color: 'var(--card-foreground)', animation: 'chartFadeIn 200ms ease-out both' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="absolute top-3 right-3 z-10 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* Scrollable content */}
          <div className="overflow-y-auto flex-1 p-6 pr-10">
            {/* Title */}
            <h2 className="text-lg font-bold text-foreground leading-snug pr-2">{title}</h2>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-xs text-muted-foreground">
              {authors && <span>{authors}</span>}
              {date && <span className="before:content-['·'] before:mr-3">{date}</span>}
              {venue && (
                <span className="before:content-['·'] before:mr-3 italic">{venue}</span>
              )}
              {citationCount > 0 && (
                <span className="before:content-['·'] before:mr-3">
                  {citationCount.toLocaleString()} citations
                </span>
              )}
            </div>

            {/* Category badges */}
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {categories.map((cat, i) => (
                  <span
                    key={i}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium"
                  >
                    {typeof cat === 'string' ? cat : ''}
                  </span>
                ))}
              </div>
            )}

            {/* Abstract */}
            {abstract && (
              <div className="mt-5">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Abstract
                </h3>
                <p className="text-sm text-foreground/90 leading-relaxed">{abstract}</p>
              </div>
            )}

            {/* PDF / paper link button */}
            <div className="mt-6 flex gap-3">
              {pdfLink && (
                <a
                  href={pdfLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/80 transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  Open PDF
                </a>
              )}
              <a
                href={paperUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted text-foreground/90 text-sm font-medium hover:bg-muted/80 transition-colors border border-border"
              >
                View on arxiv ↗
              </a>
            </div>

            {/* Similar papers */}
            <div className="mt-7">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Similar Papers
              </h3>
              {similarPapers.length === 0 ? (
                <p className="text-xs text-muted-foreground">No similar papers found in this collection.</p>
              ) : (
                <div className="space-y-2.5">
                  {similarPapers.map((sp: any, i: number) => {
                    const spTitle = typeof sp.title === 'string' ? sp.title : `Paper ${i + 1}`;
                    const spArxivId = typeof sp.arxivId === 'string' ? sp.arxivId : '';
                    const spIsReal =
                      spArxivId &&
                      !spArxivId.startsWith('demo-') &&
                      (spArxivId.includes('.') || spArxivId.includes('/'));
                    const spUrl = paperLink(spIsReal ? spArxivId : undefined, spTitle);
                    const spAuthors: string = Array.isArray(sp.authors)
                      ? sp.authors
                          .map((a: any) =>
                            typeof a === 'string' ? a : typeof a?.name === 'string' ? a.name : ''
                          )
                          .filter(Boolean)
                          .slice(0, 2)
                          .join(', ')
                      : '';
                    return (
                      <div
                        key={sp.id ?? i}
                        className="p-3 rounded-lg bg-muted/50 border border-border"
                      >
                        <a
                          href={spUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-foreground hover:text-primary transition-colors leading-snug block"
                        >
                          {spTitle} ↗
                        </a>
                        {spAuthors && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">{spAuthors}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
