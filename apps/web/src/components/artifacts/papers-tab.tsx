'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface PapersTabProps {
  artifacts: { agentType: string; data: any }[];
}

export function PapersTab({ artifacts }: PapersTabProps) {
  const [query, setQuery] = useState('');

  const paperArtifact = artifacts.find((a) => a.agentType === 'paper-analyzer');
  const papers: any[] = paperArtifact?.data?.papers ?? [];

  const filtered = query.trim()
    ? papers.filter((p) => {
        const q = query.toLowerCase();
        return (
          (p.paperId ?? '').toLowerCase().includes(q) ||
          (p.problem ?? '').toLowerCase().includes(q) ||
          (p.approach ?? '').toLowerCase().includes(q) ||
          (p.takeaway ?? '').toLowerCase().includes(q) ||
          (typeof p.methodology === 'string' ? p.methodology : p.methodology?.type ?? '').toLowerCase().includes(q)
        );
      })
    : papers;

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search papers..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="max-w-sm"
      />

      {filtered.length === 0 ? (
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
        <div className="space-y-3">
          {filtered.map((p, i) => (
            <PaperCard key={i} paper={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function PaperCard({ paper }: { paper: any }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm leading-snug">
            {paper.paperId ?? 'Untitled Paper'}
          </CardTitle>
          {paper.methodology && (
            <Badge variant="outline" className="shrink-0 text-[10px]">
              {typeof paper.methodology === 'string' ? paper.methodology : paper.methodology.type ?? 'empirical'}
            </Badge>
          )}
        </div>
        {paper.problem && (
          <CardDescription className="line-clamp-2">{paper.problem}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Methodology details */}
        {paper.methodology && typeof paper.methodology === 'object' && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            {paper.methodology.datasets?.length > 0 && (
              <span>Datasets: <span className="text-foreground/80">{paper.methodology.datasets.join(', ')}</span></span>
            )}
            {paper.methodology.models?.length > 0 && (
              <span>Models: <span className="text-foreground/80">{paper.methodology.models.join(', ')}</span></span>
            )}
            {paper.methodology.computeScale && (
              <span>Compute: <span className="text-foreground/80">{paper.methodology.computeScale}</span></span>
            )}
          </div>
        )}
        {paper.approach && (
          <Field label="Approach" value={paper.approach} />
        )}
        {paper.keyInnovation && (
          <Field label="Innovation" value={paper.keyInnovation} />
        )}
        {paper.mainResult && (
          <Field label="Result" value={paper.mainResult} />
        )}
        {paper.takeaway && (
          <div className="rounded-md bg-primary/5 border border-primary/20 px-3 py-2">
            <p className="text-xs text-primary/80 font-medium mb-0.5">Takeaway</p>
            <p className="text-sm">{paper.takeaway}</p>
          </div>
        )}
        {paper.limitations && (
          <Field label="Limitations" value={Array.isArray(paper.limitations) ? paper.limitations.join(', ') : paper.limitations} muted />
        )}
        {paper.claims && paper.claims.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-2">
              Claims ({paper.claims.length})
            </p>
            <div className="space-y-2">
              {paper.claims.map((c: any, i: number) => {
                const statement = typeof c === 'string' ? c : c.statement ?? '';
                const evidence = typeof c === 'string' ? '' : c.evidence ?? '';
                const strength: string = typeof c === 'string' ? '' : c.strength ?? '';
                const strengthColor =
                  strength === 'strong' ? 'bg-emerald-500' :
                  strength === 'moderate' ? 'bg-amber-500' :
                  strength === 'weak' ? 'bg-rose-500' : 'bg-muted-foreground/30';
                const strengthLabel =
                  strength === 'strong' ? 'Strong' :
                  strength === 'moderate' ? 'Moderate' :
                  strength === 'weak' ? 'Weak' : '';

                return (
                  <div key={i} className="rounded-md border border-border bg-card p-2.5 space-y-1.5">
                    <div className="flex items-start gap-2">
                      {strengthLabel && (
                        <span className="flex items-center gap-1 shrink-0 mt-0.5">
                          <span className={`h-1.5 w-1.5 rounded-full ${strengthColor}`} />
                          <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
                            {strengthLabel}
                          </span>
                        </span>
                      )}
                      <p className="text-xs font-medium leading-snug flex-1">{statement}</p>
                    </div>
                    {evidence && (
                      <p className="text-[11px] text-muted-foreground leading-relaxed pl-0 border-l-2 border-primary/20 ml-0.5 pl-2">
                        {evidence}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Field({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground font-medium mb-0.5">{label}</p>
      <p className={`text-sm leading-snug ${muted ? 'text-muted-foreground' : ''}`}>{value}</p>
    </div>
  );
}
