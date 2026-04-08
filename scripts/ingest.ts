import 'dotenv/config';
import { parseArgs } from 'node:util';
import { createTopic, getTopicByName } from '@research-lab/db';
import { ingestTopic } from '../worker/ingestion/index.js';

async function main() {
  const { values } = parseArgs({
    options: {
      topic: { type: 'string', short: 't' },
      count: { type: 'string', short: 'c', default: '20' },
    },
  });

  if (!values.topic) {
    console.error('Usage: tsx scripts/ingest.ts --topic "LLM agents" --count 20');
    process.exit(1);
  }

  const topicName = values.topic;
  const count = parseInt(values.count!, 10);

  // Find or create the topic
  let topic = await getTopicByName(topicName);
  if (!topic) {
    topic = await createTopic({
      name: topicName,
      query: topicName, // use topic name as search query
    });
    console.log(`Created topic: "${topicName}" (${topic.id})`);
  } else {
    console.log(`Found existing topic: "${topicName}" (${topic.id})`);
  }

  // Run ingestion
  const result = await ingestTopic(topic.id, topic.query, count);
  console.log(`\nIngestion complete:`);
  console.log(`  New papers: ${result.newPapers}`);
  console.log(`  Total chunks: ${result.totalChunks}`);

  process.exit(0);
}

main().catch((err) => {
  console.error('Ingestion failed:', err);
  process.exit(1);
});
