import { NextResponse } from 'next/server';
import { getTopicById, getArtifactsByTopic } from '@research-lab/db';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const topic = await getTopicById(id);

  if (!topic) {
    return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
  }

  const artifacts = await getArtifactsByTopic(id);
  return NextResponse.json({ topic, artifacts });
}
