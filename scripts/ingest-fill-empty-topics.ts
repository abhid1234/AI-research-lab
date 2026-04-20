/**
 * Backfill the 4 empty content topics (Scaling, Fine-tuning, Evaluation, Safety)
 * with broader Semantic Scholar searches.
 *
 * The original ingest-quality-fast.ts queries were too narrow and returned 0
 * papers passing the citation filter. Use shorter, broader queries here.
 */

import { db, topics, papers, topicPapers, paperChunks } from '@research-lab/db';
import { eq } from 'drizzle-orm';
import { bulkSearchPapers, type SemanticScholarPaper } from '../worker/ingestion/semantic-scholar.js';
import { chunkText } from '../worker/ingestion/chunker.js';
import { embedChunks } from '../worker/ingestion/embedder.js';
import { computeQualityScore } from '../worker/ingestion/quality-score.js';

const TOPICS = [
  { name: 'Scaling & Architecture',  query: 'transformer architecture scaling laws mixture of experts efficient' },
  { name: 'Fine-tuning & PEFT',      query: 'LoRA fine-tuning instruction tuning DPO preference optimization' },
  { name: 'Evaluation & Benchmarks', query: 'LLM evaluation benchmark contamination assessment' },
  { name: 'AI Safety & Alignment',   query: 'AI safety RLHF alignment jailbreak red team' },
];

const YEAR_START = 2024;  // wider window to find more papers
const YEAR_END = 2026;
const PER_TOPIC_LIMIT = 200;

async function ensureTopic(name: string, query: string): Promise<string> {
  const existing = await db.select().from(topics).where(eq(topics.name, name));
  if (existing[0]) return existing[0].id;
  const [created] = await db.insert(topics).values({ name, query, schedule: 'manual' }).returning({ id: topics.id });
  return created.id;
}

function passesQualityFilter(p: SemanticScholarPaper): boolean {
  const cites = p.citationCount ?? 0;
  const inf = p.influentialCitationCount ?? 0;
  if (inf >= 1) return true;
  if (cites >= 3) return true;  // looser than the main pipeline (≥3 vs ≥5)
  if (p.publicationDate) {
    const ageDays = (Date.now() - new Date(p.publicationDate).getTime()) / 86400000;
    if (ageDays <= 90) return true;
  }
  return false;
}

async function main() {
  const allTopic = await db.select().from(topics).where(eq(topics.name, 'All AI Papers'));
  const allTopicId = allTopic[0]?.id;

  for (const t of TOPICS) {
    console.log(`\n=== ${t.name} ===`);
    console.log(`  Query: ${t.query}`);

    const topicId = await ensureTopic(t.name, t.query);

    let candidates: SemanticScholarPaper[] = [];
    try {
      candidates = await bulkSearchPapers({
        query: t.query,
        yearStart: YEAR_START,
        yearEnd: YEAR_END,
        limit: PER_TOPIC_LIMIT,
      });
    } catch (e) {
      console.error('  S2 error:', (e as Error).message);
      continue;
    }

    const passed = candidates.filter(passesQualityFilter);
    console.log(`  ${candidates.length} candidates → ${passed.length} pass filter`);

    let inserted = 0;
    const BATCH = 20;

    for (let i = 0; i < passed.length; i += BATCH) {
      const batch = passed.slice(i, i + BATCH).filter((p) => p.externalIds?.ArXiv && p.abstract);
      if (batch.length === 0) continue;

      const texts = batch.map((p) => p.abstract!);
      let embeddings: number[][] = [];
      try {
        embeddings = await embedChunks(texts);
      } catch (e) {
        console.error('  embed error:', (e as Error).message);
        continue;
      }

      for (let j = 0; j < batch.length; j++) {
        const p = batch[j];
        const arxivId = p.externalIds!.ArXiv!;
        const id = p.paperId;
        const emb = embeddings[j];
        if (!emb) continue;

        try {
          const qs = computeQualityScore({
            citationCount: p.citationCount ?? 0,
            influentialCitationCount: p.influentialCitationCount ?? 0,
            hfUpvotes: 0,
            venue: p.venue,
            hasCode: false,
            openreviewDecision: null,
            publishedAt: p.publicationDate ?? null,
          });

          await db.insert(papers).values({
            id,
            arxivId,
            title: p.title,
            abstract: p.abstract!,
            authors: p.authors ?? [],
            categories: p.fieldsOfStudy ?? [],
            publishedAt: p.publicationDate ? new Date(p.publicationDate) : null,
            venue: p.venue ?? null,
            citationCount: p.citationCount ?? 0,
            pdfUrl: `https://arxiv.org/pdf/${arxivId}`,
            influentialCitationCount: p.influentialCitationCount ?? 0,
            isOpenAccess: p.isOpenAccess ?? false,
            hfUpvotes: 0,
            hasCode: false,
            openreviewDecision: null,
            qualityScore: qs,
            publicationTypes: p.publicationTypes ?? [],
          }).onConflictDoNothing();

          await db.insert(topicPapers).values({ topicId, paperId: id }).onConflictDoNothing();
          if (allTopicId) await db.insert(topicPapers).values({ topicId: allTopicId, paperId: id }).onConflictDoNothing();

          const chunks = chunkText(p.abstract!);
          for (let k = 0; k < chunks.length; k++) {
            await db.insert(paperChunks).values({
              paperId: id,
              chunkIndex: chunks[k].chunkIndex,
              content: chunks[k].content,
              source: 'abstract',
              embedding: emb,
            }).onConflictDoNothing();
          }
          inserted++;
        } catch (e) {
          console.error('  insert error:', (e as Error).message);
        }
      }
    }

    console.log(`  → ${inserted} papers added`);
  }

  // Recompute paper_count
  const result = await db.execute<{ name: string; count: number }>(
    `UPDATE topics SET paper_count = (SELECT count(*) FROM topic_papers WHERE topic_id = topics.id), last_sync_at = NOW()` as any
  );

  console.log('\n=== DONE ===');
  process.exit(0);
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
