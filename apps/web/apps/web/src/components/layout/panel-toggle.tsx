'use client';
import { Button } from '@/components/ui/button';

interface PanelToggleProps {
  isMaximized: boolean;
  onToggle: () => void;
}

export function PanelToggle({ isMaximized, onToggle }: PanelToggleProps) {
  return (
    <Button variant="ghost" size="icon" onClick={onToggle} className="h-8 w-8" title={isMaximized ? 'Show chat' : 'Maximize'}>
      {isMaximized ? (
        // Minimize icon (two panels)
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/>
        </svg>
      ) : (
        // Maximize icon (full panel)
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
        </svg>
      )}
    </Button>
  );
}
