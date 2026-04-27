// Cloud Scheduler setup:
// gcloud scheduler jobs create http weekly-paper-ingest \
//   --schedule="0 0 * * MON" \
//   --uri="https://www.airesearchlab.space/api/cron/ingest" \
//   --http-method=GET \
//   --headers="Authorization=Bearer YOUR_CRON_SECRET"

import { NextResponse } from 'next/server';
import { getTopics, createJob } from '@research-lab/db';

async function handleIngest(req: Request) {
  // Verify cron auth (check Authorization header)
  const authHeader = req.headers.get('authorization');
  const expectedToken = process.env.CRON_SECRET;
  if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Create ingest jobs for all topics (except "All AI Papers")
  const topics = await getTopics();
  const jobs = [];
  for (const topic of topics) {
    if (topic.name === 'All AI Papers') continue;
    const job = await createJob({ topicId: topic.id, type: 'ingest' });
    jobs.push({ topicId: topic.id, topicName: topic.name, jobId: job.id });
  }

  return NextResponse.json({
    message: 'Scheduled ingestion jobs created',
    count: jobs.length,
    jobs,
  });
}

export async function GET(req: Request) {
  return handleIngest(req);
}

export async function POST(req: Request) {
  return handleIngest(req);
}
