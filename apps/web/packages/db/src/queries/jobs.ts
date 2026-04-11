import { eq, sql } from 'drizzle-orm';
import { type InferSelectModel, type InferInsertModel } from 'drizzle-orm';
import { db } from '../client.js';
import { jobs } from '../schema.js';

export type Job = InferSelectModel<typeof jobs>;
export type NewJob = InferInsertModel<typeof jobs>;

export async function createJob(data: {
  topicId: string;
  type: string;
}): Promise<Job> {
  const [job] = await db
    .insert(jobs)
    .values({
      topicId: data.topicId,
      type: data.type,
      status: 'pending',
    })
    .returning();
  return job;
}

export async function claimNextPendingJob(): Promise<Job | undefined> {
  // Atomically find and claim the oldest pending job
  const [job] = await db
    .update(jobs)
    .set({
      status: 'running',
      startedAt: new Date(),
    })
    .where(
      eq(
        jobs.id,
        sql`(
          SELECT id FROM jobs
          WHERE status = 'pending'
          ORDER BY created_at ASC
          LIMIT 1
          FOR UPDATE SKIP LOCKED
        )`,
      ),
    )
    .returning();
  return job;
}

export async function updateJobProgress(
  jobId: string,
  progress: { step?: string; total?: number; message?: string },
): Promise<void> {
  await db.update(jobs).set({ progress }).where(eq(jobs.id, jobId));
}

export async function completeJob(jobId: string): Promise<void> {
  await db
    .update(jobs)
    .set({
      status: 'completed',
      completedAt: new Date(),
    })
    .where(eq(jobs.id, jobId));
}

export async function failJob(jobId: string, error: string): Promise<void> {
  await db
    .update(jobs)
    .set({
      status: 'failed',
      error,
      completedAt: new Date(),
    })
    .where(eq(jobs.id, jobId));
}

export async function getJobById(id: string): Promise<Job | undefined> {
  const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
  return job;
}
