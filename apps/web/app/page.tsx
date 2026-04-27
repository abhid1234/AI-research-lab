'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { TopicSelector } from '@/components/layout/topic-selector';
import { JobStatusBar } from '@/components/layout/job-status-bar';
import { ArtifactViewer, type ArtifactItem } from '@/components/artifacts/artifact-viewer';
import { ErrorBoundary } from '@/components/error-boundary';
import { PaperDrawer } from '@/components/layout/paper-drawer';

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
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Fetch total topic count once. Exclude meta-collections ("All AI Papers")
  // so the header reads "9 topics" — same number as the dropdown's content
  // categories and the Overview "Topics" stat.
  useEffect(() => {
    fetch('/api/topics')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const contentTopics = data.filter(
            (t: { name?: string }) => t.name !== 'All AI Papers',
          );
          setTopicCount(contentTopics.length);
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
      <AppShell
        paperCount={paperCount}
        topicCount={topicCount}
        dateRange={dateRange}
        lastSyncAt={lastSyncAt}
        selectedTopicId={selectedTopicId}
        exportTopic={topicName}
        exportPapers={dbPapers}
        exportArtifacts={artifacts}
      >
        <main className="flex flex-1 flex-col overflow-hidden">
          <div className="flex flex-col flex-1 overflow-hidden mx-auto w-full max-w-[1400px]">
            {/* Topic selector toolbar */}
            <div className="flex flex-wrap items-center gap-4 border-b border-[color:var(--hairline)] px-6 min-h-12 py-2.5 shrink-0">
              <span className="text-eyebrow shrink-0">Topic</span>
              <TopicSelector
                selectedId={selectedTopicId}
                onChange={handleTopicChange}
              />
              {selectedTopicId && (
                <button
                  onClick={() => fetchArtifacts(selectedTopicId)}
                  className="ml-auto inline-flex h-10 items-center gap-1.5 px-3 -mx-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors tracking-tight rounded-md"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="23 4 23 10 17 10" />
                    <polyline points="1 20 1 14 7 14" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </svg>
                  Refresh
                </button>
              )}
            </div>

            {/* Artifact viewer */}
            <div className="flex-1 overflow-hidden">
              {loadingArtifacts ? (
                <div className="p-6 space-y-6 animate-pulse">
                  <div className="space-y-2">
                    <div className="h-4 w-24 rounded bg-[color:var(--bare-card-tint)]" />
                    <div className="h-3 w-72 rounded bg-[color:var(--bare-card-tint)]" />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="space-y-1.5">
                        <div className="h-2.5 w-12 rounded bg-[color:var(--bare-card-tint)]" />
                        <div className="h-7 w-20 rounded bg-[color:var(--bare-card-tint)]" />
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="rounded-lg bg-[color:var(--bare-card-tint)] h-[300px]" />
                    <div className="rounded-lg bg-[color:var(--bare-card-tint)] h-[300px]" />
                  </div>
                </div>
              ) : (
                <ArtifactViewer
                  artifacts={artifacts}
                  totalPaperCount={paperCount}
                  dbPapers={dbPapers}
                  topicName={topicName}
                  topicId={selectedTopicId ?? undefined}
                  lastSyncAt={lastSyncAt}
                  onOpenDrawer={() => setDrawerOpen(true)}
                />
              )}
            </div>

            {/* Job status bar */}
            <JobStatusBar jobId={latestJobId} />
          </div>
        </main>
      </AppShell>
      <PaperDrawer
        papers={dbPapers}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </ErrorBoundary>
  );
}
