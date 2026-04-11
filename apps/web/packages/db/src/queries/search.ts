import { eq, cosineDistance, sql } from 'drizzle-orm';
import { db } from '../client.js';
import { papers, paperChunks, topicPapers } from '../schema.js';
import type { Paper, PaperChunk } from './papers.js';

export type VectorSearchResult = PaperChunk & { paper: Paper; distance: number };

export async function vectorSearch(
  queryVector: number[],
  options?: { limit?: number; topicId?: string },
): Promise<VectorSearchResult[]> {
  const limit = options?.limit ?? 10;

  const similarity = sql<number>`1 - (${cosineDistance(paperChunks.embedding, queryVector)})`;

  if (options?.topicId) {
    const rows = await db
      .select({
        chunk: paperChunks,
        paper: papers,
        distance: similarity,
      })
      .from(paperChunks)
      .innerJoin(papers, eq(paperChunks.paperId, papers.id))
      .innerJoin(topicPapers, eq(topicPapers.paperId, papers.id))
      .where(eq(topicPapers.topicId, options.topicId))
      .orderBy(cosineDistance(paperChunks.embedding, queryVector))
      .limit(limit);

    return rows.map((r) => ({ ...r.chunk, paper: r.paper, distance: r.distance }));
  }

  const rows = await db
    .select({
      chunk: paperChunks,
      paper: papers,
      distance: similarity,
    })
    .from(paperChunks)
    .innerJoin(papers, eq(paperChunks.paperId, papers.id))
    .orderBy(cosineDistance(paperChunks.embedding, queryVector))
    .limit(limit);

  return rows.map((r) => ({ ...r.chunk, paper: r.paper, distance: r.distance }));
}
