import 'dotenv/config';
import { parseArgs } from 'node:util';
import { getTopicByName, createJob, getJobById } from '@research-lab/db';
import { runAnalysis } from '../worker/orchestrator.js';

async function main() {
  const { values } = parseArgs({
    options: {
      topic: { type: 'string', short: 't' },
    },
  });

  if (!values.topic) {
    console.error('Usage: tsx scripts/analyze.ts --topic "LLM agents"');
    process.exit(1);
  }

  const topic = await getTopicByName(values.topic);
  if (!topic) {
    console.error(`Topic "${values.topic}" not found. Run ingestion first.`);
    process.exit(1);
  }

  console.log(`Analyzing topic: "${topic.name}" (${topic.id})`);
  console.log(`Papers: ${topic.paperCount}`);

  // Create a job for tracking
  const job = await createJob({ topicId: topic.id, type: 'analyze' });
  console.log(`Job created: ${job.id}\n`);

  try {
    // Run analysis directly (bypass worker polling for CLI usage)
    await runAnalysis(topic.id, job.id);
    console.log('\nAnalysis complete! Artifacts written to database.');
  } catch (error) {
    console.error('\nAnalysis failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
