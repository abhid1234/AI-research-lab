'use client';

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

export function ArtifactViewer({ artifacts }: ArtifactViewerProps) {
  // Group artifacts by tabTarget, also include all artifacts for tabs that need cross-agent data
  const byTab = (tab: TabId) =>
    artifacts.filter((a) => a.tabTarget === tab || a.tabTarget === 'all');

  // Some tabs aggregate multiple agent outputs — pass all artifacts and let each tab pick what it needs
  return (
    <Tabs defaultValue="overview" className="h-full flex flex-col">
      <div className="px-4 pt-3 border-b border-border">
        <TabsList>
          {TAB_IDS.map((id) => (
            <TabsTrigger key={id} value={id}>
              {TAB_LABELS[id]}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      <div className="flex-1 overflow-y-auto">
        <TabsContent value="overview" className="p-4 h-full">
          <OverviewTab artifacts={artifacts} />
        </TabsContent>

        <TabsContent value="insights" className="p-4 h-full">
          <InsightsTab artifacts={artifacts} />
        </TabsContent>

        <TabsContent value="connections" className="p-4 h-full">
          <ConnectionsTab artifacts={artifacts} />
        </TabsContent>

        <TabsContent value="papers" className="p-4 h-full">
          <PapersTab artifacts={artifacts} />
        </TabsContent>

        <TabsContent value="frontiers" className="p-4 h-full">
          <FrontiersTab artifacts={artifacts} />
        </TabsContent>
      </div>
    </Tabs>
  );
}
