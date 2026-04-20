'use client';

import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { paperLink } from '@/lib/paper-utils';
import {
  getAnnotations,
  addAnnotation,
  removeAnnotation,
  type Annotation,
} from '@/lib/annotations';
import {
  getReadingLists,
  addPaperToList,
  removePaperFromList,
  getListsContainingPaper,
  createReadingList,
  type ReadingList,
} from '@/lib/reading-lists';

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

  // Annotations state
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [noteText, setNoteText] = useState('');

  // Reading lists state
  const [readingLists, setReadingLists] = useState<ReadingList[]>([]);
  const [listsOpen, setListsOpen] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [creatingList, setCreatingList] = useState(false);
  const listsDropdownRef = useRef<HTMLDivElement>(null);

  // Load annotations when paper changes
  useEffect(() => {
    if (paper?.id) {
      setAnnotations(getAnnotations(paper.id));
      setNoteText('');
    }
  }, [paper?.id]);

  // Load reading lists when paper changes
  useEffect(() => {
    if (paper?.id) {
      setReadingLists(getReadingLists());
    }
  }, [paper?.id]);

  // Close reading lists dropdown on outside click
  useEffect(() => {
    if (!listsOpen) return;
    const handler = (e: MouseEvent) => {
      if (listsDropdownRef.current && !listsDropdownRef.current.contains(e.target as Node)) {
        setListsOpen(false);
        setCreatingList(false);
        setNewListName('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [listsOpen]);

  const handleAddAnnotation = () => {
    const trimmed = noteText.trim();
    if (!trimmed || !paper?.id) return;
    addAnnotation(paper.id, trimmed);
    setAnnotations(getAnnotations(paper.id));
    setNoteText('');
  };

  const handleRemoveAnnotation = (annotationId: string) => {
    if (!paper?.id) return;
    removeAnnotation(paper.id, annotationId);
    setAnnotations(getAnnotations(paper.id));
  };

  const handleToggleList = (listId: string) => {
    if (!paper?.id) return;
    const list = readingLists.find(l => l.id === listId);
    if (!list) return;
    if (list.paperIds.includes(paper.id)) {
      removePaperFromList(listId, paper.id);
    } else {
      addPaperToList(listId, paper.id);
    }
    setReadingLists(getReadingLists());
  };

  const handleCreateList = () => {
    const trimmed = newListName.trim();
    if (!trimmed) return;
    const created = createReadingList(trimmed);
    if (paper?.id) addPaperToList(created.id, paper.id);
    setReadingLists(getReadingLists());
    setNewListName('');
    setCreatingList(false);
  };

  const relativeTime = (iso: string): string => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

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

            {/* PDF / paper link button + Save to list */}
            <div className="mt-6 flex flex-wrap gap-3 items-center">
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

              {/* Save to reading list */}
              <div className="relative ml-auto" ref={listsDropdownRef}>
                <button
                  onClick={() => { setListsOpen(v => !v); setReadingLists(getReadingLists()); }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted text-foreground/90 text-sm font-medium hover:bg-muted/80 transition-colors border border-border"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                  </svg>
                  Save to list
                </button>

                {listsOpen && (
                  <div
                    className="absolute right-0 bottom-full mb-2 z-20 w-56 rounded-xl border border-border bg-card shadow-xl"
                    style={{ animation: 'chartFadeIn 150ms ease-out both' }}
                  >
                    <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                      <span className="text-xs font-semibold text-foreground">Reading Lists</span>
                      <button
                        onClick={() => { setCreatingList(v => !v); setNewListName(''); }}
                        className="text-[10px] text-primary hover:underline"
                      >
                        + New
                      </button>
                    </div>

                    {creatingList && (
                      <div className="px-3 py-2 border-b border-border flex gap-2">
                        <input
                          autoFocus
                          type="text"
                          value={newListName}
                          onChange={e => setNewListName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleCreateList(); if (e.key === 'Escape') { setCreatingList(false); setNewListName(''); } }}
                          placeholder="List name…"
                          className="flex-1 text-xs rounded-md border border-border bg-background px-2 py-1 outline-none focus:ring-1 focus:ring-primary"
                        />
                        <button
                          onClick={handleCreateList}
                          className="text-xs px-2 py-1 rounded-md bg-primary text-white font-medium hover:bg-primary/80 transition-colors"
                        >
                          Add
                        </button>
                      </div>
                    )}

                    <div className="max-h-48 overflow-y-auto">
                      {readingLists.length === 0 ? (
                        <p className="px-3 py-3 text-xs text-muted-foreground text-center">No lists yet.</p>
                      ) : (
                        readingLists.map(list => {
                          const inList = paper?.id ? list.paperIds.includes(paper.id) : false;
                          return (
                            <label
                              key={list.id}
                              className="flex items-center gap-2.5 px-3 py-2 hover:bg-muted/50 transition-colors cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={inList}
                                onChange={() => handleToggleList(list.id)}
                                className="h-3.5 w-3.5 accent-primary rounded"
                              />
                              <span className="flex-1 text-xs text-foreground truncate">{list.name}</span>
                              <span className="text-[10px] text-muted-foreground shrink-0">
                                {list.paperIds.length}
                              </span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
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
            {/* Annotations */}
            <div className="mt-7">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Annotations
              </h3>

              {/* Existing annotations */}
              {annotations.length > 0 && (
                <div className="space-y-2 mb-3">
                  {annotations.map(ann => (
                    <div
                      key={ann.id}
                      className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/50 border border-border group"
                    >
                      <p className="flex-1 text-xs text-foreground/90 leading-relaxed">{ann.text}</p>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {relativeTime(ann.createdAt)}
                        </span>
                        <button
                          onClick={() => handleRemoveAnnotation(ann.id)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-muted-foreground hover:text-destructive transition-all"
                          title="Delete annotation"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new annotation */}
              <div className="flex flex-col gap-2">
                <textarea
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAddAnnotation(); }}
                  placeholder="Add a note… (Cmd+Enter to save)"
                  rows={2}
                  className="w-full text-xs rounded-lg border border-border bg-background px-3 py-2 resize-none outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                />
                <button
                  onClick={handleAddAnnotation}
                  disabled={!noteText.trim()}
                  className="self-end text-xs px-3 py-1.5 rounded-md bg-primary text-white font-medium hover:bg-primary/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Add note
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
