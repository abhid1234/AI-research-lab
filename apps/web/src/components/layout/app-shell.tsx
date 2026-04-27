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
  lastSyncAt?: string | null;
  selectedTopicId?: string | null;
  exportTopic?: string;
  exportPapers?: any[];
  exportArtifacts?: any[];
}

// Sync freshness: green if <7d, amber 7-14d, red >14d.
// Maps to the same hues used elsewhere in the design tokens.
function syncFreshness(lastSyncAt: string | null | undefined): { dot: string; label: string; tone: 'fresh' | 'stale' | 'cold' } | null {
  if (!lastSyncAt) return null;
  const t = new Date(lastSyncAt).getTime();
  if (Number.isNaN(t)) return null;
  const ageDays = (Date.now() - t) / (24 * 60 * 60 * 1000);
  const label = `Updated ${new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  if (ageDays < 7) return { dot: 'bg-emerald-500', label, tone: 'fresh' };
  if (ageDays < 14) return { dot: 'bg-amber-500', label, tone: 'stale' };
  return { dot: 'bg-rose-500', label, tone: 'cold' };
}

export function AppShell({ children, paperCount, topicCount, dateRange, lastSyncAt, selectedTopicId, exportTopic, exportPapers, exportArtifacts }: AppShellProps) {
  const hasStats = paperCount !== undefined || topicCount !== undefined || dateRange !== undefined;
  const freshness = syncFreshness(lastSyncAt);

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
          {freshness && (
            <div
              className="flex items-center gap-1.5"
              title={freshness.tone === 'fresh' ? 'Synced this week' : freshness.tone === 'stale' ? 'Last sync 1-2 weeks ago' : 'Last sync more than 2 weeks ago'}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${freshness.dot}`} aria-hidden="true" />
              <span className="hidden sm:inline text-[11px] text-muted-foreground tracking-tight tabular-nums">{freshness.label}</span>
            </div>
          )}
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
