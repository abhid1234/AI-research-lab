'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { TopicSelector } from '@/components/layout/topic-selector';
import { JobStatusBar } from '@/components/layout/job-status-bar';
import { ArtifactViewer, type ArtifactItem } from '@/components/artifacts/artifact-viewer';
import { ErrorBoundary } from '@/components/error-boundary';
import { ChatModal } from '@/components/layout/chat-modal';

export default function Home() {
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [artifacts, setArtifacts] = useState<ArtifactItem[]>([]);
  const [latestJobId, setLatestJobId] = useState<string | null>(null);
  const [loadingArtifacts, setLoadingArtifacts] = useState(false);
  const [paperCount, setPaperCount] = useState<number | undefined>(undefined);
  const [topicCount, setTopicCount] = useState<number | undefined>(undefined);
  const [dateRange, setDateRange] = useState<string | undefined>(undefined);
  const [dbPapers, setDbPapers] = useState<any[]>([]);
  const [topicName, setTopicName] = useState<string>('');
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

  // Fetch total topic count once
  useEffect(() => {
    fetch('/api/topics')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setTopicCount(data.length);
        }
      })
      .catch(() => {});
  }, []);

  const fetchArtifacts = useCallback(async (topicId: string) => {
    setLoadingArtifacts(true);
    try {
      const res = await fetch(`/api/topics/${topicId}`);
      if (!res.ok) return;
      const { topic: topicData, artifacts: raw, papers: dbPapersRaw } = await res.json();

      // Use real paper count from database topic record
      if (topicData?.paperCount) {
        setPaperCount(topicData.paperCount);
      }
      if (topicData?.name) {
        setTopicName(topicData.name);
      }
      setLastSyncAt(topicData?.lastSyncAt ?? null);

      // Store DB papers for charts
      if (Array.isArray(dbPapersRaw)) {
        setDbPapers(dbPapersRaw);
      }

      if (Array.isArray(raw)) {
        const mapped: ArtifactItem[] = raw.map((a: any) => ({
          agentType: a.agentType ?? a.agent_type ?? '',
          tabTarget: a.tabTarget ?? a.tab_target ?? 'overview',
          data: typeof a.data === 'string' ? JSON.parse(a.data) : (a.data ?? {}),
        }));
        setArtifacts(mapped);
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
    <ErrorBoundary>
      <ChatModal />
      <AppShell
        paperCount={paperCount}
        topicCount={topicCount}
        dateRange={dateRange}
        selectedTopicId={selectedTopicId}
        exportTopic={topicName}
        exportPapers={dbPapers}
        exportArtifacts={artifacts}
      >
        <main className="flex flex-1 flex-col overflow-hidden">
          <div className="artifact-panel flex flex-col flex-1 overflow-hidden">
            {/* Topic selector toolbar */}
            <div className="flex items-center gap-3 border-b border-[oklch(0.9_0_0)] px-4 h-12 shrink-0">
              <span className="text-xs text-[oklch(0.45_0_0)] font-medium">Topic</span>
              <TopicSelector
                selectedId={selectedTopicId}
                onChange={handleTopicChange}
              />
              {selectedTopicId && (
                <button
                  onClick={() => fetchArtifacts(selectedTopicId)}
                  className="ml-auto text-xs text-[oklch(0.45_0_0)] hover:text-[oklch(0.145_0_0)] transition-colors"
                >
                  Refresh
                </button>
              )}
            </div>

            {/* Artifact viewer */}
            <div className="flex-1 overflow-hidden">
              {loadingArtifacts ? (
                <div className="flex items-center justify-center h-full text-[oklch(0.45_0_0)] text-sm">
                  Loading artifacts...
                </div>
              ) : (
                <ArtifactViewer
                  artifacts={artifacts}
                  totalPaperCount={paperCount}
                  dbPapers={dbPapers}
                  topicName={topicName}
                  lastSyncAt={lastSyncAt}
                />
              )}
            </div>

            {/* Job status bar */}
            <JobStatusBar jobId={latestJobId} />
          </div>
        </main>
      </AppShell>
    </ErrorBoundary>
  );
}
