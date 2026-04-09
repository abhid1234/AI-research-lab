import 'dotenv/config';
import { parseArgs } from 'node:util';
import { db } from '@research-lab/db';
import { topics, papers, topicPapers, paperChunks } from '@research-lab/db';
import { eq } from 'drizzle-orm';
import { embedChunks } from '../worker/ingestion/embedder.js';
import { chunkText } from '../worker/ingestion/chunker.js';

const ARXIV_API = 'https://export.arxiv.org/api/query';

interface ArxivPaper {
  id: string;
  title: string;
  abstract: string;
  authors: string[];
  categories: string[];
  published: string;
  pdfUrl: string;
}

async function searchArxiv(query: string, maxResults: number): Promise<ArxivPaper[]> {
  const url = `${ARXIV_API}?search_query=all:${encodeURIComponent(query)}&start=0&max_results=${maxResults}&sortBy=submittedDate&sortOrder=descending`;

  console.log(`[arxiv] Searching: ${query} (limit ${maxResults})`);
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
    const authors: string[] = [];
    let authorMatch;
    while ((authorMatch = authorRegex.exec(entry)) !== null) {
      authors.push(authorMatch[1]);
    }

    const catRegex = /category term="([^"]+)"/g;
    const categories: string[] = [];
    let catMatch;
    while ((catMatch = catRegex.exec(entry)) !== null) {
      categories.push(catMatch[1]);
    }

    if (title && abstract && abstract.length > 50) {
      entries.push({ id, title, abstract, authors, categories, published, pdfUrl: `https://arxiv.org/pdf/${id}` });
    }
  }

  console.log(`[arxiv] Found ${entries.length} papers with abstracts`);
  return entries;
}

function extractTag(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, 's');
  const m = regex.exec(xml);
  return m ? m[1] : null;
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  const { values } = parseArgs({
    options: {
      topic: { type: 'string', short: 't' },
      count: { type: 'string', short: 'c', default: '15' },
      query: { type: 'string', short: 'q' },
    },
  });

  if (!values.topic) {
    console.error('Usage: tsx scripts/ingest-arxiv.ts --topic "LLM Agents" --count 15 --query "large language model agent"');
    process.exit(1);
  }

  const topicName = values.topic;
  const count = parseInt(values.count!, 10);
  const searchQuery = values.query ?? topicName;

  let [topic] = await db.select().from(topics).where(eq(topics.name, topicName));
  if (!topic) {
    [topic] = await db.insert(topics).values({ name: topicName, query: searchQuery }).returning();
    console.log(`Created topic: "${topicName}" (${topic.id})`);
  } else {
    console.log(`Found topic: "${topicName}" (${topic.id})`);
  }

  const arxivPapers = await searchArxiv(searchQuery, count);
  await sleep(3000);

  let newPapers = 0;
  let totalChunks = 0;

  for (const ap of arxivPapers) {
    const [existing] = await db.select().from(papers).where(eq(papers.id, ap.id));
    if (existing) {
      await db.insert(topicPapers).values({ topicId: topic.id, paperId: ap.id }).onConflictDoNothing();
      continue;
    }

    await db.insert(papers).values({
      id: ap.id,
      arxivId: ap.id,
      title: ap.title,
      abstract: ap.abstract,
      authors: ap.authors.map(name => ({ name })),
      categories: ap.categories,
      publishedAt: new Date(ap.published),
      citationCount: 0,
      pdfUrl: ap.pdfUrl,
    }).onConflictDoNothing();

    await db.insert(topicPapers).values({ topicId: topic.id, paperId: ap.id }).onConflictDoNothing();

    const chunks = chunkText(ap.abstract);
    console.log(`[embed] Embedding ${chunks.length} chunks for: ${ap.title.slice(0, 60)}...`);
    const vectors = await embedChunks(chunks.map(c => c.content));

    for (let i = 0; i < chunks.length; i++) {
      await db.insert(paperChunks).values({
        paperId: ap.id,
        chunkIndex: chunks[i].chunkIndex,
        content: chunks[i].content,
        source: 'abstract',
        embedding: vectors[i],
      });
    }

    newPapers++;
    totalChunks += chunks.length;
    console.log(`[ingest] Done: ${ap.title.slice(0, 70)} (${chunks.length} chunks)`);
    await sleep(500);
  }

  const paperCount = (await db.select().from(topicPapers).where(eq(topicPapers.topicId, topic.id))).length;
  await db.update(topics).set({ lastSyncAt: new Date(), paperCount }).where(eq(topics.id, topic.id));

  console.log(`\nComplete: ${newPapers} new papers, ${totalChunks} chunks embedded`);
  console.log(`Topic "${topicName}" now has ${paperCount} papers total`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
