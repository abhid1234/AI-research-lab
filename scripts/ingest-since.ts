/**
 * Incremental, date-bounded ingestion — citation-quality filtered.
 *
 * Mirrors the existing `ingest-quality-fast.ts` selection logic:
 *   - relevance-ranked S2 search per topic, sorted by citationCount desc
 *   - quality bar: influentialCitationCount ≥ 1 OR citationCount ≥ 5
 *     (no recency exemption — the goal is highly-cited papers, not "everything new")
 *   - capped at PER_TOPIC_LIMIT (top ~50)
 *   - additive: only papers not already in DB
 *   - links new papers to their topic AND to "All AI Papers"
 *
 * Usage:
 *   tsx scripts/ingest-since.ts --since 2026-04-20
 *   tsx scripts/ingest-since.ts --since 2026-04-20 --until 2026-04-27
 */

import 'dotenv/config';
import { parseArgs } from 'node:util';
import { db, topics, papers, topicPapers, paperChunks } from '@research-lab/db';
import { eq, sql } from 'drizzle-orm';
import { chunkText } from '../worker/ingestion/chunker.js';
import { embedChunks } from '../worker/ingestion/embedder.js';
import { computeQualityScore } from '../worker/ingestion/quality-score.js';

const BASE_URL = 'https://api.semanticscholar.org/graph/v1';
const BULK_FIELDS =
  'paperId,externalIds,title,abstract,authors,venue,year,citationCount,influentialCitationCount,fieldsOfStudy,publicationDate,publicationTypes,isOpenAccess';

const PER_TOPIC_LIMIT = 50;
const MIN_CITATIONS = 5;
const META_TOPIC_NAME = 'All AI Papers';

function passesQualityFilter(p: { citationCount?: number; influentialCitationCount?: number }): boolean {
  if ((p.influentialCitationCount ?? 0) >= 1) return true;
  if ((p.citationCount ?? 0) >= MIN_CITATIONS) return true;
  return false;
}

interface S2Paper {
  paperId: string;
  externalIds?: { ArXiv?: string };
  title: string;
  abstract: string | null;
  authors: { name: string; affiliations?: string[] }[];
  venue?: string;
  year?: number;
  citationCount?: number;
  influentialCitationCount?: number;
  fieldsOfStudy?: string[];
  publicationDate?: string;
  publicationTypes?: string[];
  isOpenAccess?: boolean;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function s2Fetch(url: string, attempt = 0): Promise<Response> {
  const res = await fetch(url);
  if (res.status === 429) {
    const wait = 10000 + attempt * 5000;
    console.warn(`  [s2] 429 — waiting ${wait / 1000}s (retry ${attempt + 1}/5)`);
    if (attempt >= 5) throw new Error(`Rate limited after ${attempt} retries`);
    await sleep(wait);
    return s2Fetch(url, attempt + 1);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`S2 ${res.status}: ${body.slice(0, 200)}`);
  }
  return res;
}

async function searchSince(query: string, since: string, until: string): Promise<S2Paper[]> {
  // Pull a wider candidate window (citation-sorted) then we apply the quality
  // filter and cap downstream. We over-fetch so the filter has something to
  // chew on; PER_TOPIC_LIMIT is the post-filter cap.
  const FETCH_CAP = 500;
  const out: S2Paper[] = [];
  let token: string | undefined;
  while (out.length < FETCH_CAP) {
    await sleep(3000);
    const u = new URL(`${BASE_URL}/paper/search/bulk`);
    u.searchParams.set('query', query);
    u.searchParams.set('fields', BULK_FIELDS);
    u.searchParams.set('publicationDateOrYear', `${since}:${until}`);
    u.searchParams.set('fieldsOfStudy', 'Computer Science');
    u.searchParams.set('sort', 'citationCount:desc');
    if (token) u.searchParams.set('token', token);
    const res = await s2Fetch(u.toString());
    const json = (await res.json()) as { data?: S2Paper[]; token?: string };
    if (!json.data || json.data.length === 0) break;
    out.push(...json.data);
    if (!json.token) break;
    token = json.token;
  }
  return out;
}

async function main() {
  const { values } = parseArgs({
    options: {
      since: { type: 'string' },
      until: { type: 'string' },
    },
  });
  const since = values.since;
  if (!since) {
    console.error('Usage: tsx scripts/ingest-since.ts --since YYYY-MM-DD [--until YYYY-MM-DD]');
    process.exit(1);
  }
  const until = values.until ?? new Date().toISOString().slice(0, 10);

  console.log(`=== Incremental ingestion: ${since} → ${until} ===`);

  // Load all real (non-meta) topics
  const allTopics = await db.select().from(topics);
  const contentTopics = allTopics.filter((t) => t.name !== META_TOPIC_NAME);
  const allTopic = allTopics.find((t) => t.name === META_TOPIC_NAME);
  if (!allTopic) {
    console.error(`No "${META_TOPIC_NAME}" topic found.`);
    process.exit(1);
  }

  // Pre-load existing paper IDs so we filter cheaply
  const existingRows = await db.select({ id: papers.id }).from(papers);
  const existingIds = new Set(existingRows.map((r) => r.id));
  console.log(`[db] ${existingIds.size} papers already in DB`);

  // Collect candidates per topic, deduped by S2 paperId
  type CandidateEntry = { paper: S2Paper; topicIds: Set<string> };
  const candidates = new Map<string, CandidateEntry>();

  for (const t of contentTopics) {
    console.log(`\n[s2] "${t.name}" — query="${t.query}"`);
    let found: S2Paper[] = [];
    try {
      found = await searchSince(t.query, since, until);
    } catch (e) {
      console.error(`  error: ${(e as Error).message}`);
      continue;
    }
    const withAbstract = found.filter((p) => p.abstract && p.abstract.trim().length > 0);
    const passed = withAbstract.filter(passesQualityFilter).slice(0, PER_TOPIC_LIMIT);
    let newForTopic = 0;
    for (const p of passed) {
      if (existingIds.has(p.paperId)) continue;
      const entry = candidates.get(p.paperId);
      if (entry) {
        entry.topicIds.add(t.id);
      } else {
        candidates.set(p.paperId, { paper: p, topicIds: new Set([t.id]) });
        newForTopic++;
      }
    }
    console.log(`  ${found.length} returned · ${withAbstract.length} w/ abstract · ${passed.length} passed quality (cap ${PER_TOPIC_LIMIT}) · ${newForTopic} new for this topic`);
  }

  console.log(`\n[merge] ${candidates.size} unique new papers across all topics`);

  if (candidates.size === 0) {
    console.log('Nothing to insert. Exiting.');
    process.exit(0);
  }

  // Insert in batches of 20, embedding once per batch
  const arr = Array.from(candidates.entries());
  const BATCH = 20;
  let inserted = 0;
  for (let i = 0; i < arr.length; i += BATCH) {
    const batch = arr.slice(i, i + BATCH);
    let embeddings: number[][] = [];
    try {
      embeddings = await embedChunks(batch.map(([, e]) => e.paper.abstract!));
    } catch (e) {
      console.error(`[embed] batch ${i / BATCH + 1} failed: ${(e as Error).message}`);
      continue;
    }

    for (let j = 0; j < batch.length; j++) {
      const [s2Id, { paper, topicIds }] = batch[j];
      const emb = embeddings[j];
      if (!emb) continue;

      const arxivId = paper.externalIds?.ArXiv ?? null;
      const qs = computeQualityScore({
        citationCount: paper.citationCount ?? 0,
        influentialCitationCount: paper.influentialCitationCount ?? 0,
        hfUpvotes: 0,
        venue: paper.venue,
        hasCode: false,
        openreviewDecision: null,
        publishedAt: paper.publicationDate ?? null,
      });

      try {
        await db.insert(papers).values({
          id: s2Id,
          arxivId,
          title: paper.title,
          abstract: paper.abstract!,
          authors: paper.authors ?? [],
          categories: paper.fieldsOfStudy ?? [],
          publishedAt: paper.publicationDate ? new Date(paper.publicationDate) : null,
          venue: paper.venue ?? null,
          citationCount: paper.citationCount ?? 0,
          pdfUrl: arxivId ? `https://arxiv.org/pdf/${arxivId}` : null,
          influentialCitationCount: paper.influentialCitationCount ?? 0,
          isOpenAccess: paper.isOpenAccess ?? false,
          hfUpvotes: 0,
          hasCode: false,
          openreviewDecision: null,
          qualityScore: qs,
          publicationTypes: paper.publicationTypes ?? [],
        }).onConflictDoNothing();

        const linkTargets = new Set<string>([...topicIds, allTopic.id]);
        for (const tid of linkTargets) {
          await db.insert(topicPapers).values({ topicId: tid, paperId: s2Id }).onConflictDoNothing();
        }

        const chunks = chunkText(paper.abstract!);
        for (const c of chunks) {
          await db.insert(paperChunks).values({
            paperId: s2Id,
            chunkIndex: c.chunkIndex,
            content: c.content,
            source: 'abstract',
            embedding: emb,
          });
        }
        inserted++;
      } catch (e) {
        console.error(`[insert] ${s2Id} failed: ${(e as Error).message}`);
      }
    }
    console.log(`[insert] batch ${i / BATCH + 1}: ${inserted}/${arr.length} done`);
  }

  // Recompute paperCount + lastSyncAt for every topic touched (incl. All AI Papers)
  const touchedTopicIds = new Set<string>();
  for (const [, { topicIds }] of candidates) for (const tid of topicIds) touchedTopicIds.add(tid);
  touchedTopicIds.add(allTopic.id);

  for (const tid of touchedTopicIds) {
    const res = (await db.execute(
      sql`SELECT COUNT(*)::int AS count FROM topic_papers WHERE topic_id = ${tid}`,
    )) as unknown as { rows?: Array<{ count: number }> } | Array<{ count: number }>;
    const rows = Array.isArray(res) ? res : (res.rows ?? []);
    const count = rows[0]?.count ?? 0;
    if (count === 0) {
      console.warn(`  [warn] computed count=0 for topic ${tid} — skipping paperCount update to avoid clobber`);
      await db.update(topics).set({ lastSyncAt: new Date() }).where(eq(topics.id, tid));
    } else {
      await db.update(topics).set({ paperCount: count, lastSyncAt: new Date() }).where(eq(topics.id, tid));
    }
  }

  console.log(`\n=== DONE: inserted ${inserted} new papers ===`);
  process.exit(0);
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
