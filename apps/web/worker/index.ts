import 'dotenv/config';
import http from 'node:http';
import { claimNextPendingJob, completeJob, failJob, getTopicById, updateJobProgress, createJob } from '@research-lab/db';
import { ingestTopic } from './ingestion/index.js';
import { runAnalysis } from './orchestrator.js';

// ── Configuration ──
const MAX_CONCURRENT = parseInt(process.env.MAX_CONCURRENT_AGENTS ?? '1', 10);
const MAX_RETRIES = parseInt(process.env.MAX_RETRIES ?? '3', 10);
const POLL_INTERVAL_MS = 5000;

// ── Retry Queue (Symphony pattern) ──
interface RetryEntry {
  jobId: string;
  topicId: string;
  type: string;
  attempt: number;
  nextRetryAt: number; // monotonic timestamp
  lastError: string;
}

const retryQueue: RetryEntry[] = [];
const runningJobs = new Set<string>();

function scheduleRetry(jobId: string, topicId: string, type: string, attempt: number, error: string) {
  if (attempt >= MAX_RETRIES) {
    console.error(`[worker] Job ${jobId} exhausted ${MAX_RETRIES} retries. Marking failed.`);
    failJob(jobId, `Failed after ${MAX_RETRIES} attempts. Last error: ${error}`);
    return;
  }

  // Exponential backoff: 10s, 30s, 90s
  const backoffMs = 10_000 * Math.pow(3, attempt);
  const nextRetryAt = Date.now() + backoffMs;

  retryQueue.push({ jobId, topicId, type, attempt: attempt + 1, nextRetryAt, lastError: error });
  console.log(`[worker] Job ${jobId} scheduled for retry ${attempt + 1}/${MAX_RETRIES} in ${backoffMs / 1000}s`);
}

function getReadyRetries(): RetryEntry[] {
  const now = Date.now();
  const ready: RetryEntry[] = [];
  for (let i = retryQueue.length - 1; i >= 0; i--) {
    if (retryQueue[i].nextRetryAt <= now) {
      ready.push(retryQueue.splice(i, 1)[0]);
    }
  }
  return ready;
}

// ── Job Execution ──
async function executeJob(jobId: string, topicId: string, type: string, attempt: number) {
  runningJobs.add(jobId);

  try {
    if (type === 'ingest') {
      const topic = await getTopicById(topicId);
      if (!topic) throw new Error(`Topic ${topicId} not found`);
      await ingestTopic(topic.id, topic.query, 50);
      await completeJob(jobId);
    } else if (type === 'analyze') {
      await runAnalysis(topicId, jobId);
      await completeJob(jobId);
    } else {
      throw new Error(`Unknown job type: ${type}`);
    }

    console.log(`[worker] Job ${jobId} completed (attempt ${attempt})`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[worker] Job ${jobId} failed (attempt ${attempt}):`, message);

    // Determine if retryable
    const isRetryable = !message.includes('Unknown job type') && !message.includes('not found');

    if (isRetryable) {
      await updateJobProgress(jobId, { step: 'retry', message: `Retrying (attempt ${attempt + 1})...` });
      scheduleRetry(jobId, topicId, type, attempt, message);
    } else {
      await failJob(jobId, message);
    }
  } finally {
    runningJobs.delete(jobId);
  }
}

// ── Health Check Server (Cloud Run) ──
const port = parseInt(process.env.PORT ?? '8080', 10);
http.createServer((_req, res) => {
  const status = {
    running: runningJobs.size,
    retryQueueSize: retryQueue.length,
    maxConcurrent: MAX_CONCURRENT,
  };
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(status));
}).listen(port, () => {
  console.log(`[worker] Health check listening on :${port}`);
});

// ── Main Loop ──
async function main() {
  console.log(`[worker] Started. max_concurrent=${MAX_CONCURRENT}, max_retries=${MAX_RETRIES}`);

  while (true) {
    // Process ready retries first
    const readyRetries = getReadyRetries();
    for (const retry of readyRetries) {
      if (runningJobs.size >= MAX_CONCURRENT) break;
      console.log(`[worker] Retrying job ${retry.jobId} (attempt ${retry.attempt})`);
      executeJob(retry.jobId, retry.topicId, retry.type, retry.attempt);
    }

    // Claim new jobs if under concurrency limit
    if (runningJobs.size < MAX_CONCURRENT) {
      const job = await claimNextPendingJob();
      if (job) {
        console.log(`[worker] Claimed job ${job.id} (type: ${job.type})`);
        executeJob(job.id, job.topicId, job.type, 0);
      }
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

main().catch((err) => {
  console.error('[worker] Fatal error:', err);
  process.exit(1);
});
