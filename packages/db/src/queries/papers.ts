import { eq, inArray, sql } from 'drizzle-orm';
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
  const rows = await db.execute<{
    paper: any;
    topics: string[];
  }>(sql`
    SELECT
      to_jsonb(p) AS paper,
      COALESCE(
        (SELECT array_agg(t.name ORDER BY t.name)
         FROM ${topicPapers} tp
         JOIN ${topics} t ON t.id = tp.topic_id
         WHERE tp.paper_id = p.id),
        ARRAY[]::text[]
      ) AS topics
    FROM ${papers} p
    JOIN ${topicPapers} tp_filter ON tp_filter.paper_id = p.id
    WHERE tp_filter.topic_id = ${topicId}
  `);

  return (rows as unknown as Array<{ paper: any; topics: string[] }>).map((r) => ({
    ...r.paper,
    topics: r.topics ?? [],
  })) as PaperWithTopics[];
}

export async function getPaperChunksByPaperIds(paperIds: string[]): Promise<PaperChunk[]> {
  if (paperIds.length === 0) return [];
  return db.select().from(paperChunks).where(inArray(paperChunks.paperId, paperIds));
}
