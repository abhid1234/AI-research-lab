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
  lastSyncAt?: string | null;
  onOpenDrawer?: () => void;
}

const TAB_IDS = ['overview', 'insights', 'connections', 'papers', 'frontiers'] as const;
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
    <span className="ml-1.5 text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full tabular-nums">
      {count}
    </span>
  );
}

function getTabCount(tab: TabId, artifacts: ArtifactItem[]): number {
  if (artifacts.length === 0) return 0;

  if (tab === 'overview' || tab === 'papers') {
    const paperArtifact = artifacts.find((a) => a.agentType === 'paper-analyzer');
    return paperArtifact?.data?.papers?.length ?? 0;
  }

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
    const paperArtifact = artifacts.find((a) => a.agentType === 'paper-analyzer');
    const papers: any[] = paperArtifact?.data?.papers ?? [];
    // Count unique author affiliations (clusters)
    const affiliations = new Set<string>();
    for (const p of papers) {
      if (Array.isArray(p.authors)) {
        for (const author of p.authors) {
          affiliations.add(author.affiliation ?? 'Unknown');
        }
      }
    }
    return affiliations.size;
  }

  if (tab === 'frontiers') {
    const frontierArtifact = artifacts.find((a) => a.agentType === 'frontier-detector');
    return frontierArtifact?.data?.frontiers?.length ?? 0;
  }

  return 0;
}

export function ArtifactViewer({ artifacts, totalPaperCount, dbPapers, topicName, lastSyncAt, onOpenDrawer }: ArtifactViewerProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  // Some tabs aggregate multiple agent outputs — pass all artifacts and let each tab pick what it needs
  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)} className="flex flex-col h-full">
      <div className="border-b border-border">
        <div className="overflow-x-auto scrollbar-none px-4 pt-3 pb-0.5">
          <TabsList className="min-w-max">
            {TAB_IDS.map((id) => {
              const count = getTabCount(id, artifacts);
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
            lastSyncAt={lastSyncAt}
            onOpenDrawer={onOpenDrawer}
            onSwitchTab={(tab) => setActiveTab(tab as TabId)}
          />
        </TabsContent>

        <TabsContent value="insights" className="p-4">
          <InsightsTab artifacts={artifacts} />
        </TabsContent>

        <TabsContent value="connections" className="p-4">
          <ConnectionsTab artifacts={artifacts} dbPapers={dbPapers} />
        </TabsContent>

        <TabsContent value="papers" className="p-4">
          <PapersTab artifacts={artifacts} />
        </TabsContent>

        <TabsContent value="frontiers" className="p-4">
          <FrontiersTab artifacts={artifacts} />
        </TabsContent>
      </div>
    </Tabs>
  );
}
