import { NextResponse } from 'next/server';
import { getTopicById, getArtifactsByTopic, getPapersByTopicWithTopicMembership } from '@research-lab/db';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const topic = await getTopicById(id);

  if (!topic) {
    return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
  }

  const [artifacts, papers] = await Promise.all([
    getArtifactsByTopic(id),
    getPapersByTopicWithTopicMembership(id),
  ]);

  return NextResponse.json({ topic, artifacts, papers });
}
