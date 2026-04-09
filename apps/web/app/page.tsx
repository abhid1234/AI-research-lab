'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { TopicSelector } from '@/components/layout/topic-selector';
import { JobStatusBar } from '@/components/layout/job-status-bar';
import { PanelToggle } from '@/components/layout/panel-toggle';
import dynamic from 'next/dynamic';
const ChatPanel = dynamic(() => import('@/components/chat/chat-panel').then(m => ({ default: m.ChatPanel })), { ssr: false });
import { ArtifactViewer, type ArtifactItem } from '@/components/artifacts/artifact-viewer';
import { ErrorBoundary } from '@/components/error-boundary';

export default function Home() {
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [artifacts, setArtifacts] = useState<ArtifactItem[]>([]);
  const [latestJobId, setLatestJobId] = useState<string | null>(null);
  const [loadingArtifacts, setLoadingArtifacts] = useState(false);
  const [paperCount, setPaperCount] = useState<number | undefined>(undefined);
  const [topicCount, setTopicCount] = useState<number | undefined>(undefined);
  const [dateRange, setDateRange] = useState<string | undefined>(undefined);
  const [isMaximized, setIsMaximized] = useState(false);

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
      const { artifacts: raw } = await res.json();
      if (Array.isArray(raw)) {
        const mapped: ArtifactItem[] = raw.map((a: any) => ({
          agentType: a.agentType ?? a.agent_type ?? '',
          tabTarget: a.tabTarget ?? a.tab_target ?? 'overview',
          data: typeof a.data === 'string' ? JSON.parse(a.data) : (a.data ?? {}),
        }));
        setArtifacts(mapped);

        // Derive header stats from paper-analyzer artifact
        const paperArtifact = mapped.find((a) => a.agentType === 'paper-analyzer');
        if (paperArtifact?.data?.papers) {
          const papers: any[] = paperArtifact.data.papers;
          setPaperCount(papers.length);

          // Try to extract a date range from paper IDs (format: YYYY-MM or similar)
          const dates: string[] = papers
            .map((p) => p.paperId as string)
            .filter(Boolean)
            .map((id) => {
              const match = id.match(/(\d{4}-\d{2})/);
              return match ? match[1] : null;
            })
            .filter(Boolean) as string[];

          if (dates.length > 0) {
            const sorted = [...dates].sort();
            const first = sorted[0];
            const last = sorted[sorted.length - 1];
            setDateRange(first === last ? first : `${first} to ${last}`);
          } else {
            setDateRange(undefined);
          }
        } else {
          setPaperCount(undefined);
          setDateRange(undefined);
        }
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
    <AppShell paperCount={paperCount} topicCount={topicCount} dateRange={dateRange}>
      {/* Left panel: chat — hidden when artifact panel is maximized */}
      {!isMaximized && (
        <aside className="w-[340px] shrink-0 border-r border-border flex flex-col overflow-hidden">
          <ChatPanel />
        </aside>
      )}

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
          <PanelToggle isMaximized={isMaximized} onToggle={() => setIsMaximized((v) => !v)} />
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
    </ErrorBoundary>
  );
}
