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
            <p className="text-xs text-muted-foreground font-medium mb-1.5">Claims</p>
            <div className="flex flex-wrap gap-1.5">
              {paper.claims.map((c: any, i: number) => (
                <Badge key={i} variant="secondary" className="text-[10px]">{typeof c === 'string' ? c : c.statement ?? JSON.stringify(c)}</Badge>
              ))}
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
