'use client';

import { useEffect, useState } from 'react';

interface Topic {
  id: string;
  name: string;
  query: string;
}

interface TopicSelectorProps {
  selectedId: string | null;
  onChange: (id: string) => void;
}

export function TopicSelector({ selectedId, onChange }: TopicSelectorProps) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/topics')
      .then((r) => r.json())
      .then((data) => {
        const list: Topic[] = Array.isArray(data) ? data : [];
        // Sort: "All AI Papers" first, then alphabetical
        list.sort((a, b) => {
          if (a.name === 'All AI Papers') return -1;
          if (b.name === 'All AI Papers') return 1;
          return a.name.localeCompare(b.name);
        });
        setTopics(list);
        // Auto-select first topic (All AI Papers if it exists)
        if (list.length > 0 && !selectedId) {
          setTimeout(() => onChange(list[0].id), 0);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="h-8 w-40 animate-pulse rounded-md bg-muted" aria-label="Loading topics" />
    );
  }

  if (topics.length === 0) {
    return (
      <span className="text-xs text-muted-foreground">No topics yet — ingest papers first</span>
    );
  }

  return (
    <select
      value={selectedId ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 rounded-md border border-input bg-transparent px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
    >
      {topics.map((t) => (
        <option key={t.id} value={t.id}>
          {t.name}
        </option>
      ))}
    </select>
  );
}
