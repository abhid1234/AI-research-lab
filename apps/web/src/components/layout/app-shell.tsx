'use client';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen flex-col bg-background text-foreground overflow-hidden">
      <header className="flex h-12 items-center justify-between border-b border-border px-4 shrink-0">
        <div className="flex items-center gap-2">
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            className="text-primary"
            aria-hidden="true"
          >
            <circle cx="10" cy="10" r="3" fill="currentColor" />
            <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 2" />
          </svg>
          <span className="text-sm font-semibold tracking-tight">AI Research Lab</span>
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
