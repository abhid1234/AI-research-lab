import 'dotenv/config';
import { db } from '@research-lab/db';
import { topics, papers, topicPapers, paperChunks, artifacts, jobs } from '@research-lab/db';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Seeding demo data...');

  // Enable pgvector
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector`);

  // Create demo topic
  const [topic] = await db.insert(topics).values({
    name: 'LLM Agents',
    query: 'LLM agent framework',
    schedule: 'manual',
    paperCount: 5,
  }).returning();

  console.log(`Created topic: ${topic.name} (${topic.id})`);

  // Insert 5 demo papers
  const demoPapers = [
    { id: 'demo-001', title: 'ReAct: Synergizing Reasoning and Acting in Language Models', abstract: 'Large language models can both generate reasoning traces and task-specific actions in an interleaved manner...', authors: [{ name: 'Shunyu Yao' }, { name: 'Jeffrey Zhao' }], categories: ['cs.AI', 'cs.CL'], publishedAt: new Date('2023-03-01'), citationCount: 1250 },
    { id: 'demo-002', title: 'Toolformer: Language Models Can Teach Themselves to Use Tools', abstract: 'Language models exhibit remarkable abilities to solve new tasks from just a few examples or textual instructions...', authors: [{ name: 'Timo Schick' }], categories: ['cs.CL'], publishedAt: new Date('2023-02-01'), citationCount: 890 },
    { id: 'demo-003', title: 'AutoGPT: An Autonomous GPT-4 Experiment', abstract: 'An experimental open-source attempt to make GPT-4 fully autonomous...', authors: [{ name: 'Toran Richards' }], categories: ['cs.AI'], publishedAt: new Date('2023-04-01'), citationCount: 520 },
    { id: 'demo-004', title: 'Chain-of-Thought Prompting Elicits Reasoning in Large Language Models', abstract: 'We explore how generating a chain of thought improves the ability of large language models to perform complex reasoning...', authors: [{ name: 'Jason Wei' }, { name: 'Xuezhi Wang' }], categories: ['cs.CL'], publishedAt: new Date('2022-01-01'), citationCount: 3200 },
    { id: 'demo-005', title: 'Rethinking Multi-Agent Workflows', abstract: 'Single capable agents can match or outperform multi-agent systems on most tasks when given proper tool access...', authors: [{ name: 'Lisa Chen' }, { name: 'Mark Johnson' }], categories: ['cs.AI', 'cs.MA'], publishedAt: new Date('2026-01-15'), citationCount: 42 },
  ];

  for (const p of demoPapers) {
    await db.insert(papers).values(p).onConflictDoNothing();
    await db.insert(topicPapers).values({ topicId: topic.id, paperId: p.id }).onConflictDoNothing();

    // Create a chunk with a zero-vector embedding (1536 dims)
    const zeroVector = new Array(1536).fill(0);
    await db.insert(paperChunks).values({
      paperId: p.id,
      chunkIndex: 0,
      content: p.abstract,
      source: 'abstract',
      embedding: zeroVector,
    });
  }

  console.log(`Inserted ${demoPapers.length} demo papers`);

  // Create a completed job
  const [job] = await db.insert(jobs).values({
    topicId: topic.id,
    type: 'analyze',
    status: 'completed',
    completedAt: new Date(),
  }).returning();

  // Create demo artifacts (structured JSON matching agent output schemas)

  // Paper Analyzer artifact
  const paperAnalyzerData = {
    papers: demoPapers.map((p, i) => ({
      paperId: p.id,
      problem: `Addresses challenges in ${p.categories[0] === 'cs.AI' ? 'autonomous AI agents' : 'language model reasoning'}`,
      approach: 'Novel framework combining reasoning with action',
      keyInnovation: `First to demonstrate ${i === 0 ? 'interleaved reasoning-acting' : 'tool-augmented generation'}`,
      mainResult: `${10 + i * 5}% improvement over baseline on standard benchmarks`,
      limitations: ['Limited evaluation on complex tasks', 'High compute requirements'],
      methodology: { type: 'empirical' as const, datasets: ['HotpotQA', 'FEVER'], models: ['GPT-4', 'Claude'], computeScale: '8xA100' },
      claims: [
        { statement: `${p.title.split(':')[0]} outperforms baselines`, evidence: 'Table 2 shows significant gains', strength: 'strong' as const, chunkIds: [] },
      ],
      takeaway: `${p.title.split(':')[0]} is a key contribution to agent capabilities.`,
    })),
  };

  await db.insert(artifacts).values({ topicId: topic.id, jobId: job.id, agentType: 'paper-analyzer', tabTarget: 'overview', data: paperAnalyzerData });
  await db.insert(artifacts).values({ topicId: topic.id, jobId: job.id, agentType: 'paper-analyzer', tabTarget: 'papers', data: paperAnalyzerData });

  // Trend Mapper artifact
  const trendMapperData = {
    topicEvolution: [
      { topic: 'LLM Agents', timeline: [{ month: '2023-01', count: 3 }, { month: '2023-06', count: 8 }, { month: '2024-01', count: 15 }, { month: '2024-06', count: 25 }, { month: '2025-01', count: 40 }, { month: '2025-06', count: 55 }], momentum: 'accelerating' as const, signal: '3 major labs published on this in Q1 2025' },
      { topic: 'Tool Use', timeline: [{ month: '2023-01', count: 5 }, { month: '2023-06', count: 12 }, { month: '2024-01', count: 18 }, { month: '2024-06', count: 20 }, { month: '2025-01', count: 22 }, { month: '2025-06', count: 24 }], momentum: 'steady' as const, signal: 'Mature area with incremental improvements' },
    ],
    methodShifts: [
      { method: 'ReAct', adoptionCurve: [{ month: '2023-01', paperCount: 2 }, { month: '2024-01', paperCount: 15 }], status: 'mainstream' as const, replacedBy: null, evidence: 'Used in 80% of agent papers' },
      { method: 'Chain-of-Thought', adoptionCurve: [{ month: '2022-06', paperCount: 5 }, { month: '2023-06', paperCount: 30 }], status: 'mainstream' as const, replacedBy: null, evidence: 'Foundation for most reasoning approaches' },
    ],
    emergingTopics: [
      { topic: 'Self-improving agents', paperCount: 3, notableAuthors: ['Anthropic', 'Google DeepMind'], whyItMatters: 'Could reduce human oversight needs' },
    ],
  };

  await db.insert(artifacts).values({ topicId: topic.id, jobId: job.id, agentType: 'trend-mapper', tabTarget: 'overview', data: trendMapperData });

  // Contradiction Finder artifact
  const contradictionData = {
    contradictions: [
      {
        claim1: { statement: 'Multi-agent systems outperform single agents', paper: { id: 'demo-003', title: 'AutoGPT' }, evidence: 'Table 4 comparison', chunkIds: [] },
        claim2: { statement: 'Single agents match multi-agent performance with proper tool access', paper: { id: 'demo-005', title: 'Rethinking Multi-Agent Workflows' }, evidence: 'Section 4.2 ablation', chunkIds: [] },
        nature: 'temporal_shift' as const,
        analysis: 'Earlier work favored multi-agent setups, but recent findings suggest single agents with better tools can match them.',
        resolution: null,
        importance: 'high' as const,
      },
    ],
    consensus: [
      { finding: 'Chain-of-thought reasoning significantly improves complex task performance', supportingPapers: [{ id: 'demo-004', title: 'Chain-of-Thought Prompting', relevantClaim: 'CoT improves reasoning by 25%' }, { id: 'demo-001', title: 'ReAct', relevantClaim: 'Reasoning traces are essential' }], strength: 2, caveats: ['Primarily tested on English-only benchmarks'] },
    ],
    openDebates: [
      { question: 'Should agents be given autonomous tool access or human-in-the-loop approval?', sides: [{ position: 'Full autonomy enables faster iteration', papers: [{ id: 'demo-003', title: 'AutoGPT' }], strongestEvidence: 'AutoGPT achieved complex tasks without human input' }, { position: 'Human oversight is essential for safety', papers: [{ id: 'demo-001', title: 'ReAct' }], strongestEvidence: 'Reasoning traces allow human verification' }], significance: 'Critical for deployment safety' },
    ],
  };

  await db.insert(artifacts).values({ topicId: topic.id, jobId: job.id, agentType: 'contradiction-finder', tabTarget: 'insights', data: contradictionData });
  await db.insert(artifacts).values({ topicId: topic.id, jobId: job.id, agentType: 'contradiction-finder', tabTarget: 'connections', data: contradictionData });

  // Benchmark Extractor artifact
  const benchmarkData = {
    benchmarkTables: [
      {
        benchmarkName: 'HotpotQA',
        description: 'Multi-hop question answering',
        metrics: ['EM', 'F1'],
        entries: [
          { model: 'ReAct + GPT-4', paper: { id: 'demo-001', title: 'ReAct' }, scores: { EM: 67.5, F1: 78.3 }, conditions: 'zero-shot', chunkIds: [] },
          { model: 'CoT + GPT-4', paper: { id: 'demo-004', title: 'Chain-of-Thought' }, scores: { EM: 62.1, F1: 74.8 }, conditions: 'zero-shot', chunkIds: [] },
        ],
        notes: ['ReAct includes action-observation loops'],
      },
    ],
    newBenchmarks: [],
    warnings: [],
    stateOfTheArt: [
      { task: 'Multi-hop QA', benchmark: 'HotpotQA', currentBest: { model: 'ReAct + GPT-4', score: 67.5, paper: { id: 'demo-001', title: 'ReAct' } }, previousBest: { model: 'CoT + GPT-4', score: 62.1, paper: { id: 'demo-004', title: 'Chain-of-Thought' } }, improvement: '+5.4 EM points' },
    ],
  };

  await db.insert(artifacts).values({ topicId: topic.id, jobId: job.id, agentType: 'benchmark-extractor', tabTarget: 'overview', data: benchmarkData });
  await db.insert(artifacts).values({ topicId: topic.id, jobId: job.id, agentType: 'benchmark-extractor', tabTarget: 'insights', data: benchmarkData });

  // Frontier Detector artifact
  const frontierData = {
    frontiers: [
      {
        finding: 'Single agents are matching multi-agent systems',
        explanation: 'Recent work shows that a single well-equipped agent with proper tool access can match or exceed the performance of multi-agent systems, challenging the assumption that collaboration is always beneficial.',
        category: 'paradigm_shift' as const,
        sourcePapers: [{ id: 'demo-005', title: 'Rethinking Multi-Agent Workflows', contribution: 'Direct comparison showing single-agent parity', chunkIds: [] }],
        relatedContradictions: [],
        relatedBenchmarks: [],
        trendContext: 'Emerging counter-trend to the multi-agent hype',
        implications: ['May simplify agent architectures', 'Reduces coordination overhead'],
        openQuestions: ['Does this hold for more complex multi-step tasks?'],
        confidence: 0.75,
      },
      {
        finding: 'Reasoning and acting must be interleaved, not sequential',
        explanation: 'The ReAct paradigm demonstrates that interleaving reasoning traces with actions produces better outcomes than either pure reasoning or pure acting approaches.',
        category: 'method_breakthrough' as const,
        sourcePapers: [{ id: 'demo-001', title: 'ReAct', contribution: 'Introduced interleaved reasoning-acting', chunkIds: [] }],
        relatedContradictions: [],
        relatedBenchmarks: [],
        trendContext: 'Now the dominant paradigm for agent design',
        implications: ['Agents should think-act-observe in loops', 'Pure CoT is insufficient for grounded tasks'],
        openQuestions: ['Can this be made more efficient?'],
        confidence: 0.92,
      },
    ],
    pivotingTrends: [
      { from: 'Multi-agent orchestration', to: 'Single capable agents', timespan: 'Jan 2025 - Mar 2026', evidence: [{ paperId: 'demo-005', quote: 'Single agents match multi-agent systems when given proper tools', chunkId: '' }], significance: 'Simplifies architecture decisions' },
    ],
    gaps: [
      { area: 'Long-horizon agent safety', whyItMatters: 'No papers evaluate agent behavior over extended autonomous operation periods', adjacentWork: [{ paperId: 'demo-001', title: 'ReAct' }] },
    ],
  };

  await db.insert(artifacts).values({ topicId: topic.id, jobId: job.id, agentType: 'frontier-detector', tabTarget: 'frontiers', data: frontierData });

  console.log('Created demo artifacts for all 5 tabs');
  console.log('\nSeed complete! Start the dev server with `pnpm dev` to see the dashboard.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
