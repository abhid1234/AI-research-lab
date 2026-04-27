'use client';

import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { OverviewTab } from './overview-tab';
import { InsightsTab } from './insights-tab';
import { ConnectionsTab } from './connections-tab';
import { PapersTab } from './papers-tab';
import { FrontiersTab } from './frontiers-tab';

export interface ArtifactItem {
  agentType: string;
  tabTarget: string;
  data: any;
}

interface ArtifactViewerProps {
  artifacts: ArtifactItem[];
  totalPaperCount?: number;
  dbPapers?: any[];
  topicName?: string;
  topicId?: string;
  lastSyncAt?: string | null;
  onOpenDrawer?: () => void;
}

const TAB_IDS = ['overview', 'papers', 'insights', 'frontiers', 'connections'] as const;
type TabId = typeof TAB_IDS[number];

const TAB_LABELS: Record<TabId, string> = {
  overview: 'Overview',
  insights: 'Insights',
  connections: 'Connections',
  papers: 'Papers',
  frontiers: 'Research Frontiers',
};

function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <>
      <span className="ml-1.5 text-[10px] text-foreground/30" aria-hidden="true">·</span>
      <span className="ml-1 text-[10px] text-foreground/65 tabular-nums tracking-tight">
        {count}
      </span>
    </>
  );
}

function getTabCount(
  tab: TabId,
  artifacts: ArtifactItem[],
  dbPapers?: any[],
  totalPaperCount?: number,
): number {
  // Papers tab — use real DB count, not the analyzer subset
  if (tab === 'papers') {
    if (typeof totalPaperCount === 'number') return totalPaperCount;
    if (dbPapers && dbPapers.length > 0) return dbPapers.length;
    const paperArtifact = artifacts.find((a) => a.agentType === 'paper-analyzer');
    return paperArtifact?.data?.papers?.length ?? 0;
  }

  // Overview tab — no badge (it's the default tab)
  if (tab === 'overview') return 0;

  if (artifacts.length === 0) return 0;

  if (tab === 'insights') {
    const contradictionArtifact = artifacts.find((a) => a.agentType === 'contradiction-finder');
    const benchmarkArtifact = artifacts.find((a) => a.agentType === 'benchmark-extractor');
    const contradictions: any[] = contradictionArtifact?.data?.contradictions ?? [];
    const consensus: any[] = contradictionArtifact?.data?.consensus ?? [];
    const openDebates: any[] = contradictionArtifact?.data?.openDebates ?? [];
    const warnings: any[] = benchmarkArtifact?.data?.warnings ?? [];
    return contradictions.length + consensus.length + openDebates.length + warnings.length;
  }

  if (tab === 'connections') {
    // Match ConnectionsTab.buildClustersFromDbPapers — group by affiliation,
    // falling back to first author's name when affiliation is missing.
    const sourcePapers = dbPapers && dbPapers.length > 0
      ? dbPapers
      : (artifacts.find((a) => a.agentType === 'paper-analyzer')?.data?.papers ?? []);
    const affiliations = new Set<string>();
    for (const p of sourcePapers) {
      const authors: any[] = Array.isArray(p.authors) ? p.authors : [];
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
      affiliations.add(affiliation);
    }
    // Cap at 12 to match the ConnectionsTab display
    return Math.min(affiliations.size, 12);
  }

  if (tab === 'frontiers') {
    const frontierArtifact = artifacts.find((a) => a.agentType === 'frontier-detector');
    return frontierArtifact?.data?.frontiers?.length ?? 0;
  }

  return 0;
}

export function ArtifactViewer({ artifacts, totalPaperCount, dbPapers, topicName, topicId, lastSyncAt, onOpenDrawer }: ArtifactViewerProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  // Some tabs aggregate multiple agent outputs — pass all artifacts and let each tab pick what it needs
  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)} className="flex flex-col h-full">
      <div className="border-b border-[color:var(--hairline)]">
        <div className="overflow-x-auto scrollbar-none px-6 pt-2 pb-0">
          <TabsList className="min-w-max gap-5">
            {TAB_IDS.map((id) => {
              const count = getTabCount(id, artifacts, dbPapers, totalPaperCount);
              return (
                <TabsTrigger key={id} value={id}>
                  {TAB_LABELS[id]}
                  <CountBadge count={count} />
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <TabsContent value="overview" className="p-4">
          <OverviewTab
            artifacts={artifacts}
            totalPaperCount={totalPaperCount}
            dbPapers={dbPapers}
            topicName={topicName}
            topicId={topicId}
            lastSyncAt={lastSyncAt}
            onOpenDrawer={onOpenDrawer}
            onSwitchTab={(tab) => setActiveTab(tab as TabId)}
          />
        </TabsContent>

        <TabsContent value="insights" className="p-4">
          <InsightsTab artifacts={artifacts} dbPapers={dbPapers} />
        </TabsContent>

        <TabsContent value="connections" className="p-4">
          <ConnectionsTab artifacts={artifacts} dbPapers={dbPapers} />
        </TabsContent>

        <TabsContent value="papers" className="p-4">
          <PapersTab artifacts={artifacts} dbPapers={dbPapers} />
        </TabsContent>

        <TabsContent value="frontiers" className="p-4">
          <FrontiersTab artifacts={artifacts} dbPapers={dbPapers} />
        </TabsContent>
      </div>
    </Tabs>
  );
}
