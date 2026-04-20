'use client';

import { useEffect, useState } from 'react';

interface Job {
  id: string;
  type: string;
  status: string;
  progress: { step?: string; total?: number; message?: string } | null;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

interface RunHistoryProps {
  topicId: string;
}

function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (isNaN(then)) return '';
  const deltaSec = Math.round((Date.now() - then) / 1000);
  if (deltaSec < 60) return 'just now';
  if (deltaSec < 3600) return `${Math.floor(deltaSec / 60)}m ago`;
  if (deltaSec < 86400) return `${Math.floor(deltaSec / 3600)}h ago`;
  const days = Math.floor(deltaSec / 86400);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}wk ago`;
}

function statusConfig(status: string): { dot: string; label: string; textColor: string } {
  switch (status) {
    case 'completed':
      return { dot: 'bg-emerald-500', label: 'completed', textColor: 'text-emerald-600 dark:text-emerald-400' };
    case 'failed':
      return { dot: 'bg-red-500', label: 'failed', textColor: 'text-red-600 dark:text-red-400' };
    case 'running':
      return { dot: 'bg-amber-500 animate-pulse', label: 'running', textColor: 'text-amber-600 dark:text-amber-400' };
    default:
      return { dot: 'bg-slate-400', label: status, textColor: 'text-muted-foreground' };
  }
}

function jobSummary(job: Job): string {
  if (job.status === 'completed') {
    const msg = job.progress?.message;
    if (typeof msg === 'string' && msg.trim()) return `✓ ${msg}`;
    if (job.type === 'ingest' && typeof job.progress?.total === 'number') {
      return `✓ ${job.progress.total} papers ingested`;
    }
    return '✓ done';
  }
  if (job.status === 'failed') {
    const err = typeof job.error === 'string' ? job.error : 'unknown error';
    return `✗ ${err.slice(0, 60)}`;
  }
  if (job.status === 'running') {
    const step = job.progress?.step;
    return typeof step === 'string' && step ? step : 'in progress…';
  }
  return '';
}

export function RunHistory({ topicId }: RunHistoryProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!topicId) return;
    setLoading(true);
    setError(null);
    fetch(`/api/topics/${topicId}/jobs`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        const raw: unknown[] = Array.isArray(data?.jobs) ? data.jobs : [];
        setJobs(raw as Job[]);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Failed to load run history');
      })
      .finally(() => setLoading(false));
  }, [topicId]);

  if (loading) {
    return (
      <div className="space-y-1.5 animate-pulse">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-8 rounded-md bg-muted" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-xs text-muted-foreground">Could not load run history: {error}</p>
    );
  }

  if (jobs.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">No runs yet for this topic.</p>
    );
  }

  const displayed = jobs.slice(0, 5);

  return (
    <div className="space-y-1">
      {displayed.map((job) => {
        const { dot, label, textColor } = statusConfig(job.status);
        const summary = jobSummary(job);
        const when = formatRelativeTime(job.completedAt ?? job.startedAt ?? job.createdAt);

        return (
          <div
            key={job.id}
            className="flex items-center gap-2.5 rounded-md px-3 py-2 bg-muted/30 hover:bg-muted/50 transition-colors text-xs"
          >
            {/* Status dot */}
            <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${dot}`} />

            {/* Status badge */}
            <span className={`shrink-0 font-medium ${textColor}`}>[{label}]</span>

            {/* Job type */}
            <span className="text-foreground font-medium shrink-0">{typeof job.type === 'string' ? job.type : ''}</span>

            {/* When */}
            {when && (
              <>
                <span className="text-muted-foreground/50">·</span>
                <span className="text-muted-foreground shrink-0">{when}</span>
              </>
            )}

            {/* Summary */}
            {summary && (
              <>
                <span className="text-muted-foreground/50">·</span>
                <span
                  className={`truncate ${job.status === 'failed' ? 'text-red-500/80' : job.status === 'completed' ? 'text-emerald-600/80 dark:text-emerald-400/80' : 'text-muted-foreground'}`}
                >
                  {summary}
                </span>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
