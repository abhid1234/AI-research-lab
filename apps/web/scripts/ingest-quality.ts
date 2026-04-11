import 'dotenv/config';
import { db } from '@research-lab/db';
import { topics, papers, topicPapers, paperChunks } from '@research-lab/db';
import { eq } from 'drizzle-orm';
import { embedChunks } from '../worker/ingestion/embedder.js';
import { chunkText } from '../worker/ingestion/chunker.js';

/**
 * Quality-first arxiv ingestion.
 * Only cs.AI, cs.CL, cs.LG, cs.MA, cs.CV, stat.ML categories.
 * Filters to papers from the last 6 months.
 */

const ARXIV_API = 'https://export.arxiv.org/api/query';
const AI_CATEGORIES = ['cs.AI', 'cs.CL', 'cs.LG', 'cs.MA', 'cs.CV', 'stat.ML'];
const SIX_MONTHS_AGO = new Date();
SIX_MONTHS_AGO.setMonth(SIX_MONTHS_AGO.getMonth() - 6);

interface ArxivPaper {
  id: string;
  title: string;
  abstract: string;
  authors: string[];
  categories: string[];
  published: string;
  pdfUrl: string;
}

function extractTag(xml: string, tag: string): string | null {
  const regex = new RegExp('<' + tag + '[^>]*>(.*?)</' + tag + '>', 's');
  const m = regex.exec(xml);
  return m ? m[1] : null;
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function searchArxiv(query: string, category: string, maxResults: number): Promise<ArxivPaper[]> {
  const searchQuery = 'cat:' + category + ' AND all:' + query;
  const url = ARXIV_API + '?search_query=' + encodeURIComponent(searchQuery) + '&start=0&max_results=' + maxResults + '&sortBy=submittedDate&sortOrder=descending';

  const res = await fetch(url);
  const xml = await res.text();
  const entries: ArxivPaper[] = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;

  while ((match = entryRegex.exec(xml)) !== null) {
    const entry = match[1];
    const id = extractTag(entry, 'id')?.replace('http://arxiv.org/abs/', '') ?? '';
    const title = extractTag(entry, 'title')?.replace(/\s+/g, ' ').trim() ?? '';
    const abstract = extractTag(entry, 'summary')?.replace(/\s+/g, ' ').trim() ?? '';
    const published = extractTag(entry, 'published')?.slice(0, 10) ?? '';

    const authorRegex = /<author>\s*<name>(.*?)<\/name>/g;
    const authorList: string[] = [];
    let am;
    while ((am = authorRegex.exec(entry)) !== null) authorList.push(am[1]);

    const catRegex = /category term="([^"]+)"/g;
    const catList: string[] = [];
    let cm;
    while ((cm = catRegex.exec(entry)) !== null) catList.push(cm[1]);

    const pubDate = new Date(published);
    const isRecent = pubDate >= SIX_MONTHS_AGO;
    const isAI = catList.some(c => AI_CATEGORIES.includes(c));

    if (title && abstract && abstract.length > 100 && isAI && isRecent) {
      entries.push({ id, title, abstract, authors: authorList, categories: catList, published, pdfUrl: 'https://arxiv.org/pdf/' + id });
    }
  }
  return entries;
}

async function ingestPapers(topicId: string, found: ArxivPaper[]): Promise<number> {
  let count = 0;
  for (const ap of found) {
    const [existing] = await db.select().from(papers).where(eq(papers.id, ap.id));
    if (existing) {
      await db.insert(topicPapers).values({ topicId, paperId: ap.id }).onConflictDoNothing();
      continue;
    }
    await db.insert(papers).values({
      id: ap.id, arxivId: ap.id, title: ap.title, abstract: ap.abstract,
      authors: ap.authors.map(name => ({ name })), categories: ap.categories,
      publishedAt: new Date(ap.published), citationCount: 0, pdfUrl: ap.pdfUrl,
    }).onConflictDoNothing();
    await db.insert(topicPapers).values({ topicId, paperId: ap.id }).onConflictDoNothing();

    const chunks = chunkText(ap.abstract);
    const vectors = await embedChunks(chunks.map(c => c.content));
    for (let i = 0; i < chunks.length; i++) {
      await db.insert(paperChunks).values({
        paperId: ap.id, chunkIndex: chunks[i].chunkIndex,
        content: chunks[i].content, source: 'abstract', embedding: vectors[i],
      });
    }
    count++;
    console.log('  + ' + ap.title.slice(0, 70));
    await sleep(300);
  }
  return count;
}

const TOPICS: { name: string; queries: { q: string; cat: string; n: number }[] }[] = [
  { name: 'LLM Agents', queries: [
    { q: 'language model agent tool use', cat: 'cs.AI', n: 20 },
    { q: 'autonomous agent planning reasoning', cat: 'cs.CL', n: 15 },
  ]},
  { name: 'AI Safety & Alignment', queries: [
    { q: 'RLHF alignment safety', cat: 'cs.AI', n: 15 },
    { q: 'constitutional AI red teaming jailbreak', cat: 'cs.CL', n: 10 },
  ]},
  { name: 'Reasoning & Chain-of-Thought', queries: [
    { q: 'chain of thought reasoning', cat: 'cs.CL', n: 15 },
    { q: 'mathematical reasoning LLM', cat: 'cs.AI', n: 10 },
  ]},
  { name: 'Scaling & Architecture', queries: [
    { q: 'scaling laws transformer architecture', cat: 'cs.LG', n: 15 },
    { q: 'mixture of experts efficient inference', cat: 'cs.CL', n: 10 },
  ]},
  { name: 'Multi-Agent Systems', queries: [
    { q: 'multi-agent collaboration debate', cat: 'cs.MA', n: 15 },
    { q: 'multi-agent LLM coordination', cat: 'cs.AI', n: 10 },
  ]},
  { name: 'RAG & Retrieval', queries: [
    { q: 'retrieval augmented generation RAG', cat: 'cs.CL', n: 15 },
    { q: 'dense retrieval knowledge grounding', cat: 'cs.CL', n: 10 },
  ]},
  { name: 'Code Generation', queries: [
    { q: 'code generation LLM programming', cat: 'cs.CL', n: 15 },
    { q: 'code synthesis repair agent', cat: 'cs.SE', n: 10 },
  ]},
  { name: 'Vision & Multimodal', queries: [
    { q: 'vision language model multimodal', cat: 'cs.CV', n: 15 },
    { q: 'multimodal reasoning understanding', cat: 'cs.CL', n: 10 },
  ]},
  { name: 'Fine-tuning & PEFT', queries: [
    { q: 'parameter efficient fine tuning LoRA', cat: 'cs.CL', n: 15 },
    { q: 'instruction tuning preference optimization DPO', cat: 'cs.LG', n: 10 },
  ]},
  { name: 'Evaluation & Benchmarks', queries: [
    { q: 'LLM evaluation benchmark leaderboard', cat: 'cs.CL', n: 15 },
    { q: 'AI model evaluation contamination', cat: 'cs.AI', n: 10 },
  ]},
];

async function main() {
  console.log('=== Quality Paper Ingestion ===');
  console.log('Date cutoff: ' + SIX_MONTHS_AGO.toISOString().slice(0, 10));
  let grandTotal = 0;

  for (const t of TOPICS) {
    console.log('\n-- ' + t.name + ' --');
    let [topic] = await db.select().from(topics).where(eq(topics.name, t.name));
    if (!topic) {
      [topic] = await db.insert(topics).values({ name: t.name, query: t.queries[0].q }).returning();
    }
    let topicNew = 0;
    for (const q of t.queries) {
      console.log('  Search: ' + q.cat + ' "' + q.q + '" (max ' + q.n + ')');
      await sleep(3000);
      const found = await searchArxiv(q.q, q.cat, q.n);
      console.log('  Quality papers: ' + found.length);
      topicNew += await ingestPapers(topic.id, found);
    }
    const cnt = (await db.select().from(topicPapers).where(eq(topicPapers.topicId, topic.id))).length;
    await db.update(topics).set({ lastSyncAt: new Date(), paperCount: cnt }).where(eq(topics.id, topic.id));
    console.log('  Total for "' + t.name + '": ' + cnt);
    grandTotal += topicNew;
  }

  // Update All AI Papers
  let [allTopic] = await db.select().from(topics).where(eq(topics.name, 'All AI Papers'));
  if (!allTopic) {
    [allTopic] = await db.insert(topics).values({ name: 'All AI Papers', query: 'all' }).returning();
  }
  const allIds = await db.select({ id: papers.id }).from(papers);
  for (const p of allIds) {
    await db.insert(topicPapers).values({ topicId: allTopic.id, paperId: p.id }).onConflictDoNothing();
  }
  const total = (await db.select().from(topicPapers).where(eq(topicPapers.topicId, allTopic.id))).length;
  await db.update(topics).set({ lastSyncAt: new Date(), paperCount: total }).where(eq(topics.id, allTopic.id));

  console.log('\n=== DONE ===');
  console.log('New: ' + grandTotal + ' | Total unique: ' + total);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
