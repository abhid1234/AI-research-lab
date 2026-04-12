'use client';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CitationGraph } from '@/components/charts/citation-graph';

function paperLink(id: string | undefined, title?: string): string {
  if (!id) return title ? `https://scholar.google.com/scholar?q=${encodeURIComponent(title)}` : '#';
  if (id.includes('arxiv.org')) return id;
  if (id.includes('.') || id.includes('/')) return `https://arxiv.org/abs/${id}`;
  return `https://scholar.google.com/scholar?q=${encodeURIComponent(title ?? id)}`;
}

interface ConnectionsTabProps {
  artifacts: { agentType: string; data: any }[];
  dbPapers?: any[];
}

interface ClusterEntry {
  affiliation: string;
  paperCount: number;
  sampleTitles: string[];
}

function buildClustersFromDbPapers(dbPapers: any[]): ClusterEntry[] {
  const map: Record<string, { count: number; titles: Set<string> }> = {};

  for (const paper of dbPapers) {
    const authors: any[] = Array.isArray(paper.authors) ? paper.authors : [];
    const title: string = typeof paper.title === 'string' ? paper.title : '';

    let affiliation = 'Independent';
    for (const author of authors) {
      if (typeof author === 'object' && author !== null) {
        if (typeof author.affiliation === 'string' && author.affiliation.trim()) {
          affiliation = author.affiliation.trim();
          break;
        }
      }
    }
    if (affiliation === 'Independent' && authors.length > 0) {
      const first = authors[0];
      const name = typeof first === 'string' ? first : (typeof first?.name === 'string' ? first.name : '');
      if (name) affiliation = name;
    }

    if (!map[affiliation]) map[affiliation] = { count: 0, titles: new Set() };
    map[affiliation].count += 1;
    if (title) map[affiliation].titles.add(title);
  }

  return Object.entries(map)
    .map(([affiliation, { count, titles }]) => ({
      affiliation,
      paperCount: count,
      sampleTitles: Array.from(titles).slice(0, 3),
    }))
    .sort((a, b) => b.paperCount - a.paperCount)
    .slice(0, 10);
}

export function ConnectionsTab({ artifacts, dbPapers = [] }: ConnectionsTabProps) {
  const paperArtifact = artifacts.find((a) => a.agentType === 'paper-analyzer');
  const trendArtifact = artifacts.find((a) => a.agentType === 'trend-mapper');

  const papers: any[] = paperArtifact?.data?.papers ?? [];
  const emergingTopics: any[] = trendArtifact?.data?.emergingTopics ?? [];

  const topPapers = [...papers].slice(0, 10);

  const dbClusters: ClusterEntry[] = dbPapers.length > 0
    ? buildClustersFromDbPapers(dbPapers)
    : [];

  const authorMap: Record<string, string[]> = {};
  if (dbClusters.length === 0) {
    for (const p of papers) {
      if (p.authors) {
        for (const author of p.authors) {
          const affiliation = author.affiliation ?? 'Unknown';
          if (!authorMap[affiliation]) authorMap[affiliation] = [];
          authorMap[affiliation].push(typeof author === 'string' ? author : author.name ?? String(author));
        }
      }
    }
  }
  const legacyClusters = Object.entries(authorMap).slice(0, 8);

  const hasData = topPapers.length > 0 || dbClusters.length > 0 || legacyClusters.length > 0 || emergingTopics.length > 0;

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-40">
          <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
        <p className="text-sm">No connections yet. Run an analysis to map paper relationships.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Citation Graph — keep as-is, charts need space */}
      {dbPapers.length > 0 && (
        <section>
          <Card>
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-sm font-semibold">Paper Relationships</CardTitle>
              <CardDescription className="text-xs">
                Papers by research category and publication date ({dbPapers.length} total)
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <CitationGraph papers={dbPapers} />
            </CardContent>
          </Card>
        </section>
      )}

      {/* Key papers */}
      {topPapers.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Key Papers
          </h3>
          <div className="space-y-1.5">
            {topPapers.map((p, i) => {
              const title: string = typeof p.title === 'string' ? p.title : (p.paperId ?? `Paper ${i + 1}`);
              const pid: string = typeof p.paperId === 'string' ? p.paperId : typeof p.id === 'string' ? p.id : '';
              return (
                <div key={i} className="flex items-start gap-2 rounded-md border border-border bg-card px-3 py-2">
                  <span className="shrink-0 tabular-nums text-[10px] text-muted-foreground mt-0.5 w-4">{i + 1}.</span>
                  <div className="min-w-0 flex-1">
                    <a
                      href={paperLink(pid || undefined, title)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium leading-snug block hover:text-primary transition-colors underline-offset-2 hover:underline line-clamp-1"
                    >
                      {title}
                    </a>
                    {p.keyInnovation && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{typeof p.keyInnovation === 'string' ? p.keyInnovation : ''}</p>
                    )}
                  </div>
                  {p.methodology && (
                    <Badge variant="outline" className="shrink-0 text-[9px] py-0">{typeof p.methodology === 'string' ? p.methodology : p.methodology?.type ?? 'empirical'}</Badge>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Emerging topics */}
      {emergingTopics.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Emerging Topic Clusters
          </h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {emergingTopics.map((t: any, i: number) => (
              <Card key={i}>
                <CardHeader className="p-2 pb-1">
                  <CardTitle className="text-xs font-semibold">{typeof t.topic === 'string' ? t.topic : ''}</CardTitle>
                  <CardDescription className="text-[10px]">
                    {t.paperCount != null ? `${t.paperCount} papers` : ''}
                  </CardDescription>
                </CardHeader>
                {t.whyItMatters && (
                  <CardContent className="px-2 pb-2 pt-0">
                    <p className="text-[10px] text-muted-foreground line-clamp-2">{typeof t.whyItMatters === 'string' ? t.whyItMatters : ''}</p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Author clusters from DB papers — 3-col on wide screens */}
      {dbClusters.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
            Author Clusters by Affiliation
          </h3>
          <p className="text-[10px] text-muted-foreground mb-2">
            Top {dbClusters.length} research groups across {dbPapers.length} papers.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {dbClusters.map((cluster, i) => (
              <Card key={i}>
                <CardContent className="p-2">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-xs font-semibold leading-snug truncate">{cluster.affiliation}</p>
                    <Badge variant="secondary" className="shrink-0 text-[9px] py-0 tabular-nums">
                      {cluster.paperCount}p
                    </Badge>
                  </div>
                  {cluster.sampleTitles.length > 0 && (
                    <ul className="space-y-0.5">
                      {cluster.sampleTitles.slice(0, 3).map((t, j) => (
                        <li key={j} className="text-[10px] text-muted-foreground leading-snug line-clamp-1">
                          · {t}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Legacy author clusters (fallback) */}
      {dbClusters.length === 0 && legacyClusters.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Author Clusters by Affiliation
          </h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {legacyClusters.map(([affiliation, authors], i) => (
              <Card key={i}>
                <CardContent className="p-2">
                  <p className="text-[10px] font-medium text-muted-foreground mb-1">{affiliation}</p>
                  <div className="flex flex-wrap gap-1">
                    {authors.map((a, j) => (
                      <Badge key={j} variant="secondary" className="text-[9px] py-0">{a}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
