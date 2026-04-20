/**
 * Background HF backfill — UPSERT semantics.
 *
 * Fetches HuggingFace Daily Papers (last 180 days, ≥20 upvotes), then for each:
 *   - If already in DB (by arxivId): UPDATE hfUpvotes + recompute qualityScore
 *   - If not in DB: enrich via Semantic Scholar, embed, INSERT
 *
 * Slow on purpose (3s+ per S2 lookup) to stay under rate limits.
 * Safe to run alongside the dashboard — uses INSERT ... ON CONFLICT and UPDATE WHERE.
 */

import { db, papers, paperChunks, topics, topicPapers } from '@research-lab/db';
import { eq } from 'drizzle-orm';
import { fetchHFDailyPapers } from '../worker/ingestion/huggingface.js';
import { getPaperByArxivId } from '../worker/ingestion/semantic-scholar.js';
import { chunkText } from '../worker/ingestion/chunker.js';
import { embedChunks } from '../worker/ingestion/embedder.js';
import { computeQualityScore } from '../worker/ingestion/quality-score.js';

async function ensureTopic(name: string, query: string): Promise<string> {
  const existing = await db.select().from(topics).where(eq(topics.name, name));
  if (existing[0]) return existing[0].id;
  const [created] = await db.insert(topics).values({ name, query, schedule: 'manual' }).returning({ id: topics.id });
  return created.id;
}

async function main() {
  console.log('=== HF Backfill (background) ===');
  const hfTopicId = await ensureTopic('HuggingFace Trending', 'hf-trending');
  const allTopicId = await ensureTopic('All AI Papers', 'all-papers');

  const hfPapers = await fetchHFDailyPapers({ daysBack: 180, minUpvotes: 20 });
  console.log(`[hf] ${hfPapers.length} papers from HF Daily (last 180d, ≥20 upvotes)`);

  let updated = 0;
  let inserted = 0;
  let skipped = 0;

  for (const hf of hfPapers) {
    try {
      // Check if already in DB
      const existing = await db.select().from(papers).where(eq(papers.arxivId, hf.arxivId));

      if (existing[0]) {
        // UPDATE: bump hfUpvotes, recompute qualityScore
        const p = existing[0];
        const newQs = computeQualityScore({
          citationCount: p.citationCount,
          influentialCitationCount: p.influentialCitationCount,
          hfUpvotes: hf.upvotes,
          venue: p.venue,
          hasCode: p.hasCode,
          openreviewDecision: p.openreviewDecision,
          publishedAt: p.publishedAt,
        });
        await db.update(papers)
          .set({ hfUpvotes: hf.upvotes, qualityScore: newQs })
          .where(eq(papers.id, p.id));

        // Link to HF Trending
        await db.insert(topicPapers).values({ topicId: hfTopicId, paperId: p.id }).onConflictDoNothing();

        updated++;
        if (updated % 25 === 0) console.log(`[update] ${updated} existing papers enriched with HF upvotes`);
        continue;
      }

      // INSERT new: enrich via Semantic Scholar
      const s2 = await getPaperByArxivId(hf.arxivId);
      if (!s2 || !s2.abstract || !s2.paperId) {
        skipped++;
        continue;
      }

      const [emb] = await embedChunks([s2.abstract]);
      if (!emb) { skipped++; continue; }

      const qs = computeQualityScore({
        citationCount: s2.citationCount ?? 0,
        influentialCitationCount: s2.influentialCitationCount ?? 0,
        hfUpvotes: hf.upvotes,
        venue: s2.venue,
        hasCode: false,
        openreviewDecision: null,
        publishedAt: s2.publicationDate ?? hf.publishedAt,
      });

      await db.insert(papers).values({
        id: s2.paperId,
        arxivId: hf.arxivId,
        title: s2.title || hf.title,
        abstract: s2.abstract,
        authors: s2.authors ?? [],
        categories: s2.fieldsOfStudy ?? [],
        publishedAt: s2.publicationDate ? new Date(s2.publicationDate) : (hf.publishedAt ? new Date(hf.publishedAt) : null),
        venue: s2.venue ?? null,
        citationCount: s2.citationCount ?? 0,
        pdfUrl: `https://arxiv.org/pdf/${hf.arxivId}`,
        influentialCitationCount: s2.influentialCitationCount ?? 0,
        isOpenAccess: s2.isOpenAccess ?? false,
        hfUpvotes: hf.upvotes,
        hasCode: false,
        openreviewDecision: null,
        qualityScore: qs,
        publicationTypes: s2.publicationTypes ?? [],
      }).onConflictDoNothing();

      const chunks = chunkText(s2.abstract);
      for (const ch of chunks) {
        await db.insert(paperChunks).values({
          paperId: s2.paperId,
          chunkIndex: ch.chunkIndex,
          content: ch.content,
          source: 'abstract',
          embedding: emb,
        });
      }

      // Link to HF Trending + All Papers
      await db.insert(topicPapers).values({ topicId: hfTopicId, paperId: s2.paperId }).onConflictDoNothing();
      await db.insert(topicPapers).values({ topicId: allTopicId, paperId: s2.paperId }).onConflictDoNothing();

      inserted++;
      if (inserted % 10 === 0) console.log(`[insert] ${inserted} new HF papers added`);
    } catch (e) {
      console.error(`[err] ${hf.arxivId}:`, (e as Error).message);
    }
  }

  console.log(`\n=== DONE ===`);
  console.log(`Updated existing: ${updated}`);
  console.log(`Inserted new:     ${inserted}`);
  console.log(`Skipped:          ${skipped}`);
  process.exit(0);
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
