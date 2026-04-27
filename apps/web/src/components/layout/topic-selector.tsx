'use client';

import { useEffect, useRef, useState } from 'react';
import { CATEGORIES } from '@/lib/categories';

interface Topic {
  id: string;
  name: string;
  query: string;
}

const ALLOWED_TOPIC_NAMES = new Set<string>(['All AI Papers', ...CATEGORIES]);

interface TopicSelectorProps {
  selectedId: string | null;
  onChange: (id: string) => void;
}

export function TopicSelector({ selectedId, onChange }: TopicSelectorProps) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/topics')
      .then((r) => r.json())
      .then((data) => {
        const raw: Topic[] = Array.isArray(data) ? data : [];
        const list = raw.filter((t) => ALLOWED_TOPIC_NAMES.has(t.name));
        list.sort((a, b) => {
          if (a.name === 'All AI Papers') return -1;
          if (b.name === 'All AI Papers') return 1;
          return a.name.localeCompare(b.name);
        });
        setTopics(list);
        if (list.length > 0 && !selectedId) {
          setTimeout(() => onChange(list[0].id), 0);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Close on outside click + escape
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        buttonRef.current && !buttonRef.current.contains(t) &&
        menuRef.current && !menuRef.current.contains(t)
      ) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  if (loading) {
    return (
      <div className="h-8 w-44 animate-pulse rounded-full bg-[color:var(--bare-card-tint)]" aria-label="Loading topics" />
    );
  }

  if (topics.length === 0) {
    return (
      <span className="text-xs text-muted-foreground">No topics yet — ingest papers first</span>
    );
  }

  const current = topics.find((t) => t.id === selectedId) ?? topics[0];

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="group inline-flex h-8 items-center gap-2 rounded-full border border-foreground/80 bg-transparent pl-3.5 pr-2.5 text-[13px] font-medium tracking-tight text-foreground transition-colors hover:bg-foreground/8 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground/40"
      >
        <span className="truncate max-w-[200px]">{current.name}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-foreground/60 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          ref={menuRef}
          role="listbox"
          className="absolute left-0 top-full z-50 mt-1.5 min-w-[240px] max-h-[60vh] overflow-y-auto rounded-xl border border-[color:var(--hairline-strong)] bg-popover py-1 shadow-lg shadow-foreground/5"
        >
          {topics.map((t) => {
            const active = t.id === selectedId;
            return (
              <button
                key={t.id}
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(t.id);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 text-[13px] tracking-tight transition-colors ${
                  active
                    ? 'text-foreground font-medium bg-foreground/5'
                    : 'text-foreground/75 hover:bg-foreground/5 hover:text-foreground'
                }`}
              >
                {t.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
