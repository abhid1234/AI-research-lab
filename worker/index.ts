import 'dotenv/config';
import { claimNextPendingJob, completeJob, failJob, getTopicById } from '@research-lab/db';
import { ingestTopic } from './ingestion/index.js';
import { runAnalysis } from './orchestrator.js';

async function main() {
  console.log('[worker] Started. Polling for jobs...');

  while (true) {
    const job = await claimNextPendingJob();

    if (job) {
      console.log(`[worker] Claimed job ${job.id} (type: ${job.type})`);

      try {
        if (job.type === 'ingest') {
          const topic = await getTopicById(job.topicId);
          if (!topic) throw new Error(`Topic ${job.topicId} not found`);
          await ingestTopic(topic.id, topic.query, 50);
          await completeJob(job.id);
        } else if (job.type === 'analyze') {
          await runAnalysis(job.topicId, job.id);
          await completeJob(job.id);
        } else {
          throw new Error(`Unknown job type: ${job.type}`);
        }

        console.log(`[worker] Job ${job.id} completed`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[worker] Job ${job.id} failed:`, message);
        await failJob(job.id, message);
      }
    }

    // Poll every 5 seconds
    await new Promise((r) => setTimeout(r, 5000));
  }
}

main().catch((err) => {
  console.error('[worker] Fatal error:', err);
  process.exit(1);
});
