import { eq, inArray } from 'drizzle-orm';
import { type InferSelectModel, type InferInsertModel } from 'drizzle-orm';
import { db } from '../client.js';
import { papers, paperChunks, topicPapers } from '../schema.js';

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

export async function getPaperChunksByPaperIds(paperIds: string[]): Promise<PaperChunk[]> {
  if (paperIds.length === 0) return [];
  return db.select().from(paperChunks).where(inArray(paperChunks.paperId, paperIds));
}
