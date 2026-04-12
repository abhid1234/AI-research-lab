'use client';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CitationGraph } from '@/components/charts/citation-graph';
import { EmptyState } from '@/components/ui/empty-state';
import { paperLink } from '@/lib/paper-utils';

interface ConnectionsTabProps {
  artifacts: { agentType: string; data: any }[];
  dbPapers?: any[];
}

interface ClusterPaper {
  title: string;
  paperId: string;
  arxivId: string;
}

interface ClusterEntry {
  affiliation: string;
  paperCount: number;
  samplePapers: ClusterPaper[];
}

function buildClustersFromDbPapers(dbPapers: any[]): ClusterEntry[] {
  const map: Record<string, { count: number; papers: Map<string, ClusterPaper> }> = {};

  for (const paper of dbPapers) {
    const authors: any[] = Array.isArray(paper.authors) ? paper.authors : [];
    const title: string = typeof paper.title === 'string' ? paper.title : '';
    const paperId: string = typeof paper.paperId === 'string' ? paper.paperId : typeof paper.id === 'string' ? paper.id : '';
    const arxivId: string = typeof paper.arxivId === 'string' ? paper.arxivId : typeof paper.arxiv_id === 'string' ? paper.arxiv_id : '';

    // Affiliation: prefer author.affiliation, fall back to first author's last name token
    let affiliation = '';
    for (const author of authors) {
      if (typeof author === 'object' && author !== null && typeof author.affiliation === 'string' && author.affiliation.trim()) {
        affiliation = author.affiliation.trim();
        break;
      }
    }
    if (!affiliation && authors.length > 0) {
      const first = authors[0];
      const name = typeof first === 'string' ? first : (typeof first?.name === 'string' ? first.name : '');
      if (name) affiliation = name;
    }
    if (!affiliation) affiliation = 'Independent';

    if (!map[affiliation]) map[affiliation] = { count: 0, papers: new Map() };
    map[affiliation].count += 1;
    if (title) map[affiliation].papers.set(title, { title, paperId, arxivId });
  }

  return Object.entries(map)
    .map(([affiliation, { count, papers }]) => ({
      affiliation,
      paperCount: count,
      samplePapers: Array.from(papers.values()).slice(0, 3),
    }))
    .sort((a, b) => b.paperCount - a.paperCount)
    .slice(0, 12);
}

export function ConnectionsTab({ dbPapers = [] }: ConnectionsTabProps) {
  const dbClusters = dbPapers.length > 0 ? buildClustersFromDbPapers(dbPapers) : [];

  if (dbPapers.length === 0 && dbClusters.length === 0) {
    return (
      <EmptyState
        icon={
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
        }
        title="No connections yet"
        description="Ingest papers to map relationships."
      />
    );
  }

  // Stats
  const uniqueCategories = new Set<string>();
  for (const p of dbPapers) {
    const cats = Array.isArray(p.categories) ? p.categories : [];
    for (const c of cats) if (typeof c === 'string') uniqueCategories.add(c);
  }

  return (
    <div className="space-y-4">
      {/* Compact summary bar */}
      <div className="flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-2">
        <p className="text-xs font-semibold text-foreground mr-2">Connections</p>
        <span className="flex items-center gap-1.5">
          <span className="text-sm font-bold tabular-nums">{dbPapers.length}</span>
          <span className="text-[10px] text-muted-foreground">papers</span>
        </span>
        <span className="text-muted-foreground/30">·</span>
        <span className="flex items-center gap-1.5">
          <span className="text-sm font-bold tabular-nums">{dbClusters.length}</span>
          <span className="text-[10px] text-muted-foreground">research groups</span>
        </span>
        <span className="text-muted-foreground/30">·</span>
        <span className="flex items-center gap-1.5">
          <span className="text-sm font-bold tabular-nums">{uniqueCategories.size}</span>
          <span className="text-[10px] text-muted-foreground">categories</span>
        </span>
      </div>

      {/* Paper Relationships chart */}
      {dbPapers.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm font-semibold">Paper Relationships</CardTitle>
            <CardDescription className="text-xs">
              Papers plotted by research category and publication date — click any dot to view the source
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <CitationGraph papers={dbPapers} />
          </CardContent>
        </Card>
      )}

      {/* Author Clusters by Affiliation */}
      {dbClusters.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm font-semibold">Author Clusters by Affiliation</CardTitle>
            <CardDescription className="text-xs">
              Top {dbClusters.length} research groups across {dbPapers.length} papers — click any title to read
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {dbClusters.map((cluster, i) => (
                <div
                  key={i}
                  className="rounded-md border border-border bg-card/50 p-2 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-xs font-semibold leading-snug truncate" title={cluster.affiliation}>
                      {cluster.affiliation}
                    </p>
                    <Badge variant="secondary" className="shrink-0 text-[9px] py-0 tabular-nums">
                      {cluster.paperCount}
                    </Badge>
                  </div>
                  {cluster.samplePapers.length > 0 && (
                    <ul className="space-y-0.5">
                      {cluster.samplePapers.map((p, j) => (
                        <li key={j}>
                          <a
                            href={paperLink(p.arxivId || p.paperId || undefined, p.title)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-muted-foreground leading-snug line-clamp-1 hover:text-primary transition-colors hover:underline underline-offset-2 block"
                            title={p.title}
                          >
                            · {p.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
