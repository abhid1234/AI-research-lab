import { NextResponse } from 'next/server';
import { getTopicById, createJob } from '@research-lab/db';

export async function POST(req: Request) {
  const body = await req.json();
  const { topicId, count } = body;

  if (!topicId) {
    return NextResponse.json({ error: 'topicId is required' }, { status: 400 });
  }

  const topic = await getTopicById(topicId);
  if (!topic) {
    return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
  }

  // Create an ingestion job — the worker will pick it up
  const job = await createJob({ topicId, type: 'ingest' });
  return NextResponse.json({ jobId: job.id }, { status: 201 });
}
