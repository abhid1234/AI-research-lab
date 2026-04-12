'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

function paperLink(id: string | undefined, title?: string): string {
  if (!id) return title ? `https://scholar.google.com/scholar?q=${encodeURIComponent(title)}` : '#';
  if (id.includes('arxiv.org')) return id;
  if (id.includes('.') || id.includes('/')) return `https://arxiv.org/abs/${id}`;
  return `https://scholar.google.com/scholar?q=${encodeURIComponent(title ?? id)}`;
}

const PAGE_SIZE = 20;

interface PapersTabProps {
  artifacts: { agentType: string; data: any }[];
}

export function PapersTab({ artifacts }: PapersTabProps) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);

  const paperArtifact = artifacts.find((a) => a.agentType === 'paper-analyzer');
  const papers: any[] = paperArtifact?.data?.papers ?? [];

  const filtered = query.trim()
    ? papers.filter((p) => {
        const q = query.toLowerCase();
        return (
          (p.paperId ?? '').toLowerCase().includes(q) ||
          (p.title ?? '').toLowerCase().includes(q) ||
          (p.problem ?? '').toLowerCase().includes(q) ||
          (p.approach ?? '').toLowerCase().includes(q) ||
          (p.takeaway ?? '').toLowerCase().includes(q) ||
          (typeof p.methodology === 'string' ? p.methodology : p.methodology?.type ?? '').toLowerCase().includes(q)
        );
      })
    : papers;

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageItems = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleQuery = (val: string) => {
    setQuery(val);
    setPage(0);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Input
          placeholder="Search papers..."
          value={query}
          onChange={(e: { target: { value: string } }) => handleQuery(e.target.value)}
          className="max-w-sm h-8 text-xs"
        />
        {filtered.length > 0 && (
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {filtered.length} paper{filtered.length !== 1 ? 's' : ''}
            {totalPages > 1 ? ` · page ${page + 1}/${totalPages}` : ''}
          </span>
        )}
      </div>

      {pageItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-40">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
          </svg>
          <p className="text-sm">
            {papers.length === 0
              ? 'No papers analyzed yet. Run an analysis to see results.'
              : `No papers match "${query}"`}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
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
  const [claimsOpen, setClaimsOpen] = useState(false);

  const displayTitle: string = typeof paper.title === 'string' && paper.title.trim()
    ? paper.title
    : (paper.paperId ?? 'Untitled Paper');
  const pid: string = typeof paper.paperId === 'string' ? paper.paperId : typeof paper.id === 'string' ? paper.id : '';
  const methodologyStr: string = typeof paper.methodology === 'string'
    ? paper.methodology
    : (typeof paper.methodology?.type === 'string' ? paper.methodology.type : '');

  return (
    <Card>
      <CardContent className="p-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Left: title + meta */}
          <div className="space-y-1.5">
            <a
              href={paperLink(pid || undefined, displayTitle)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold leading-snug hover:text-primary transition-colors underline-offset-2 hover:underline block"
            >
              {displayTitle}
            </a>
            {methodologyStr && (
              <Badge variant="outline" className="text-[9px] py-0">{methodologyStr}</Badge>
            )}
            {paper.methodology && typeof paper.methodology === 'object' && (
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                {Array.isArray(paper.methodology.datasets) && paper.methodology.datasets.length > 0 && (
                  <span>Datasets: <span className="text-foreground/80">{paper.methodology.datasets.join(', ')}</span></span>
                )}
                {Array.isArray(paper.methodology.models) && paper.methodology.models.length > 0 && (
                  <span>Models: <span className="text-foreground/80">{paper.methodology.models.join(', ')}</span></span>
                )}
                {paper.methodology.computeScale && (
                  <span>Compute: <span className="text-foreground/80">{typeof paper.methodology.computeScale === 'string' ? paper.methodology.computeScale : ''}</span></span>
                )}
              </div>
            )}
            {paper.takeaway && (
              <div className="rounded bg-primary/5 border border-primary/20 px-2 py-1">
                <p className="text-[10px] text-primary/80 font-medium mb-0.5">Takeaway</p>
                <p className="text-xs line-clamp-2">{typeof paper.takeaway === 'string' ? paper.takeaway : ''}</p>
              </div>
            )}
          </div>

          {/* Right: details */}
          <div className="space-y-1.5">
            {paper.problem && (
              <p className="text-[10px] text-muted-foreground line-clamp-3">{typeof paper.problem === 'string' ? paper.problem : ''}</p>
            )}
            {paper.approach && (
              <div>
                <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wide">Approach</p>
                <p className="text-[10px] text-muted-foreground line-clamp-2">{typeof paper.approach === 'string' ? paper.approach : ''}</p>
              </div>
            )}
            {paper.keyInnovation && (
              <div>
                <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wide">Innovation</p>
                <p className="text-[10px] text-muted-foreground line-clamp-2">{typeof paper.keyInnovation === 'string' ? paper.keyInnovation : ''}</p>
              </div>
            )}
            {paper.mainResult && (
              <div>
                <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wide">Result</p>
                <p className="text-[10px] text-muted-foreground line-clamp-2">{typeof paper.mainResult === 'string' ? paper.mainResult : ''}</p>
              </div>
            )}
            {paper.limitations && (
              <p className="text-[10px] text-muted-foreground/60 line-clamp-1">
                Limitations: {Array.isArray(paper.limitations) ? paper.limitations.join(', ') : (typeof paper.limitations === 'string' ? paper.limitations : '')}
              </p>
            )}
            {paper.claims && Array.isArray(paper.claims) && paper.claims.length > 0 && (
              <div>
                <button
                  onClick={() => setClaimsOpen(!claimsOpen)}
                  className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  {claimsOpen ? '▾' : '▸'} {paper.claims.length} claim{paper.claims.length !== 1 ? 's' : ''}
                </button>
                {claimsOpen && (
                  <div className="mt-1 space-y-1">
                    {paper.claims.map((c: any, i: number) => {
                      const statement: string = typeof c === 'string' ? c : (typeof c.statement === 'string' ? c.statement : '');
                      const evidence: string = typeof c === 'string' ? '' : (typeof c.evidence === 'string' ? c.evidence : '');
                      const strength: string = typeof c === 'string' ? '' : (typeof c.strength === 'string' ? c.strength : '');
                      const strengthColor =
                        strength === 'strong' ? 'bg-emerald-500' :
                        strength === 'moderate' ? 'bg-amber-500' :
                        strength === 'weak' ? 'bg-rose-500' : 'bg-muted-foreground/30';

                      return (
                        <div key={i} className="rounded border border-border bg-card p-2 space-y-0.5">
                          <div className="flex items-start gap-1.5">
                            {strength && (
                              <span className={`shrink-0 mt-1 h-1.5 w-1.5 rounded-full ${strengthColor}`} />
                            )}
                            <p className="text-[10px] font-medium leading-snug">{statement}</p>
                          </div>
                          {evidence && (
                            <p className="text-[10px] text-muted-foreground border-l-2 border-primary/20 pl-2 line-clamp-2">
                              {evidence}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
