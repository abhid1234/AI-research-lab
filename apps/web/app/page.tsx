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

  // On mount, read topic from URL query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const topicFromUrl = params.get('topic');
    if (topicFromUrl) {
      setSelectedTopicId(topicFromUrl);
    }
  }, []);

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

  // Listen for topic-change events dispatched by the TopicRecommendations widget
  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent<{ id: string }>).detail?.id;
      if (typeof id === 'string') handleTopicChange(id);
    };
    window.addEventListener('topic-change', handler);
    return () => window.removeEventListener('topic-change', handler);
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
    // Update URL without navigation
    const url = new URL(window.location.href);
    url.searchParams.set('topic', id);
    window.history.replaceState({}, '', url.toString());
  };

  return (
    <ErrorBoundary>
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
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Topic selector toolbar */}
            <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 min-h-12 py-2 shrink-0">
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
                <div className="p-4 space-y-6 animate-pulse">
                  {/* Skeleton stat cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="rounded-xl bg-muted h-[76px]" />
                    ))}
                  </div>
                  {/* Skeleton banner */}
                  <div className="h-4 w-3/4 rounded bg-muted" />
                  {/* Skeleton charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="rounded-lg bg-muted h-[340px]" />
                    <div className="rounded-lg bg-muted h-[340px]" />
                  </div>
                  {/* Skeleton content */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="rounded-lg bg-muted h-[200px]" />
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="rounded-lg bg-muted h-[80px]" />
                      ))}
                    </div>
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
