'use client';

import { ExportButton } from './export-button';
import { GlobalSearch } from './global-search';
import { ThemeToggle } from './theme-toggle';
import { ShareButton } from './share-button';
import { ReadingListsButton } from './reading-lists-button';

interface AppShellProps {
  children: React.ReactNode;
  paperCount?: number;
  topicCount?: number;
  dateRange?: string;
  selectedTopicId?: string | null;
  exportTopic?: string;
  exportPapers?: any[];
  exportArtifacts?: any[];
}

export function AppShell({ children, paperCount, topicCount, dateRange, selectedTopicId, exportTopic, exportPapers, exportArtifacts }: AppShellProps) {
  const hasStats = paperCount !== undefined || topicCount !== undefined || dateRange !== undefined;

  return (
    <div className="flex h-screen flex-col bg-background text-foreground overflow-hidden">
      <header className="flex h-14 items-center gap-4 border-b border-[color:var(--hairline)] px-6 shrink-0 relative z-10">
        {/* Left: logo + wordmark — original sparkle + bold wordmark */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-primary text-base leading-none select-none" aria-hidden="true">✦</span>
          <span className="text-sm font-bold tracking-tight">AI Research Lab</span>
        </div>

        {/* Center: global search */}
        <GlobalSearch topicId={selectedTopicId} />

        {/* Right: stats + connected indicator */}
        <div className="flex items-center gap-3 sm:gap-5 shrink-0 ml-auto min-w-0">
          {hasStats && (
            <span className="hidden md:inline text-[11px] text-muted-foreground tabular-nums tracking-tight">
              {paperCount !== undefined && (
                <span>{paperCount.toLocaleString()} paper{paperCount !== 1 ? 's' : ''}</span>
              )}
              {topicCount !== undefined && (
                <span> · {topicCount} topic{topicCount !== 1 ? 's' : ''}</span>
              )}
              {dateRange && (
                <span> · {dateRange}</span>
              )}
            </span>
          )}
          <div className="flex items-center gap-1.5" title="Connected">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
            <span className="hidden sm:inline text-[11px] text-muted-foreground tracking-tight">Live</span>
          </div>
          <div className="flex items-center gap-1">
            <ReadingListsButton />
            <ShareButton />
            <ExportButton topic={exportTopic} papers={exportPapers} artifacts={exportArtifacts} />
            <ThemeToggle />
          </div>
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
