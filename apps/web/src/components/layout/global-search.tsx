'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { PaperDetailModal } from './paper-detail-modal';

interface SearchResult {
  paperId: string;
  paper: any;
  content: string;
  distance: number;
}

interface GlobalSearchProps {
  topicId?: string | null;
}

export function GlobalSearch({ topicId }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedPaper, setSelectedPaper] = useState<any | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const runSearch = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setResults([]);
        setOpen(false);
        return;
      }
      setLoading(true);
      try {
        const params = new URLSearchParams({ q, limit: '10' });
        if (topicId) params.set('topicId', topicId);
        const res = await fetch(`/api/search?${params.toString()}`);
        if (!res.ok) throw new Error('Search failed');
        const data = await res.json();
        const rawResults: SearchResult[] = Array.isArray(data.results) ? data.results : [];
        setResults(rawResults);
        setOpen(rawResults.length > 0);
      } catch {
        setResults([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    },
    [topicId],
  );

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(val), 400);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    runSearch(query);
  }

  function handleResultClick(result: SearchResult) {
    setSelectedPaper(result.paper);
    setOpen(false);
  }

  return (
    <>
      <div className="relative flex-1 min-w-0 max-w-xs">
        <form onSubmit={handleSubmit} className="relative">
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={handleChange}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder="Search papers..."
            className="w-full h-10 pl-8 pr-3 text-xs rounded-md bg-[oklch(0.97_0_0)] border border-[oklch(0.88_0_0)] text-[oklch(0.145_0_0)] placeholder:text-[oklch(0.6_0_0)] focus:outline-none focus:ring-1 focus:ring-[oklch(0.55_0.19_260)] focus:border-[oklch(0.55_0.19_260)]"
          />
          {/* Search icon */}
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[oklch(0.6_0_0)] pointer-events-none">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          {loading && (
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <svg
                className="animate-spin text-[oklch(0.55_0.19_260)]"
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            </span>
          )}
        </form>

        {/* Dropdown results */}
        {open && (
          <div
            ref={dropdownRef}
            className="absolute top-full left-0 right-0 mt-1 bg-white border border-[oklch(0.9_0_0)] rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto min-w-[200px]"
          >
            {results.length === 0 ? (
              <div className="px-3 py-2 text-xs text-[oklch(0.55_0_0)]">No results found.</div>
            ) : (
              results.map((r, i) => {
                const title =
                  typeof r.paper?.title === 'string' ? r.paper.title : `Result ${i + 1}`;
                const score = typeof r.distance === 'number' ? r.distance : 0;
                const scoreDisplay = (score * 100).toFixed(0);
                const authors: string = Array.isArray(r.paper?.authors)
                  ? r.paper.authors
                      .map((a: any) =>
                        typeof a === 'string' ? a : typeof a?.name === 'string' ? a.name : '',
                      )
                      .filter(Boolean)
                      .slice(0, 2)
                      .join(', ')
                  : '';

                return (
                  <button
                    key={r.paperId ?? i}
                    type="button"
                    onClick={() => handleResultClick(r)}
                    className="w-full text-left px-3 py-2.5 hover:bg-[oklch(0.97_0_0)] border-b border-[oklch(0.95_0_0)] last:border-0 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-medium text-[oklch(0.15_0_0)] leading-snug line-clamp-2 flex-1">
                        {title}
                      </span>
                      <span className="text-[10px] text-[oklch(0.55_0.19_260)] font-mono shrink-0 mt-0.5">
                        {scoreDisplay}%
                      </span>
                    </div>
                    {authors && (
                      <p className="text-[10px] text-[oklch(0.55_0_0)] mt-0.5">{authors}</p>
                    )}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Paper detail modal for selected result */}
      <PaperDetailModal
        paper={selectedPaper}
        onClose={() => setSelectedPaper(null)}
        allPapers={results.map((r) => r.paper).filter(Boolean)}
      />
    </>
  );
}
