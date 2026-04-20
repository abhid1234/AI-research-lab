import { NextResponse } from 'next/server';
import { db, jobs } from '@research-lab/db';
import { eq, desc } from 'drizzle-orm';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const recentJobs = await db
    .select()
    .from(jobs)
    .where(eq(jobs.topicId, id))
    .orderBy(desc(jobs.createdAt))
    .limit(10);
  return NextResponse.json({ jobs: recentJobs });
}
