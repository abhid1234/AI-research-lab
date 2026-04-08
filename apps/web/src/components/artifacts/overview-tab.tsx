'use client';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TopicEvolutionChart } from '@/components/charts/topic-evolution';

interface OverviewTabProps {
  artifacts: { agentType: string; data: any }[];
}

export function OverviewTab({ artifacts }: OverviewTabProps) {
  const trendArtifact = artifacts.find((a) => a.agentType === 'trend-mapper');
  const paperArtifact = artifacts.find((a) => a.agentType === 'paper-analyzer');

  const trendData = trendArtifact?.data ?? {};
  const paperData = paperArtifact?.data ?? {};

  const papers: any[] = paperData.papers ?? [];
  const topicEvolution: any[] = trendData.topicEvolution ?? [];
  const emergingTopics: any[] = trendData.emergingTopics ?? [];
  const methodShifts: any[] = trendData.methodShifts ?? [];

  const insightCount =
    (trendData.emergingTopics?.length ?? 0) +
    (trendData.methodShifts?.length ?? 0);

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Papers" value={papers.length} />
        <StatCard label="Topics Tracked" value={topicEvolution.length} />
        <StatCard label="Insights" value={insightCount} />
        <StatCard label="Emerging Topics" value={emergingTopics.length} />
      </div>

      {/* Topic Evolution chart */}
      <Card>
        <CardHeader>
          <CardTitle>Topic Evolution</CardTitle>
          <CardDescription>Monthly paper volume per topic</CardDescription>
        </CardHeader>
        <CardContent>
          <TopicEvolutionChart data={topicEvolution} />
        </CardContent>
      </Card>

      {/* Key results from paper-analyzer */}
      {papers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Key Results</CardTitle>
            <CardDescription>Main takeaways from analyzed papers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {papers.slice(0, 5).map((p, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <span className="shrink-0 text-xs text-muted-foreground mt-0.5 font-mono w-4">{i + 1}.</span>
                  <div>
                    <p className="text-sm font-medium leading-snug">{p.mainResult ?? p.takeaway ?? '—'}</p>
                    {p.paperId && (
                      <p className="text-xs text-muted-foreground mt-0.5">{p.paperId}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Method adoption */}
      {methodShifts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Method Shifts</CardTitle>
            <CardDescription>How methodologies are evolving</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {methodShifts.map((m, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-xs"
                >
                  <span className="text-muted-foreground">{m.method}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="font-medium">{m.replacedBy ?? m.status}</span>
                  <Badge variant="outline" className="ml-1 text-[10px]">
                    {m.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {papers.length === 0 && topicEvolution.length === 0 && (
        <EmptyState message="Run an analysis to populate the overview." />
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card size="sm">
      <CardContent className="pt-3">
        <p className="text-2xl font-bold tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </CardContent>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
      {message}
    </div>
  );
}
