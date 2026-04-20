/**
 * Fast quality ingestion — Semantic Scholar bulk search only, no per-paper enrichment.
 *
 * Bypasses the HF enrichment loop that was hitting heavy 429 rate limits.
 * Pulls the top citation-sorted papers per topic, embeds, and inserts.
 * HF enrichment can run separately as a backfill.
 */

import { db, topics, papers, topicPapers, paperChunks } from '@research-lab/db';
import { eq, sql } from 'drizzle-orm';
import { bulkSearchPapers, type SemanticScholarPaper } from '../worker/ingestion/semantic-scholar.js';
import { chunkText } from '../worker/ingestion/chunker.js';
import { embedChunks } from '../worker/ingestion/embedder.js';
import { computeQualityScore, isTopVenue } from '../worker/ingestion/quality-score.js';

const TOPICS: { name: string; query: string }[] = [
  { name: 'LLM Agents',                 query: 'large language model agent tool use autonomous planning' },
  { name: 'AI Safety & Alignment',      query: 'AI safety alignment RLHF constitutional reward model jailbreak' },
  { name: 'Reasoning & Chain-of-Thought', query: 'chain of thought reasoning mathematical problem solving LLM' },
  { name: 'Scaling & Architecture',     query: 'scaling laws transformer architecture mixture of experts efficient inference' },
  { name: 'Multi-Agent Systems',        query: 'multi-agent collaboration debate coordination LLM' },
  { name: 'RAG & Retrieval',            query: 'retrieval augmented generation RAG dense retrieval knowledge' },
  { name: 'Code Generation',            query: 'code generation programming language model synthesis repair' },
  { name: 'Vision & Multimodal',        query: 'vision language model multimodal reasoning understanding image' },
  { name: 'Fine-tuning & PEFT',         query: 'parameter efficient fine tuning LoRA instruction tuning DPO preference optimization' },
  { name: 'Evaluation & Benchmarks',    query: 'LLM evaluation benchmark leaderboard contamination assessment' },
];

const YEAR_START = 2025;
const YEAR_END = 2026;
const MIN_CITATIONS = 5;
const RECENCY_EXEMPT_DAYS = 90;
const PER_TOPIC_LIMIT = 150;

function passesQualityFilter(p: SemanticScholarPaper): boolean {
  const cites = p.citationCount ?? 0;
  const inf = p.influentialCitationCount ?? 0;
  if (inf >= 1) return true;
  if (cites >= MIN_CITATIONS) return true;
  if (p.publicationDate) {
    const ageDays = (Date.now() - new Date(p.publicationDate).getTime()) / 86400000;
    if (ageDays <= RECENCY_EXEMPT_DAYS) return true;
  }
  return false;
}

async function ensureTopic(name: string, query: string): Promise<string> {
  const existing = await db.select().from(topics).where(eq(topics.name, name));
  if (existing[0]) return existing[0].id;
  const [created] = await db.insert(topics).values({ name, query, schedule: 'manual' }).returning({ id: topics.id });
  return created.id;
}

async function main() {
  console.log('=== Fast Quality Ingestion (S2-only, no HF enrichment) ===');
  console.log(`Year: ${YEAR_START}-${YEAR_END} | Citation floor: ≥${MIN_CITATIONS} (exempt if ≤${RECENCY_EXEMPT_DAYS}d old)`);

  // Wipe (no-op if already empty)
  await db.delete(paperChunks);
  await db.delete(topicPapers);
  await db.delete(papers);
  console.log('[wipe] done');

  // Collect candidates per topic
  const allCandidates = new Map<string, { paper: SemanticScholarPaper; topics: string[] }>();
  const topicIdMap = new Map<string, string>();

  for (const t of TOPICS) {
    console.log(`\n[s2] Topic: "${t.name}"`);
    const topicId = await ensureTopic(t.name, t.query);
    topicIdMap.set(t.name, topicId);

    try {
      const candidates = await bulkSearchPapers({
        query: t.query,
        yearStart: YEAR_START,
        yearEnd: YEAR_END,
        limit: PER_TOPIC_LIMIT,
      });
      const passed = candidates.filter(passesQualityFilter);
      console.log(`[s2]   ${candidates.length} candidates → ${passed.length} pass quality filter`);

      for (const p of passed) {
        const arxivId = p.externalIds?.ArXiv;
        if (!arxivId || !p.abstract) continue;
        const key = arxivId;
        const entry = allCandidates.get(key);
        if (entry) entry.topics.push(t.name);
        else allCandidates.set(key, { paper: p, topics: [t.name] });
      }
    } catch (e) {
      console.error(`[s2]   error on "${t.name}":`, (e as Error).message);
    }
  }

  console.log(`\n[merge] ${allCandidates.size} unique papers across all topics`);

  // Ensure "All AI Papers" topic
  const allTopicId = await ensureTopic('All AI Papers', 'all-papers');

  // Insert papers in batches of 20 (so dashboard sees progress)
  const candidatesArr = Array.from(allCandidates.entries());
  let inserted = 0;
  const BATCH = 20;

  for (let i = 0; i < candidatesArr.length; i += BATCH) {
    const batch = candidatesArr.slice(i, i + BATCH);
    const texts = batch.map(([, e]) => e.paper.abstract!);
    let embeddings: number[][] = [];
    try {
      embeddings = await embedChunks(texts);
    } catch (e) {
      console.error('[embed] batch error, skipping:', (e as Error).message);
      continue;
    }

    for (let j = 0; j < batch.length; j++) {
      const [arxivId, { paper, topics: topicNames }] = batch[j];
      const emb = embeddings[j];
      if (!emb) continue;

      try {
        const id = paper.paperId;
        const qs = computeQualityScore({
          citationCount: paper.citationCount ?? 0,
          influentialCitationCount: paper.influentialCitationCount ?? 0,
          hfUpvotes: 0,
          venue: paper.venue,
          hasCode: false,
          openreviewDecision: null,
          publishedAt: paper.publicationDate ?? null,
        });

        await db.insert(papers).values({
          id,
          arxivId,
          title: paper.title,
          abstract: paper.abstract!,
          authors: paper.authors ?? [],
          categories: paper.fieldsOfStudy ?? [],
          publishedAt: paper.publicationDate ? new Date(paper.publicationDate) : null,
          venue: paper.venue ?? null,
          citationCount: paper.citationCount ?? 0,
          pdfUrl: `https://arxiv.org/pdf/${arxivId}`,
          influentialCitationCount: paper.influentialCitationCount ?? 0,
          isOpenAccess: paper.isOpenAccess ?? false,
          hfUpvotes: 0,
          hasCode: false,
          openreviewDecision: null,
          qualityScore: qs,
          publicationTypes: paper.publicationTypes ?? [],
        }).onConflictDoNothing();

        // Link to each topic + "All AI Papers"
        const linkTargets = new Set<string>([...topicNames.map((n) => topicIdMap.get(n)!).filter(Boolean), allTopicId]);
        for (const tid of linkTargets) {
          await db.insert(topicPapers).values({ topicId: tid, paperId: id }).onConflictDoNothing();
        }

        // Insert chunks (just the abstract for now)
        const chunks = chunkText(paper.abstract!);
        for (let k = 0; k < chunks.length; k++) {
          await db.insert(paperChunks).values({
            paperId: id,
            chunkIndex: chunks[k].chunkIndex,
            content: chunks[k].content,
            source: 'abstract',
            embedding: emb, // single-chunk abstract uses the doc embedding
          });
        }

        inserted++;
      } catch (e) {
        console.error('[insert] error:', (e as Error).message);
      }
    }
    console.log(`[insert] batch ${i / BATCH + 1}: ${inserted}/${candidatesArr.length} papers in DB`);
  }

  // Update topic paper_count
  for (const [name, id] of topicIdMap) {
    const [{ count }] = await db.execute<{ count: number }>(
      sql`SELECT COUNT(*)::int as count FROM topic_papers WHERE topic_id = ${id}`
    ) as unknown as Array<{ count: number }>;
    await db.update(topics).set({ paperCount: count, lastSyncAt: new Date() }).where(eq(topics.id, id));
    console.log(`[topic] "${name}": ${count} papers`);
  }
  // All AI Papers count
  const allCount = inserted;
  await db.update(topics).set({ paperCount: allCount, lastSyncAt: new Date() }).where(eq(topics.id, allTopicId));
  console.log(`[topic] "All AI Papers": ${allCount} papers`);

  console.log(`\n=== DONE: ${inserted} papers inserted ===`);
  process.exit(0);
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
