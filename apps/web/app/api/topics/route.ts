import { NextResponse } from 'next/server';
import { getTopics, createTopic } from '@research-lab/db';

export async function GET() {
  const topics = await getTopics();
  return NextResponse.json(topics);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { name, query, schedule } = body;

  if (!name || !query) {
    return NextResponse.json({ error: 'name and query are required' }, { status: 400 });
  }

  const topic = await createTopic({ name, query, schedule });
  return NextResponse.json(topic, { status: 201 });
}
