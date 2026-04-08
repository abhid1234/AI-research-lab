import { searchPapers } from './semantic-scholar.js';
import { getArxivPdfUrl } from './arxiv.js';
import { chunkText } from './chunker.js';
import { embedChunks } from './embedder.js';
import {
  insertPaper,
  insertPaperChunks,
  getPapersByTopic,
  linkPaperToTopic,
  updateTopicSyncTime,
} from '@research-lab/db';

export interface IngestResult {
  newPapers: number;
  totalChunks: number;
}

/**
 * Ingest papers from Semantic Scholar for a given topic.
 *
 * Steps:
 *  1. Search Semantic Scholar for papers matching query
 *  2. Filter papers with no abstract
 *  3. Skip papers already in the DB (by Semantic Scholar paper ID)
 *  4. Insert new papers into `papers` table
 *  5. Link each paper to the topic via `topic_papers`
 *  6. Chunk each paper's abstract
 *  7. Embed all chunks via AI Gateway
 *  8. Insert chunks + embeddings into `paper_chunks`
 *  9. Update `topics.lastSyncAt` and `topics.paperCount`
 * 10. Return stats
 */
export async function ingestTopic(
  topicId: string,
  query: string,
  count: number,
): Promise<IngestResult> {
  console.log(`[ingest] Searching Semantic Scholar: "${query}" (limit ${count})`);
  const candidates = await searchPapers(query, count);

  // Filter out papers with no abstract
  const withAbstract = candidates.filter(
    (p) => p.abstract && p.abstract.trim().length > 0,
  );
  console.log(
    `[ingest] ${withAbstract.length}/${candidates.length} papers have abstracts`,
  );

  // Determine which papers are already in the DB for this topic
  const existingPapers = await getPapersByTopic(topicId);
  const existingIds = new Set(existingPapers.map((p) => p.id));

  const newCandidates = withAbstract.filter((p) => !existingIds.has(p.paperId));
  console.log(
    `[ingest] ${newCandidates.length} new papers to ingest (${existingIds.size} already exist)`,
  );

  let totalChunks = 0;
  let newPapers = 0;

  for (const paper of newCandidates) {
    // Derive arxiv PDF URL if available
    const arxivId = paper.externalIds?.ArXiv;
    const pdfUrl = arxivId ? getArxivPdfUrl(arxivId) : undefined;

    // Map Semantic Scholar paper → DB row
    const paperRow = {
      id: paper.paperId,
      arxivId: arxivId ?? null,
      title: paper.title,
      abstract: paper.abstract!, // already filtered non-null
      authors: paper.authors,
      categories: paper.fieldsOfStudy ?? [],
      publishedAt: paper.publicationDate ? new Date(paper.publicationDate) : null,
      venue: paper.venue ?? null,
      citationCount: paper.citationCount ?? 0,
      pdfUrl: pdfUrl ?? null,
    };

    // Insert paper (idempotent — onConflictDoNothing)
    const inserted = await insertPaper(paperRow);
    console.log(`[ingest] Inserted paper: ${inserted.title.slice(0, 60)}…`);

    // Link to topic
    await linkPaperToTopic(topicId, inserted.id);

    // Chunk the abstract
    const chunks = chunkText(paper.abstract!);

    // Embed all chunks for this paper
    const vectors = await embedChunks(chunks.map((c) => c.content));

    // Build chunk rows for DB
    const chunkRows = chunks.map((chunk, i) => ({
      paperId: inserted.id,
      chunkIndex: chunk.chunkIndex,
      content: chunk.content,
      source: 'abstract' as const,
      embedding: vectors[i],
    }));

    await insertPaperChunks(chunkRows);
    totalChunks += chunkRows.length;
    newPapers++;

    console.log(
      `[ingest] Stored ${chunkRows.length} chunks for paper ${inserted.id}`,
    );
  }

  // Update topic sync metadata
  const totalPapersForTopic = existingIds.size + newPapers;
  await updateTopicSyncTime(topicId, totalPapersForTopic);

  console.log(
    `[ingest] Done. newPapers=${newPapers}, totalChunks=${totalChunks}`,
  );

  return { newPapers, totalChunks };
}
