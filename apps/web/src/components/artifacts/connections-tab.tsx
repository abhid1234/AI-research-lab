'use client';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ConnectionsTabProps {
  artifacts: { agentType: string; data: any }[];
}

export function ConnectionsTab({ artifacts }: ConnectionsTabProps) {
  const paperArtifact = artifacts.find((a) => a.agentType === 'paper-analyzer');
  const trendArtifact = artifacts.find((a) => a.agentType === 'trend-mapper');

  const papers: any[] = paperArtifact?.data?.papers ?? [];
  const emergingTopics: any[] = trendArtifact?.data?.emergingTopics ?? [];

  // Sort papers by citation proxy (mainResult length as a heuristic, or just show all)
  const topPapers = [...papers].slice(0, 10);

  // Build author clusters from paper data if available
  const authorMap: Record<string, string[]> = {};
  for (const p of papers) {
    if (p.authors) {
      for (const author of p.authors) {
        const affiliation = author.affiliation ?? 'Unknown';
        if (!authorMap[affiliation]) authorMap[affiliation] = [];
        authorMap[affiliation].push(author.name ?? author);
      }
    }
  }
  const clusters = Object.entries(authorMap).slice(0, 8);

  const hasData = topPapers.length > 0 || clusters.length > 0 || emergingTopics.length > 0;

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
                      <Badge variant="outline" className="mt-1.5 text-[10px]">{p.methodology}</Badge>
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

      {/* Author clusters (if author data exists) */}
      {clusters.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Author Clusters by Affiliation
          </h3>
          <div className="space-y-2">
            {clusters.map(([affiliation, authors], i) => (
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
