'use client';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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

    // Determine affiliation: first try author.affiliation, then first author name, then "Independent"
    let affiliation = 'Independent';
    for (const author of authors) {
      if (typeof author === 'object' && author !== null) {
        if (typeof author.affiliation === 'string' && author.affiliation.trim()) {
          affiliation = author.affiliation.trim();
          break;
        }
      }
    }
    // Fall back to first author name
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

  // Sort papers by citation proxy (mainResult length as a heuristic, or just show all)
  const topPapers = [...papers].slice(0, 10);

  // Enhanced clusters: prefer dbPapers (real data), fall back to artifact papers
  const dbClusters: ClusterEntry[] = dbPapers.length > 0
    ? buildClustersFromDbPapers(dbPapers)
    : [];

  // Legacy clusters from artifact data (used if no dbPapers)
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
      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
        No connection data available yet. Run an analysis to map paper connections.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Most cited / key papers */}
      {topPapers.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Key Papers
          </h3>
          <div className="space-y-2">
            {topPapers.map((p, i) => (
              <Card key={i} size="sm">
                <CardContent className="pt-3 flex items-start gap-3">
                  <span className="shrink-0 tabular-nums text-xs text-muted-foreground mt-0.5 w-5">{i + 1}.</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-snug truncate">{p.paperId ?? `Paper ${i + 1}`}</p>
                    {p.keyInnovation && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{p.keyInnovation}</p>
                    )}
                    {p.methodology && (
                      <Badge variant="outline" className="mt-1.5 text-[10px]">{typeof p.methodology === 'string' ? p.methodology : p.methodology?.type ?? 'empirical'}</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Emerging topics as a network proxy */}
      {emergingTopics.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Emerging Topic Clusters
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {emergingTopics.map((t: any, i: number) => (
              <Card key={i} size="sm">
                <CardHeader>
                  <CardTitle className="text-sm">{t.topic}</CardTitle>
                  <CardDescription>
                    {t.paperCount != null ? `${t.paperCount} papers` : ''}
                  </CardDescription>
                </CardHeader>
                {t.whyItMatters && (
                  <CardContent>
                    <p className="text-xs text-muted-foreground">{t.whyItMatters}</p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Enhanced author clusters from DB papers */}
      {dbClusters.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Author Clusters by Affiliation
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            Top {dbClusters.length} research groups by paper count across {dbPapers.length} ingested papers.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {dbClusters.map((cluster, i) => (
              <Card key={i} size="sm">
                <CardHeader className="pb-1">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-sm leading-snug truncate">{cluster.affiliation}</CardTitle>
                    <Badge variant="secondary" className="shrink-0 tabular-nums">
                      {cluster.paperCount} paper{cluster.paperCount !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                </CardHeader>
                {cluster.sampleTitles.length > 0 && (
                  <CardContent>
                    <ul className="space-y-1">
                      {cluster.sampleTitles.map((t, j) => (
                        <li key={j} className="text-[11px] text-muted-foreground leading-snug line-clamp-1">
                          · {t}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Legacy author clusters (fallback when no dbPapers) */}
      {dbClusters.length === 0 && legacyClusters.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Author Clusters by Affiliation
          </h3>
          <div className="space-y-2">
            {legacyClusters.map(([affiliation, authors], i) => (
              <Card key={i} size="sm">
                <CardContent className="pt-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">{affiliation}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {authors.map((a, j) => (
                      <Badge key={j} variant="secondary" className="text-xs">{a}</Badge>
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
