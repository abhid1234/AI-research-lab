/**
 * ingest-quality-v2.ts
 *
 * Quality-first paper ingestion pipeline.
 * Sources: Semantic Scholar bulk search (primary) + HuggingFace Daily Papers +
 *          Papers with Code + OpenReview Oral/Spotlight.
 *
 * Usage:
 *   DATABASE_URL="..." GOOGLE_GENERATIVE_AI_API_KEY="..." npx tsx scripts/ingest-quality-v2.ts
 */

import 'dotenv/config';
import { db } from '@research-lab/db';
import {
  topics,
  papers,
  paperChunks,
  topicPapers,
  artifacts,
  jobs,
} from '@research-lab/db';
import { eq } from 'drizzle-orm';
import { bulkSearchPapers, getPaperByArxivId } from '../worker/ingestion/semantic-scholar.js';
import { fetchHFDailyPapers } from '../worker/ingestion/huggingface.js';
import { fetchPapersWithCode } from '../worker/ingestion/papers-with-code.js';
import { fetchOpenReviewAccepts } from '../worker/ingestion/openreview.js';
import { computeQualityScore } from '../worker/ingestion/quality-score.js';
import { chunkText } from '../worker/ingestion/chunker.js';
import { embedChunks } from '../worker/ingestion/embedder.js';
import type { SemanticScholarPaper } from '../worker/ingestion/semantic-scholar.js';

// ─── Constants ───────────────────────────────────────────────────────────────

const YEAR_START = 2025;
const YEAR_END = 2026;
const MIN_CITATIONS = 5;
const RECENCY_EXEMPT_DAYS = 90;
const BULK_LIMIT_PER_TOPIC = 150;

const TOPIC_QUERIES: Record<string, string> = {
  'LLM Agents':
    'large language model agent tool use autonomous planning',
  'AI Safety & Alignment':
    'AI safety alignment RLHF constitutional reward model jailbreak',
  'Reasoning & Chain-of-Thought':
    'chain of thought reasoning mathematical problem solving LLM',
  'Scaling & Architecture':
    'scaling laws transformer architecture mixture of experts efficient inference',
  'Multi-Agent Systems':
    'multi-agent collaboration debate coordination LLM',
  'RAG & Retrieval':
    'retrieval augmented generation RAG dense retrieval knowledge',
  'Code Generation':
    'code generation programming language model synthesis repair',
  'Vision & Multimodal':
    'vision language model multimodal reasoning understanding image',
  'Fine-tuning & PEFT':
    'parameter efficient fine tuning LoRA instruction tuning DPO preference optimization',
  'Evaluation & Benchmarks':
    'LLM evaluation benchmark leaderboard contamination assessment',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeTitle(t: string) {
  return t.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}

function isQualityPaper(p: SemanticScholarPaper): boolean {
  if (!p.abstract || p.abstract.trim().length < 50) return false;
  const citations = p.citationCount ?? 0;
  const influentialCitations = p.influentialCitationCount ?? 0;

  // Recency exemption — skip citation floor if paper is fresh enough
  const pubDate = p.publicationDate ? new Date(p.publicationDate) : null;
  const ageDays = pubDate
    ? (Date.now() - pubDate.getTime()) / 86400000
    : 999;
  const isRecent = ageDays <= RECENCY_EXEMPT_DAYS;

  if (isRecent) return true;
  return citations >= MIN_CITATIONS || influentialCitations >= 1;
}

async function getOrCreateTopic(name: string, query: string) {
  const [existing] = await db.select().from(topics).where(eq(topics.name, name));
  if (existing) return existing;
  const [created] = await db
    .insert(topics)
    .values({ name, query })
    .returning();
  return created;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Quality-First Ingestion Pipeline v2 ===');
  console.log(`Year range: ${YEAR_START}–${YEAR_END}`);
  console.log(`Citation floor: ≥${MIN_CITATIONS} (exempt if ≤${RECENCY_EXEMPT_DAYS} days old)\n`);

  // ── 1. Wipe existing data (keep topics) ──────────────────────────────────
  console.log('[wipe] Deleting existing paper data...');
  await db.delete(artifacts);
  await db.delete(jobs);
  await db.delete(paperChunks);
  await db.delete(topicPapers);
  await db.delete(papers);
  console.log('[wipe] Done.\n');

  // ── 2. Fetch secondary signals (once, not per topic) ─────────────────────
  console.log('[hf] Fetching HuggingFace Daily Papers (daysBack=180, minUpvotes=20)...');
  const hfPapers = await fetchHFDailyPapers({ daysBack: 180, minUpvotes: 20 });
  const hfMap = new Map<string, number>(); // arxivId → upvotes
  for (const p of hfPapers) hfMap.set(p.arxivId, p.upvotes);
  console.log(`[hf] ${hfPapers.length} papers (${hfMap.size} unique arxiv IDs)\n`);

  console.log('[pwc] Fetching Papers with Code...');
  const pwcMap = await fetchPapersWithCode({ yearStart: YEAR_START, limit: 500 });
  console.log(`[pwc] ${pwcMap.size} papers with code\n`);

  console.log('[openreview] Fetching OpenReview Oral/Spotlight...');
  const orPapers = await fetchOpenReviewAccepts();
  // Build title→decision map for cross-reference
  const orTitleMap = new Map<string, 'Oral' | 'Spotlight'>();
  for (const p of orPapers) {
    if (p.title) orTitleMap.set(normalizeTitle(p.title), p.decision);
  }
  console.log(`[openreview] ${orPapers.length} Oral/Spotlight papers\n`);

  // ── 3. Per-topic S2 bulk search ──────────────────────────────────────────
  // Collect all papers across all topics before inserting, so we can dedupe globally
  const globalPaperMap = new Map<string, {
    paper: SemanticScholarPaper;
    topicNames: Set<string>;
  }>();

  for (const [topicName, query] of Object.entries(TOPIC_QUERIES)) {
    console.log(`\n[s2] Topic: "${topicName}"`);
    console.log(`[s2] Query: "${query}"`);

    let candidates: SemanticScholarPaper[] = [];
    try {
      candidates = await bulkSearchPapers({
        query,
        yearStart: YEAR_START,
        yearEnd: YEAR_END,
        limit: BULK_LIMIT_PER_TOPIC,
      });
    } catch (err) {
      console.error(`[s2] Failed to fetch papers for "${topicName}": ${err}`);
      continue;
    }

    const qualified = candidates.filter(isQualityPaper);
    console.log(`[s2] ${candidates.length} candidates → ${qualified.length} pass quality filter`);

    for (const p of qualified) {
      const key = p.paperId;
      if (globalPaperMap.has(key)) {
        globalPaperMap.get(key)!.topicNames.add(topicName);
      } else {
        globalPaperMap.set(key, { paper: p, topicNames: new Set([topicName]) });
      }
    }
  }

  console.log(`\n[s2] Total unique papers across all topics: ${globalPaperMap.size}`);

  // ── 4. Enrich HF papers not already in S2 results ───────────────────────
  console.log('\n[hf-enrich] Looking up HF papers not already in S2 results...');
  // Build arxivId → paperId reverse map from global set
  const arxivToS2Id = new Map<string, string>();
  for (const [pid, { paper }] of globalPaperMap) {
    if (paper.externalIds?.ArXiv) {
      arxivToS2Id.set(paper.externalIds.ArXiv, pid);
    }
  }

  let hfEnriched = 0;
  for (const hfPaper of hfPapers) {
    if (arxivToS2Id.has(hfPaper.arxivId)) continue; // already in S2 results
    const s2Paper = await getPaperByArxivId(hfPaper.arxivId);
    if (!s2Paper || !s2Paper.paperId || !isQualityPaper(s2Paper)) continue;

    const key = s2Paper.paperId;
    if (!globalPaperMap.has(key)) {
      globalPaperMap.set(key, { paper: s2Paper, topicNames: new Set(['Trending']) });
      hfEnriched++;
    }
    if (s2Paper.externalIds?.ArXiv) {
      arxivToS2Id.set(s2Paper.externalIds.ArXiv, key);
    }
  }
  console.log(`[hf-enrich] Added ${hfEnriched} HF-only papers`);

  // ── 5. Insert all papers ─────────────────────────────────────────────────
  console.log('\n[insert] Inserting papers into DB...');
  const topicCountMap = new Map<string, number>();
  let insertedCount = 0;

  // Ensure topic rows exist (including "Trending" if we have HF-only papers)
  const allTopicNames = new Set<string>([
    ...Object.keys(TOPIC_QUERIES),
    'All AI Papers',
    ...(hfEnriched > 0 ? ['Trending'] : []),
  ]);
  const topicRowMap = new Map<string, string>(); // name → id
  for (const name of allTopicNames) {
    const query = TOPIC_QUERIES[name] ?? name.toLowerCase();
    const row = await getOrCreateTopic(name, query);
    topicRowMap.set(name, row.id);
  }

  for (const [paperId, { paper, topicNames }] of globalPaperMap) {
    const arxivId = paper.externalIds?.ArXiv ?? null;

    // Enrich with secondary signals
    const hfUpvotes = arxivId ? (hfMap.get(arxivId) ?? 0) : 0;
    const hasCode = arxivId ? pwcMap.has(arxivId) : false;
    const normTitle = normalizeTitle(paper.title ?? '');
    const openreviewDecision = orTitleMap.get(normTitle) ?? null;

    const qualityScore = computeQualityScore({
      citationCount: paper.citationCount ?? 0,
      influentialCitationCount: paper.influentialCitationCount ?? 0,
      hfUpvotes,
      venue: paper.venue,
      hasCode,
      openreviewDecision,
      publishedAt: paper.publicationDate ? new Date(paper.publicationDate) : null,
    });

    const pdfUrl = arxivId ? `https://arxiv.org/pdf/${arxivId}` : null;

    try {
      await db
        .insert(papers)
        .values({
          id: paperId,
          arxivId,
          title: paper.title ?? 'Untitled',
          abstract: paper.abstract ?? '',
          authors: (paper.authors ?? []).map((a) => ({ name: a.name, affiliations: a.affiliations })),
          categories: paper.fieldsOfStudy ?? [],
          publishedAt: paper.publicationDate ? new Date(paper.publicationDate) : null,
          venue: paper.venue ?? null,
          citationCount: paper.citationCount ?? 0,
          influentialCitationCount: paper.influentialCitationCount ?? 0,
          isOpenAccess: paper.isOpenAccess ?? false,
          hfUpvotes,
          hasCode,
          openreviewDecision,
          qualityScore,
          publicationTypes: paper.publicationTypes ?? null,
          pdfUrl,
        })
        .onConflictDoNothing();

      // Link to all relevant topics
      for (const topicName of topicNames) {
        const topicId = topicRowMap.get(topicName);
        if (!topicId) continue;
        await db
          .insert(topicPapers)
          .values({ topicId, paperId })
          .onConflictDoNothing();
        topicCountMap.set(topicName, (topicCountMap.get(topicName) ?? 0) + 1);
      }

      insertedCount++;
      if (insertedCount % 25 === 0) {
        console.log(`[insert] ${insertedCount}/${globalPaperMap.size} papers inserted...`);
      }
    } catch (err) {
      console.error(`[insert] Failed for paper ${paperId}: ${err}`);
    }
  }

  console.log(`[insert] Done: ${insertedCount} papers inserted`);

  // ── 6. Embed abstracts + insert chunks ───────────────────────────────────
  console.log('\n[embed] Embedding abstracts...');
  const allPaperRows = await db.select({ id: papers.id, abstract: papers.abstract }).from(papers);
  let chunksTotal = 0;
  let embedCount = 0;

  for (const row of allPaperRows) {
    if (!row.abstract || row.abstract.trim().length < 10) continue;
    const chunks = chunkText(row.abstract);
    const vectors = await embedChunks(chunks.map((c) => c.content));
    const chunkRows = chunks.map((chunk, i) => ({
      paperId: row.id,
      chunkIndex: chunk.chunkIndex,
      content: chunk.content,
      source: 'abstract' as const,
      embedding: vectors[i],
    }));
    await db.insert(paperChunks).values(chunkRows).onConflictDoNothing();
    chunksTotal += chunkRows.length;
    embedCount++;
    if (embedCount % 50 === 0) {
      console.log(`[embed] ${embedCount}/${allPaperRows.length} papers embedded...`);
    }
  }
  console.log(`[embed] Done: ${chunksTotal} chunks across ${embedCount} papers`);

  // ── 7. Link All AI Papers topic to every paper ───────────────────────────
  console.log('\n[all-ai] Linking all papers to "All AI Papers" topic...');
  const allTopicId = topicRowMap.get('All AI Papers')!;
  const allPaperIds = await db.select({ id: papers.id }).from(papers);
  for (const p of allPaperIds) {
    await db
      .insert(topicPapers)
      .values({ topicId: allTopicId, paperId: p.id })
      .onConflictDoNothing();
  }
  topicCountMap.set('All AI Papers', allPaperIds.length);
  console.log(`[all-ai] Linked ${allPaperIds.length} papers`);

  // ── 8. Update topic paper counts ─────────────────────────────────────────
  for (const [name, topicId] of topicRowMap) {
    const count = topicCountMap.get(name) ?? 0;
    await db
      .update(topics)
      .set({ lastSyncAt: new Date(), paperCount: count })
      .where(eq(topics.id, topicId));
  }

  // ── 9. Print summary ─────────────────────────────────────────────────────
  console.log('\n════════════════════════════════════════════════════');
  console.log('INGESTION COMPLETE');
  console.log('════════════════════════════════════════════════════');
  console.log(`Total papers inserted: ${insertedCount}`);
  console.log(`Total chunks created:  ${chunksTotal}`);

  console.log('\nPapers per topic:');
  for (const [name, count] of [...topicCountMap.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${name.padEnd(30)} ${count}`);
  }

  // Top 10 by quality score
  const { qualityScore: qs, title: tt, citationCount: cc } = papers;
  const top10 = await db
    .select({ title: tt, qualityScore: qs, citationCount: cc })
    .from(papers)
    .orderBy(qs) // drizzle default ascending — we'll sort in JS
    .limit(10000); // fetch all, sort in JS for desc

  const sortedTop10 = top10.sort((a, b) => (b.qualityScore ?? 0) - (a.qualityScore ?? 0)).slice(0, 10);

  console.log('\nTop 10 papers by quality score:');
  sortedTop10.forEach((p, i) => {
    console.log(
      `  ${String(i + 1).padStart(2)}. [score=${(p.qualityScore ?? 0).toFixed(2)}, cites=${p.citationCount}] ${p.title?.slice(0, 80)}`,
    );
  });

  console.log('\nDone.');
  process.exit(0);
}

main().catch((e) => {
  console.error('[fatal]', e);
  process.exit(1);
});
