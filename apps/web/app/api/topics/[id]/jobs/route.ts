import { NextResponse } from 'next/server';
import { getJobsByTopic } from '@research-lab/db';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const recentJobs = await getJobsByTopic(id, 10);
  return NextResponse.json({ jobs: recentJobs });
}
