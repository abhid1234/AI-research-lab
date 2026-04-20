import { eq, inArray } from 'drizzle-orm';
import { type InferSelectModel, type InferInsertModel } from 'drizzle-orm';
import { db } from '../client.js';
import { papers, paperChunks, topicPapers, topics } from '../schema.js';

export type Paper = InferSelectModel<typeof papers>;
export type NewPaper = InferInsertModel<typeof papers>;
export type PaperChunk = InferSelectModel<typeof paperChunks>;
export type NewPaperChunk = InferInsertModel<typeof paperChunks>;

export async function insertPaper(paper: NewPaper): Promise<Paper> {
  const [inserted] = await db
    .insert(papers)
    .values(paper)
    .onConflictDoNothing()
    .returning();

  // If onConflictDoNothing fires (duplicate), fetch the existing row
  if (!inserted) {
    const [existing] = await db.select().from(papers).where(eq(papers.id, paper.id));
    return existing;
  }

  return inserted;
}

export async function insertPaperChunks(chunks: NewPaperChunk[]): Promise<void> {
  if (chunks.length === 0) return;
  await db.insert(paperChunks).values(chunks).onConflictDoNothing();
}

export async function getPapersByTopic(topicId: string): Promise<Paper[]> {
  const rows = await db
    .select({ paper: papers })
    .from(papers)
    .innerJoin(topicPapers, eq(topicPapers.paperId, papers.id))
    .where(eq(topicPapers.topicId, topicId));

  return rows.map((r) => r.paper);
}

/**
 * Like getPapersByTopic but enriches each paper with its full list of topic
 * memberships. Used by the dashboard so charts can categorize papers by their
 * actual ingested topic (the source of truth) instead of keyword guessing.
 */
export type PaperWithTopics = Paper & { topics: string[] };

export async function getPapersByTopicWithTopicMembership(topicId: string): Promise<PaperWithTopics[]> {
  // Step 1: get all papers in this topic via the existing typed Drizzle path
  const paperRows = await getPapersByTopic(topicId);
  if (paperRows.length === 0) return [];

  // Step 2: fetch topic memberships for those paper IDs in one query
  const paperIds = paperRows.map((p) => p.id);
  const membershipRows = await db
    .select({ paperId: topicPapers.paperId, topicName: topics.name })
    .from(topicPapers)
    .innerJoin(topics, eq(topics.id, topicPapers.topicId))
    .where(inArray(topicPapers.paperId, paperIds));

  // Step 3: index by paperId
  const topicsByPaperId = new Map<string, string[]>();
  for (const r of membershipRows) {
    const list = topicsByPaperId.get(r.paperId) ?? [];
    list.push(r.topicName);
    topicsByPaperId.set(r.paperId, list);
  }

  // Step 4: stitch
  return paperRows.map((p) => ({
    ...p,
    topics: (topicsByPaperId.get(p.id) ?? []).sort(),
  }));
}

export async function getPaperChunksByPaperIds(paperIds: string[]): Promise<PaperChunk[]> {
  if (paperIds.length === 0) return [];
  return db.select().from(paperChunks).where(inArray(paperChunks.paperId, paperIds));
}
