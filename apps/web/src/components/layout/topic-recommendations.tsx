'use client';

import { useEffect, useState } from 'react';

interface TopicRec {
  id: string;
  name: string;
  paperCount: number;
  reason: string;
}

interface TopicRecommendationsProps {
  currentTopicId: string | null;
  currentTopicName: string;
}

export function TopicRecommendations({ currentTopicId, currentTopicName }: TopicRecommendationsProps) {
  const [recs, setRecs] = useState<TopicRec[]>([]);

  useEffect(() => {
    if (!currentTopicId) return;
    fetch('/api/topics')
      .then(r => r.json())
      .then((topics: any[]) => {
        // Simple heuristic: recommend topics that aren't the current one,
        // sorted by paperCount, exclude "All AI Papers"
        const others = topics
          .filter(t => t.id !== currentTopicId && t.name !== 'All AI Papers')
          .sort((a, b) => (b.paperCount ?? 0) - (a.paperCount ?? 0))
          .slice(0, 4)
          .map(t => ({
            id: t.id,
            name: typeof t.name === 'string' ? t.name : '',
            paperCount: typeof t.paperCount === 'number' ? t.paperCount : 0,
            reason: deriveReason(currentTopicName, typeof t.name === 'string' ? t.name : ''),
          }));
        setRecs(others);
      })
      .catch(() => {});
  }, [currentTopicId, currentTopicName]);

  if (recs.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">🔎</span>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Explore More</h3>
      </div>
      <div className="space-y-1.5">
        {recs.map((r) => (
          <a
            key={r.id}
            href={`/?topic=${r.id}`}
            className="flex items-center justify-between p-2 rounded-md hover:bg-muted transition-colors group"
            onClick={(e) => {
              e.preventDefault();
              window.dispatchEvent(new CustomEvent('topic-change', { detail: { id: r.id } }));
            }}
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{r.name}</p>
              <p className="text-[10px] text-muted-foreground">{r.reason}</p>
            </div>
            <span className="text-xs text-muted-foreground tabular-nums shrink-0 ml-2">{r.paperCount}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

function deriveReason(current: string, other: string): string {
  const currentLower = current.toLowerCase();
  const otherLower = other.toLowerCase();

  const sharedKeywords = ['agent', 'safety', 'reasoning', 'scaling', 'multi', 'rag', 'code', 'vision'];
  for (const kw of sharedKeywords) {
    if (currentLower.includes(kw) && otherLower.includes(kw)) {
      return `Shares "${kw}" themes`;
    }
  }
  return `${other} papers in collection`;
}
