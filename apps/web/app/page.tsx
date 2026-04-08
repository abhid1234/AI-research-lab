'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { TopicSelector } from '@/components/layout/topic-selector';
import { JobStatusBar } from '@/components/layout/job-status-bar';
import { ChatPanel } from '@/components/chat/chat-panel';
import { ArtifactViewer, type ArtifactItem } from '@/components/artifacts/artifact-viewer';

export default function Home() {
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [artifacts, setArtifacts] = useState<ArtifactItem[]>([]);
  const [latestJobId, setLatestJobId] = useState<string | null>(null);
  const [loadingArtifacts, setLoadingArtifacts] = useState(false);

  const fetchArtifacts = useCallback(async (topicId: string) => {
    setLoadingArtifacts(true);
    try {
      const res = await fetch(`/api/topics/${topicId}`);
      if (!res.ok) return;
      const { artifacts: raw } = await res.json();
      if (Array.isArray(raw)) {
        setArtifacts(
          raw.map((a: any) => ({
            agentType: a.agentType ?? a.agent_type ?? '',
            tabTarget: a.tabTarget ?? a.tab_target ?? 'overview',
            data: typeof a.data === 'string' ? JSON.parse(a.data) : (a.data ?? {}),
          }))
        );
      }
    } catch {
      setArtifacts([]);
    } finally {
      setLoadingArtifacts(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTopicId) {
      fetchArtifacts(selectedTopicId);
    }
  }, [selectedTopicId, fetchArtifacts]);

  const handleTopicChange = (id: string) => {
    setSelectedTopicId(id);
    setArtifacts([]);
    setLatestJobId(null);
  };

  return (
    <AppShell>
      {/* Left panel: chat */}
      <aside className="w-[340px] shrink-0 border-r border-border flex flex-col overflow-hidden">
        <ChatPanel />
      </aside>

      {/* Right panel: artifacts */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Topic selector toolbar */}
        <div className="flex items-center gap-3 border-b border-border px-4 h-12 shrink-0">
          <span className="text-xs text-muted-foreground font-medium">Topic</span>
          <TopicSelector
            selectedId={selectedTopicId}
            onChange={handleTopicChange}
          />
          {selectedTopicId && (
            <button
              onClick={() => fetchArtifacts(selectedTopicId)}
              className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Refresh
            </button>
          )}
        </div>

        {/* Artifact viewer */}
        <div className="flex-1 overflow-hidden">
          {loadingArtifacts ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              Loading artifacts...
            </div>
          ) : (
            <ArtifactViewer artifacts={artifacts} />
          )}
        </div>

        {/* Job status bar */}
        <JobStatusBar jobId={latestJobId} />
      </main>
    </AppShell>
  );
}
