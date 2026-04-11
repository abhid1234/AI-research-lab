import { eq } from 'drizzle-orm';
import { type InferSelectModel, type InferInsertModel } from 'drizzle-orm';
import { db } from '../client.js';
import { topics, topicPapers } from '../schema.js';

export type Topic = InferSelectModel<typeof topics>;
export type NewTopic = InferInsertModel<typeof topics>;

export async function createTopic(data: {
  name: string;
  query: string;
  schedule?: string;
}): Promise<Topic> {
  const [topic] = await db
    .insert(topics)
    .values({
      name: data.name,
      query: data.query,
      schedule: data.schedule ?? 'manual',
    })
    .returning();
  return topic;
}

export async function getTopics(): Promise<Topic[]> {
  return db.select().from(topics);
}

export async function getTopicById(id: string): Promise<Topic | undefined> {
  const [topic] = await db.select().from(topics).where(eq(topics.id, id));
  return topic;
}

export async function getTopicByName(name: string): Promise<Topic | undefined> {
  const [topic] = await db.select().from(topics).where(eq(topics.name, name));
  return topic;
}

export async function updateTopicSyncTime(
  topicId: string,
  paperCount: number,
): Promise<void> {
  await db
    .update(topics)
    .set({
      lastSyncAt: new Date(),
      paperCount,
    })
    .where(eq(topics.id, topicId));
}

export async function linkPaperToTopic(
  topicId: string,
  paperId: string,
): Promise<void> {
  await db
    .insert(topicPapers)
    .values({ topicId, paperId })
    .onConflictDoNothing();
}
