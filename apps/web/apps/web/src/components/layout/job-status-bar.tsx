'use client';

import { useEffect, useState, useCallback } from 'react';

interface Job {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  topicId: string;
  progress?: number;
  error?: string;
  createdAt?: string;
}

interface JobStatusBarProps {
  jobId: string | null;
}

const statusStyles: Record<Job['status'], string> = {
  pending: 'text-muted-foreground',
  running: 'text-amber-400',
  completed: 'text-emerald-400',
  failed: 'text-rose-400',
};

const statusDot: Record<Job['status'], string> = {
  pending: 'bg-muted-foreground',
  running: 'bg-amber-400 animate-pulse',
  completed: 'bg-emerald-400',
  failed: 'bg-rose-400',
};

export function JobStatusBar({ jobId }: JobStatusBarProps) {
  const [job, setJob] = useState<Job | null>(null);

  const fetchJob = useCallback(async () => {
    if (!jobId) return;
    try {
      const res = await fetch(`/api/jobs/${jobId}`);
      if (res.ok) {
        const data = await res.json();
        setJob(data);
      }
    } catch {}
  }, [jobId]);

  useEffect(() => {
    if (!jobId) return;
    fetchJob();
    // Poll while running/pending
    const interval = setInterval(() => {
      if (job?.status === 'running' || job?.status === 'pending') {
        fetchJob();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [jobId, job?.status, fetchJob]);

  if (!jobId || !job) return null;

  const progress = job.progress ?? (job.status === 'completed' ? 100 : 0);

  return (
    <div className="h-8 shrink-0 border-t border-border bg-muted/30 flex items-center gap-3 px-4">
      <span className={`flex items-center gap-1.5 text-xs ${statusStyles[job.status]}`}>
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot[job.status]}`} />
        Analysis {job.status}
      </span>

      {(job.status === 'running' || job.status === 'pending') && (
        <div className="flex-1 max-w-xs h-1 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {job.error && (
        <span className="text-xs text-rose-400 truncate max-w-xs">{job.error}</span>
      )}

      <span className="text-xs text-muted-foreground ml-auto">
        Job {job.id.slice(0, 8)}
      </span>
    </div>
  );
}
