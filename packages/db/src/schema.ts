import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  primaryKey,
  index,
  boolean,
  real,
} from 'drizzle-orm/pg-core';
import { vector } from 'drizzle-orm/pg-core';

// Table 1: topics
export const topics = pgTable('topics', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  query: text('query').notNull(),
  schedule: text('schedule').notNull().default('manual'), // 'daily' | 'weekly' | 'manual'
  lastSyncAt: timestamp('last_sync_at'),
  paperCount: integer('paper_count').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Table 2: papers
export const papers = pgTable('papers', {
  id: text('id').primaryKey(), // Semantic Scholar paper ID
  arxivId: text('arxiv_id'),
  title: text('title').notNull(),
  abstract: text('abstract').notNull(),
  authors: jsonb('authors').$type<{ name: string; affiliations?: string[] }[]>().notNull(),
  categories: text('categories').array(),
  publishedAt: timestamp('published_at'),
  venue: text('venue'),
  citationCount: integer('citation_count').notNull().default(0),
  pdfUrl: text('pdf_url'),
  influentialCitationCount: integer('influential_citation_count').notNull().default(0),
  isOpenAccess: boolean('is_open_access').notNull().default(false),
  hfUpvotes: integer('hf_upvotes').notNull().default(0),
  hasCode: boolean('has_code').notNull().default(false),
  openreviewDecision: text('openreview_decision'),
  qualityScore: real('quality_score').notNull().default(0),
  publicationTypes: text('publication_types').array(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Table 3: topicPapers (join table)
export const topicPapers = pgTable('topic_papers', {
  topicId: uuid('topic_id').notNull().references(() => topics.id, { onDelete: 'cascade' }),
  paperId: text('paper_id').notNull().references(() => papers.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: primaryKey({ columns: [table.topicId, table.paperId] }),
}));

// Table 4: paperChunks
export const paperChunks = pgTable('paper_chunks', {
  id: uuid('id').defaultRandom().primaryKey(),
  paperId: text('paper_id').notNull().references(() => papers.id, { onDelete: 'cascade' }),
  chunkIndex: integer('chunk_index').notNull(),
  content: text('content').notNull(),
  source: text('source').notNull().default('abstract'), // 'abstract' | 'fulltext'
  embedding: vector('embedding', { dimensions: 768 }),
  metadata: jsonb('metadata').$type<{ section?: string; pageNum?: number }>(),
}, (table) => ({
  embeddingIdx: index('embedding_idx').using('hnsw', table.embedding.op('vector_cosine_ops')),
}));

// Table 5: jobs
export const jobs = pgTable('jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  topicId: uuid('topic_id').notNull().references(() => topics.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'ingest' | 'analyze'
  status: text('status').notNull().default('pending'), // 'pending' | 'running' | 'completed' | 'failed'
  progress: jsonb('progress').$type<{ step?: string; total?: number; message?: string }>(),
  error: text('error'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Table 6: artifacts
export const artifacts = pgTable('artifacts', {
  id: uuid('id').defaultRandom().primaryKey(),
  topicId: uuid('topic_id').notNull().references(() => topics.id, { onDelete: 'cascade' }),
  jobId: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  agentType: text('agent_type').notNull(), // 'paper-analyzer' | 'trend-mapper' | 'contradiction-finder' | 'benchmark-extractor' | 'frontier-detector'
  tabTarget: text('tab_target').notNull(), // 'overview' | 'insights' | 'connections' | 'papers' | 'frontiers'
  data: jsonb('data').notNull(), // Typed per agent
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Table 7: chatMessages
export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  topicId: uuid('topic_id').notNull().references(() => topics.id, { onDelete: 'cascade' }),
  role: text('role').notNull(), // 'user' | 'assistant'
  content: text('content').notNull(),
  artifacts: uuid('artifacts').array(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
