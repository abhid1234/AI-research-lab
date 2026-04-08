import pg from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL required'); process.exit(1); }

const client = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function main() {
  await client.connect();
  console.log('Connected to Cloud SQL');

  // Create pgvector extension
  await client.query('CREATE EXTENSION IF NOT EXISTS vector');

  // Insert demo topic
  const topicResult = await client.query(
    `INSERT INTO topics (id, name, query, schedule, paper_count, created_at)
     VALUES (gen_random_uuid(), 'LLM Agents', 'LLM agent framework', 'manual', 5, NOW())
     ON CONFLICT DO NOTHING
     RETURNING id, name`
  );
  const topicId = topicResult.rows[0]?.id;
  if (!topicId) {
    const existing = await client.query(`SELECT id FROM topics WHERE name = 'LLM Agents'`);
    console.log('Topic already exists:', existing.rows[0]?.id);
    await client.end();
    process.exit(0);
  }
  console.log(`Created topic: LLM Agents (${topicId})`);

  // Insert demo papers
  const demoPapers = [
    { id: 'demo-001', title: 'ReAct: Synergizing Reasoning and Acting in Language Models', abstract: 'Large language models can both generate reasoning traces and task-specific actions in an interleaved manner, allowing for greater synergy between the two.', authors: [{ name: 'Shunyu Yao' }, { name: 'Jeffrey Zhao' }], categories: ['cs.AI', 'cs.CL'], published: '2023-03-01', citations: 1250 },
    { id: 'demo-002', title: 'Toolformer: Language Models Can Teach Themselves to Use Tools', abstract: 'Language models exhibit remarkable abilities to solve new tasks from just a few examples or textual instructions, especially at scale.', authors: [{ name: 'Timo Schick' }], categories: ['cs.CL'], published: '2023-02-01', citations: 890 },
    { id: 'demo-003', title: 'AutoGPT: An Autonomous GPT-4 Experiment', abstract: 'An experimental open-source attempt to make GPT-4 fully autonomous, capable of internet research, task planning, and code execution.', authors: [{ name: 'Toran Richards' }], categories: ['cs.AI'], published: '2023-04-01', citations: 520 },
    { id: 'demo-004', title: 'Chain-of-Thought Prompting Elicits Reasoning in Large Language Models', abstract: 'We explore how generating a chain of thought improves the ability of large language models to perform complex reasoning tasks.', authors: [{ name: 'Jason Wei' }, { name: 'Xuezhi Wang' }], categories: ['cs.CL'], published: '2022-01-01', citations: 3200 },
    { id: 'demo-005', title: 'Rethinking Multi-Agent Workflows', abstract: 'Single capable agents can match or outperform multi-agent systems on most tasks when given proper tool access and reasoning capabilities.', authors: [{ name: 'Lisa Chen' }, { name: 'Mark Johnson' }], categories: ['cs.AI', 'cs.MA'], published: '2026-01-15', citations: 42 },
  ];

  const zeroVec = `[${new Array(1536).fill(0).join(',')}]`;

  for (const p of demoPapers) {
    await client.query(
      `INSERT INTO papers (id, title, abstract, authors, categories, published_at, citation_count, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT DO NOTHING`,
      [p.id, p.title, p.abstract, JSON.stringify(p.authors), p.categories, p.published, p.citations]
    );
    await client.query(
      `INSERT INTO topic_papers (topic_id, paper_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [topicId, p.id]
    );
    await client.query(
      `INSERT INTO paper_chunks (id, paper_id, chunk_index, content, source, embedding)
       VALUES (gen_random_uuid(), $1, 0, $2, 'abstract', $3)`,
      [p.id, p.abstract, zeroVec]
    );
  }
  console.log(`Inserted ${demoPapers.length} papers`);

  // Create completed job
  const jobResult = await client.query(
    `INSERT INTO jobs (id, topic_id, type, status, completed_at, created_at)
     VALUES (gen_random_uuid(), $1, 'analyze', 'completed', NOW(), NOW())
     RETURNING id`,
    [topicId]
  );
  const jobId = jobResult.rows[0].id;

  // Paper Analyzer artifact
  const paData = { papers: demoPapers.map((p, i) => ({ paperId: p.id, problem: `Addresses challenges in ${p.categories[0] === 'cs.AI' ? 'autonomous AI agents' : 'language model reasoning'}`, approach: 'Novel framework combining reasoning with action', keyInnovation: `First to demonstrate interleaved reasoning-acting in context of ${p.title.split(':')[0]}`, mainResult: `${10+i*5}% improvement over baseline`, limitations: ['Limited evaluation scope', 'High compute'], methodology: { type: 'empirical', datasets: ['HotpotQA', 'FEVER'], models: ['GPT-4'], computeScale: '8xA100' }, claims: [{ statement: `${p.title.split(':')[0]} outperforms baselines`, evidence: 'Table 2', strength: 'strong', chunkIds: [] }], takeaway: `${p.title.split(':')[0]} is a key contribution to agent capabilities.` })) };

  // Trend Mapper artifact
  const tmData = { topicEvolution: [{ topic: 'LLM Agents', timeline: [{ month: '2023-01', count: 3 }, { month: '2023-06', count: 8 }, { month: '2024-01', count: 15 }, { month: '2024-06', count: 25 }, { month: '2025-01', count: 40 }], momentum: 'accelerating', signal: '3 major labs published in Q1 2025' }, { topic: 'Tool Use', timeline: [{ month: '2023-01', count: 5 }, { month: '2023-06', count: 12 }, { month: '2024-01', count: 18 }, { month: '2024-06', count: 20 }, { month: '2025-01', count: 22 }], momentum: 'steady', signal: 'Mature area' }], methodShifts: [{ method: 'ReAct', adoptionCurve: [{ month: '2023-01', paperCount: 2 }, { month: '2024-01', paperCount: 15 }], status: 'mainstream', replacedBy: null, evidence: 'Used in 80% of agent papers' }], emergingTopics: [{ topic: 'Self-improving agents', paperCount: 3, notableAuthors: ['Anthropic', 'DeepMind'], whyItMatters: 'Could reduce human oversight' }] };

  // Contradiction Finder artifact
  const cfData = { contradictions: [{ claim1: { statement: 'Multi-agent systems outperform single agents', paper: { id: 'demo-003', title: 'AutoGPT' }, evidence: 'Table 4', chunkIds: [] }, claim2: { statement: 'Single agents match multi-agent performance', paper: { id: 'demo-005', title: 'Rethinking Multi-Agent Workflows' }, evidence: 'Section 4.2', chunkIds: [] }, nature: 'temporal_shift', analysis: 'Earlier work favored multi-agent, newer work shows single agents catching up.', resolution: null, importance: 'high' }], consensus: [{ finding: 'Chain-of-thought reasoning significantly improves complex task performance', supportingPapers: [{ id: 'demo-004', title: 'CoT Prompting', relevantClaim: 'CoT improves reasoning by 25%' }], strength: 2, caveats: ['English-only evaluation'] }], openDebates: [{ question: 'Should agents have autonomous tool access?', sides: [{ position: 'Full autonomy', papers: [{ id: 'demo-003', title: 'AutoGPT' }], strongestEvidence: 'Achieved complex tasks without human input' }, { position: 'Human oversight essential', papers: [{ id: 'demo-001', title: 'ReAct' }], strongestEvidence: 'Reasoning traces allow verification' }], significance: 'Critical for safety' }] };

  // Benchmark Extractor artifact
  const beData = { benchmarkTables: [{ benchmarkName: 'HotpotQA', description: 'Multi-hop QA', metrics: ['EM', 'F1'], entries: [{ model: 'ReAct + GPT-4', paper: { id: 'demo-001', title: 'ReAct' }, scores: { EM: 67.5, F1: 78.3 }, conditions: 'zero-shot', chunkIds: [] }, { model: 'CoT + GPT-4', paper: { id: 'demo-004', title: 'CoT' }, scores: { EM: 62.1, F1: 74.8 }, conditions: 'zero-shot', chunkIds: [] }], notes: [] }], newBenchmarks: [], warnings: [], stateOfTheArt: [{ task: 'Multi-hop QA', benchmark: 'HotpotQA', currentBest: { model: 'ReAct + GPT-4', score: 67.5, paper: { id: 'demo-001', title: 'ReAct' } }, previousBest: { model: 'CoT + GPT-4', score: 62.1, paper: { id: 'demo-004', title: 'CoT' } }, improvement: '+5.4 EM' }] };

  // Frontier Detector artifact
  const fdData = { frontiers: [{ finding: 'Single agents are matching multi-agent systems', explanation: 'Recent work shows a single well-equipped agent can match multi-agent performance.', category: 'paradigm_shift', sourcePapers: [{ id: 'demo-005', title: 'Rethinking Multi-Agent Workflows', contribution: 'Direct comparison', chunkIds: [] }], relatedContradictions: [], relatedBenchmarks: [], trendContext: 'Counter-trend to multi-agent hype', implications: ['Simpler architectures', 'Less coordination overhead'], openQuestions: ['Does this hold for complex tasks?'], confidence: 0.75 }, { finding: 'Reasoning and acting must be interleaved', explanation: 'The ReAct paradigm shows interleaving reasoning with actions produces better outcomes.', category: 'method_breakthrough', sourcePapers: [{ id: 'demo-001', title: 'ReAct', contribution: 'Introduced interleaved reasoning-acting', chunkIds: [] }], relatedContradictions: [], relatedBenchmarks: [], trendContext: 'Dominant paradigm', implications: ['Think-act-observe loops', 'Pure CoT insufficient for grounded tasks'], openQuestions: ['Efficiency improvements?'], confidence: 0.92 }], pivotingTrends: [{ from: 'Multi-agent orchestration', to: 'Single capable agents', timespan: 'Jan 2025 - Mar 2026', evidence: [{ paperId: 'demo-005', quote: 'Single agents match multi-agent when given proper tools', chunkId: '' }], significance: 'Simplifies architecture' }], gaps: [{ area: 'Long-horizon agent safety', whyItMatters: 'No papers evaluate extended autonomous operation', adjacentWork: [{ paperId: 'demo-001', title: 'ReAct' }] }] };

  // Insert all artifacts
  const artifactInserts = [
    { agentType: 'paper-analyzer', tabTarget: 'overview', data: paData },
    { agentType: 'paper-analyzer', tabTarget: 'papers', data: paData },
    { agentType: 'trend-mapper', tabTarget: 'overview', data: tmData },
    { agentType: 'benchmark-extractor', tabTarget: 'overview', data: beData },
    { agentType: 'benchmark-extractor', tabTarget: 'insights', data: beData },
    { agentType: 'contradiction-finder', tabTarget: 'insights', data: cfData },
    { agentType: 'contradiction-finder', tabTarget: 'connections', data: cfData },
    { agentType: 'frontier-detector', tabTarget: 'frontiers', data: fdData },
  ];

  for (const a of artifactInserts) {
    await client.query(
      `INSERT INTO artifacts (id, topic_id, job_id, agent_type, tab_target, data, version, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 1, NOW())`,
      [topicId, jobId, a.agentType, a.tabTarget, JSON.stringify(a.data)]
    );
  }
  console.log('Inserted 8 demo artifacts');
  console.log('\nSeed complete!');

  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
