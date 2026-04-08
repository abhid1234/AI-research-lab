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
        setTopics(list);
        if (list.length > 0 && !selectedId) {
          onChange(list[0].id);
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
