'use client';

import { ScrollText } from 'lucide-react';
import { isArxivId } from '@/lib/paper-utils';

interface ArxivPaperFooterProps {
  arxivId: string | undefined | null;
  /**
   * 'card' (default) — bordered footer row with subtle bg, for full paper cards.
   * 'inline' — no border, no bg; for tight contexts (frontier cards, debate sides).
   */
  variant?: 'card' | 'inline';
}

/**
 * Shared "where to read this paper" footer row:
 *   [arXiv abs]  [⬇ PDF]                            2501.09136
 *
 * Renders nothing when no real arxiv ID is available — callers don't need
 * to wrap in a conditional. Click handlers stopPropagation so the footer
 * works inside cards that also have a parent click target.
 */
export function ArxivPaperFooter({ arxivId, variant = 'card' }: ArxivPaperFooterProps) {
  if (!arxivId || !isArxivId(arxivId)) return null;
  const absUrl = `https://arxiv.org/abs/${arxivId}`;
  const pdfUrl = `https://arxiv.org/pdf/${arxivId}`;
  const wrapClass =
    variant === 'inline'
      ? 'flex items-center gap-3 text-[10px] text-gray-500'
      : 'flex items-center gap-3 px-3 py-1.5 border-t border-gray-100 text-[10px] text-gray-500 bg-gray-50/50 shrink-0';
  return (
    <div className={wrapClass}>
      <a
        href={absUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="flex items-center gap-1 hover:text-foreground transition-colors font-medium"
        title="Open arXiv abstract page"
      >
        <ScrollText className="h-3 w-3" aria-hidden="true" />
        <span>arXiv abs</span>
      </a>
      <a
        href={pdfUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="flex items-center gap-1 hover:text-foreground transition-colors font-medium"
        title="Download PDF directly"
      >
        <span aria-hidden="true">⬇</span>
        <span>PDF</span>
      </a>
      <span className="ml-auto text-gray-400 font-mono text-[9px]">{arxivId}</span>
    </div>
  );
}
