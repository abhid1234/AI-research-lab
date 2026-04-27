'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { paperLink } from '@/lib/paper-utils';
import { CATEGORY_COLORS, derivePaperCategory, type Category } from '@/lib/categories';

const PAGE_SIZE = 20;

interface PapersTabProps {
  artifacts: { agentType: string; data: any }[];
  dbPapers?: any[];
}

export function PapersTab({ artifacts, dbPapers = [] }: PapersTabProps) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [sortBy, setSortBy] = useState<'quality' | 'relevance' | 'date' | 'citations' | 'title'>('quality');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const paperArtifact = artifacts.find((a) => a.agentType === 'paper-analyzer');
  const analyzedPapers: any[] = paperArtifact?.data?.papers ?? [];

  const analyzerByTitle = new Map<string, any>();
  const analyzerById = new Map<string, any>();
  for (const ap of analyzedPapers) {
    if (typeof ap.paperId === 'string') analyzerById.set(ap.paperId, ap);
    if (typeof ap.title === 'string') analyzerByTitle.set(ap.title.toLowerCase(), ap);
  }

  const merged: any[] = dbPapers.length > 0
    ? dbPapers.map((dbp) => {
        const id = typeof dbp.id === 'string' ? dbp.id : '';
        const title = typeof dbp.title === 'string' ? dbp.title : '';
        const analyzer = analyzerById.get(id) ?? analyzerByTitle.get(title.toLowerCase());
        return analyzer
          ? {
              ...analyzer,
              id,
              paperId: id,
              title: title || analyzer.title,
              abstract: dbp.abstract ?? analyzer.abstract,
              authors: dbp.authors ?? analyzer.authors,
              publishedAt: dbp.publishedAt ?? dbp.published_at,
              citationCount: dbp.citationCount ?? 0,
              arxivId: dbp.arxivId ?? dbp.arxiv_id,
              dbCategories: dbp.categories,
            }
          : {
              id,
              paperId: id,
              title,
              abstract: dbp.abstract,
              authors: dbp.authors,
              publishedAt: dbp.publishedAt ?? dbp.published_at,
              citationCount: dbp.citationCount ?? 0,
              arxivId: dbp.arxivId ?? dbp.arxiv_id,
              dbCategories: dbp.categories,
            };
      })
    : analyzedPapers;

  // Compute available categories
  const categoryCounts = new Map<Category, number>();
  for (const p of merged) {
    const cat = derivePaperCategory(p);
    categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1);
  }
  const categoryList = Array.from(categoryCounts.entries()).sort((a, b) => b[1] - a[1]);

  const filtered = merged
    .filter((p) => {
      if (categoryFilter !== 'all' && derivePaperCategory(p) !== categoryFilter) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        (p.title ?? '').toLowerCase().includes(q) ||
        (p.abstract ?? '').toLowerCase().includes(q) ||
        (p.problem ?? '').toLowerCase().includes(q) ||
        (p.approach ?? '').toLowerCase().includes(q) ||
        (p.takeaway ?? '').toLowerCase().includes(q)
      );
    });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'quality') return (b.qualityScore ?? 0) - (a.qualityScore ?? 0);
    if (sortBy === 'date') {
      const ad = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const bd = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return bd - ad;
    }
    if (sortBy === 'citations') return (b.citationCount ?? 0) - (a.citationCount ?? 0);
    if (sortBy === 'title') return (a.title ?? '').localeCompare(b.title ?? '');
    return 0;
  });

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const pageItems = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleQuery = (val: string) => { setQuery(val); setPage(0); };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Input
          placeholder="Search papers..."
          value={query}
          onChange={(e: { target: { value: string } }) => handleQuery(e.target.value)}
          className="max-w-sm h-8 text-xs"
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="h-8 rounded-md border border-border bg-card px-2 text-xs"
        >
          <option value="quality">Sort: Quality Score</option>
          <option value="date">Sort: Newest</option>
          <option value="citations">Sort: Most Cited</option>
          <option value="title">Sort: A-Z</option>
          <option value="relevance">Sort: Default</option>
        </select>
        {sorted.length > 0 && (
          <span className="text-[10px] text-muted-foreground tabular-nums ml-auto">
            {sorted.length} paper{sorted.length !== 1 ? 's' : ''}
            {totalPages > 1 ? ` · page ${page + 1}/${totalPages}` : ''}
          </span>
        )}
      </div>

      {/* Category filter pills */}
      {categoryList.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => { setCategoryFilter('all'); setPage(0); }}
            className={`text-[10px] px-2.5 py-1 rounded-full border transition-all ${
              categoryFilter === 'all'
                ? 'bg-foreground text-background border-foreground font-semibold'
                : 'bg-background text-muted-foreground border-border hover:border-foreground/40'
            }`}
          >
            All ({merged.length})
          </button>
          {categoryList.map(([cat, count]) => {
            const colors = CATEGORY_COLORS[cat];
            const active = categoryFilter === cat;
            return (
              <button
                key={cat}
                onClick={() => { setCategoryFilter(cat); setPage(0); }}
                className="text-[10px] px-2.5 py-1 rounded-full border transition-all"
                style={{
                  background: active ? colors?.border : colors?.pill,
                  color: active ? 'white' : colors?.text,
                  borderColor: active ? colors?.border : colors?.pill,
                  fontWeight: active ? 600 : 500,
                }}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      )}

      {pageItems.length === 0 ? (
        <EmptyState
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
            </svg>
          }
          title={merged.length === 0 ? 'No papers yet' : `No papers match "${query}"`}
          description={merged.length === 0 ? 'Run an analysis to see results.' : undefined}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 auto-rows-fr">
            {pageItems.map((p, i) => (
              <PaperCard key={page * PAGE_SIZE + i} paper={p} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
                className="rounded border border-border px-2 py-1 text-xs disabled:opacity-40 hover:bg-muted transition-colors"
              >
                ← Prev
              </button>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {page + 1} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage(page + 1)}
                className="rounded border border-border px-2 py-1 text-xs disabled:opacity-40 hover:bg-muted transition-colors"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PaperCard({ paper }: { paper: any }) {
  const displayTitle: string = typeof paper.title === 'string' && paper.title.trim()
    ? paper.title
    : (paper.paperId ?? 'Untitled Paper');
  const pid: string = typeof paper.paperId === 'string' ? paper.paperId
    : typeof paper.id === 'string' ? paper.id : '';
  const arxivId: string = typeof paper.arxivId === 'string' ? paper.arxivId : '';
  const abstract: string = typeof paper.abstract === 'string' ? paper.abstract : '';

  const category = derivePaperCategory(paper);
  const colors = CATEGORY_COLORS[category];

  // Authors
  const authors: any[] = Array.isArray(paper.authors) ? paper.authors : [];
  const authorStr = authors
    .slice(0, 3)
    .map((a: any) => typeof a === 'string' ? a : (a?.name ?? ''))
    .filter(Boolean)
    .join(', ');
  const moreAuthors = authors.length > 3 ? ` +${authors.length - 3}` : '';

  // Date
  const date = paper.publishedAt
    ? new Date(paper.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
    : '';

  // arxiv categories from DB
  const dbCats: string[] = Array.isArray(paper.dbCategories) ? paper.dbCategories.slice(0, 3) : [];

  // Quality signals
  const citationCount: number = typeof paper.citationCount === 'number' ? paper.citationCount : 0;
  const influentialCitations: number = typeof paper.influentialCitationCount === 'number' ? paper.influentialCitationCount : 0;
  const hfUpvotes: number = typeof paper.hfUpvotes === 'number' ? paper.hfUpvotes : 0;
  const hasCode: boolean = paper.hasCode === true;
  const orDecision: string = typeof paper.openreviewDecision === 'string' ? paper.openreviewDecision : '';
  const venue: string = typeof paper.venue === 'string' ? paper.venue : '';

  // Citation tier
  const citationTier =
    citationCount >= 100 ? { label: '🥇', color: '#ca8a04', bg: '#fef9c3', text: '#a16207' } :
    citationCount >= 20  ? { label: '🥈', color: '#9ca3af', bg: '#f3f4f6', text: '#4b5563' } :
    citationCount >= 5   ? { label: '🥉', color: '#b45309', bg: '#fed7aa', text: '#9a3412' } :
    null;

  // URL — only use arxiv if we have a real ID
  const isRealArxiv = arxivId && !arxivId.startsWith('demo-') && (arxivId.includes('.') || arxivId.includes('/'));
  const url = isRealArxiv
    ? `https://arxiv.org/abs/${arxivId}`
    : paperLink(pid || undefined, displayTitle);
  const pdfUrl = isRealArxiv ? `https://arxiv.org/pdf/${arxivId}` : null;

  // Source attribution
  const pubTypes: string[] = Array.isArray(paper.publicationTypes) ? paper.publicationTypes : [];
  const sourceLabel = pubTypes.includes('Conference') || pubTypes.includes('JournalArticle')
    ? '📄 Published'
    : pubTypes.includes('Review')
      ? '📚 Review'
      : isRealArxiv
        ? '📑 arXiv'
        : '';

  const openAbs = () => window.open(url, '_blank', 'noopener,noreferrer');

  return (
    <div
      onClick={openAbs}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') openAbs(); }}
      className="group flex h-[300px] flex-col rounded-lg bg-white border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all overflow-hidden relative cursor-pointer"
      style={{ borderLeftWidth: '4px', borderLeftColor: colors?.border ?? '#6366f1' }}
    >
      {/* Header strip with category + date */}
      <div className="flex items-center justify-between gap-2 px-3 pt-2.5 pb-1.5 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
            style={{ background: colors?.pill, color: colors?.text }}
          >
            {category}
          </span>
          {sourceLabel && (
            <span
              className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0"
              title={isRealArxiv ? 'Originally published on arXiv' : 'From source database'}
            >
              {sourceLabel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {date && (
            <span className="text-[10px] text-gray-500 font-medium">{date}</span>
          )}
          {dbCats.length > 0 && (
            <span className="text-[9px] text-gray-400 font-mono uppercase tracking-wide">
              {dbCats[0]}
            </span>
          )}
          <span className="text-[11px] text-foreground/30 group-hover:text-foreground transition-colors">↗</span>
        </div>
      </div>

      {/* Quality badges row */}
      {(citationTier || influentialCitations > 0 || hfUpvotes >= 50 || hasCode || orDecision || venue) && (
        <div className="flex items-center gap-1.5 flex-wrap px-3 pb-1.5 shrink-0">
          {citationTier && (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded"
              style={{ background: citationTier.bg, color: citationTier.text }}
              title={`${citationCount} citations`}
            >
              <span>{citationTier.label}</span>
              <span>{citationCount} cites</span>
            </span>
          )}
          {influentialCitations > 0 && (
            <span
              className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700"
              title={`${influentialCitations} influential citations`}
            >
              ✓ Influential
            </span>
          )}
          {hfUpvotes >= 50 && (
            <span
              className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-orange-100 text-orange-700"
              title={`${hfUpvotes} HuggingFace upvotes`}
            >
              🔥 {hfUpvotes}
            </span>
          )}
          {orDecision && (
            <span
              className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-stone-100 text-stone-700 dark:bg-stone-500/15 dark:text-stone-300"
              title={`${orDecision} acceptance`}
            >
              🏆 {orDecision}
            </span>
          )}
          {hasCode && (
            <span
              className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700"
              title="Has reproducible code"
            >
              📄 Code
            </span>
          )}
          {venue && !orDecision && (
            <span
              className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700"
              title={`Published in ${venue}`}
            >
              {venue.length > 15 ? venue.slice(0, 15) + '…' : venue}
            </span>
          )}
        </div>
      )}

      {/* Title */}
      <div className="px-3 pb-1.5 shrink-0">
        <h3
          className="text-[13px] font-semibold leading-snug text-foreground group-hover:underline underline-offset-4 decoration-foreground/40 transition-colors line-clamp-2"
          style={{ wordBreak: 'break-word' }}
        >
          {displayTitle}
        </h3>
      </div>

      {/* Authors */}
      {authorStr && (
        <div className="px-3 pb-1.5 shrink-0">
          <p className="text-[10.5px] text-gray-500 truncate">
            <span className="text-gray-700">{authorStr}</span>
            {moreAuthors && <span className="text-gray-400">{moreAuthors}</span>}
          </p>
        </div>
      )}

      {/* Abstract snippet — flex-1 fills remaining space so bottom strip pins to bottom */}
      <div className="px-3 pb-3 flex-1 min-h-0 overflow-hidden">
        {abstract && (
          <p className="text-[11px] text-gray-600 leading-relaxed line-clamp-3">
            {abstract}
          </p>
        )}
      </div>

      {/* Bottom meta strip — only show if takeaway exists */}
      {paper.takeaway && (
        <div
          className="flex items-start gap-2 px-3 py-2 border-t text-[10.5px] shrink-0"
          style={{ background: colors?.bg, borderTopColor: `${colors?.border}30` }}
        >
          {typeof paper.takeaway === 'string' && paper.takeaway && (
            <p className="flex-1 text-gray-700 italic leading-relaxed line-clamp-2">
              <span className="font-semibold not-italic" style={{ color: colors?.text }}>Takeaway:</span> {paper.takeaway}
            </p>
          )}
        </div>
      )}

      {/* Footer action bar — explicit links to abs + PDF */}
      {isRealArxiv && (
        <div className="flex items-center gap-3 px-3 py-1.5 border-t border-gray-100 text-[10px] text-gray-500 bg-gray-50/50 shrink-0">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 hover:text-foreground transition-colors font-medium"
            title="Open arXiv abstract page"
          >
            <span>📑</span>
            <span>arXiv abs</span>
          </a>
          {pdfUrl && (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 hover:text-foreground transition-colors font-medium"
              title="Download PDF directly"
            >
              <span>⬇</span>
              <span>PDF</span>
            </a>
          )}
          <span className="ml-auto text-gray-400 font-mono text-[9px]">{arxivId}</span>
        </div>
      )}
    </div>
  );
}
