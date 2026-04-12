interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  const defaultIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-30">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground text-center max-w-sm mx-auto">
      <div className="text-muted-foreground/40">{icon ?? defaultIcon}</div>
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && <p className="text-xs mt-1 leading-relaxed">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      <p className="text-xs text-muted-foreground">{message}</p>
    </div>
  );
}
