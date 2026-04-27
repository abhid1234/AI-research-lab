'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  getReadingLists,
  createReadingList,
  deleteReadingList,
  type ReadingList,
} from '@/lib/reading-lists';

export function ReadingListsButton() {
  const [open, setOpen] = useState(false);
  const [lists, setLists] = useState<ReadingList[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load lists whenever dropdown opens
  useEffect(() => {
    if (open) {
      setLists(getReadingLists());
    }
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
        setNewName('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleCreate = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    createReadingList(trimmed);
    setLists(getReadingLists());
    setNewName('');
    setCreating(false);
  };

  const handleDelete = (id: string) => {
    deleteReadingList(id);
    setLists(getReadingLists());
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        className="h-10 w-10"
        title="Reading lists"
        onClick={() => setOpen(v => !v)}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
        </svg>
      </Button>

      {open && (
        <div
          className="absolute right-0 top-9 z-50 w-64 rounded-xl border border-border bg-card shadow-xl"
          style={{ animation: 'chartFadeIn 150ms ease-out both' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
            <span className="text-xs font-semibold text-foreground">My Reading Lists</span>
            <button
              onClick={() => { setCreating(v => !v); setNewName(''); }}
              className="text-[10px] text-primary hover:underline"
            >
              + New list
            </button>
          </div>

          {/* Create form */}
          {creating && (
            <div className="px-3 py-2 border-b border-border flex gap-2">
              <input
                autoFocus
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') { setCreating(false); setNewName(''); } }}
                placeholder="List name…"
                className="flex-1 text-xs rounded-md border border-border bg-background px-2 py-1 outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={handleCreate}
                className="text-xs px-2 py-1 rounded-md bg-primary text-white font-medium hover:bg-primary/80 transition-colors"
              >
                Add
              </button>
            </div>
          )}

          {/* List items */}
          <div className="max-h-56 overflow-y-auto">
            {lists.length === 0 ? (
              <p className="px-3 py-4 text-xs text-muted-foreground text-center">
                No lists yet. Create one above.
              </p>
            ) : (
              lists.map(list => (
                <div
                  key={list.id}
                  className="flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors group"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{list.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {list.paperIds.length} paper{list.paperIds.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(list.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-destructive transition-all"
                    title="Delete list"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
