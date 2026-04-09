'use client';

import { ThemeToggle } from './theme-toggle';

interface AppShellProps {
  children: React.ReactNode;
  paperCount?: number;
  topicCount?: number;
  dateRange?: string;
}

export function AppShell({ children, paperCount, topicCount, dateRange }: AppShellProps) {
  const hasStats = paperCount !== undefined || topicCount !== undefined || dateRange !== undefined;

  return (
    <div className="flex h-screen flex-col bg-background text-foreground overflow-hidden">
      <header className="flex h-12 items-center justify-between border-b border-border px-4 shrink-0">
        {/* Left: logo + title */}
        <div className="flex items-center gap-2">
          <span className="text-primary text-base leading-none select-none" aria-hidden="true">✦</span>
          <span className="text-sm font-bold tracking-tight">AI Research Lab</span>
        </div>

        {/* Right: stats + connected indicator */}
        <div className="flex items-center gap-4">
          {hasStats && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {paperCount !== undefined && (
                <span>{paperCount} paper{paperCount !== 1 ? 's' : ''}</span>
              )}
              {topicCount !== undefined && (
                <span> · {topicCount} topic{topicCount !== 1 ? 's' : ''}</span>
              )}
              {dateRange && (
                <span> · {dateRange}</span>
              )}
            </span>
          )}
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_1px_rgba(52,211,153,0.5)]" aria-hidden="true" />
            <span className="text-xs text-muted-foreground">Connected</span>
          </div>
          <ThemeToggle />
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
