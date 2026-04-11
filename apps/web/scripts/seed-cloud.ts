import pg from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL required'); process.exit(1); }

const client = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function main() {
  await client.connect();
  console.log('Connected to Cloud SQL');

  // Create pgvector extension
  await client.query('CREATE EXTENSION IF NOT EXISTS vector');

  // Clean slate — delete all demo data
  console.log('Clearing existing data...');
  await client.query('DELETE FROM artifacts');
  await client.query('DELETE FROM paper_chunks');
  await client.query('DELETE FROM topic_papers');
  await client.query('DELETE FROM papers');
  await client.query('DELETE FROM jobs');
  await client.query('DELETE FROM topics');
  console.log('Cleared existing data.');

  // Insert demo topic
  const topicResult = await client.query(
    `INSERT INTO topics (id, name, query, schedule, paper_count, created_at)
     VALUES (gen_random_uuid(), 'LLM Agents', 'LLM agent framework', 'manual', 5, NOW())
     RETURNING id, name`
  );
  const topicId = topicResult.rows[0]?.id;
  console.log(`Created topic: LLM Agents (${topicId})`);

  // Insert demo papers
  const demoPapers = [
    {
      id: 'demo-001',
      title: 'ReAct: Synergizing Reasoning and Acting in Language Models',
      abstract: 'Large language models can both generate reasoning traces and task-specific actions in an interleaved manner, allowing for greater synergy between the two: reasoning traces help the model induce, track, and update action plans as well as handle exceptions, while actions allow it to interface with and gather additional information from external sources such as knowledge bases or environments. We apply our approach, named ReAct, to a diverse set of language and decision making tasks and demonstrate its effectiveness over state-of-the-art baselines.',
      authors: [{ name: 'Shunyu Yao' }, { name: 'Jeffrey Zhao' }, { name: 'Dian Yu' }, { name: 'Nan Du' }],
      categories: ['cs.AI', 'cs.CL'],
      published: '2023-03-01',
      citations: 1250,
    },
    {
      id: 'demo-002',
      title: 'Toolformer: Language Models Can Teach Themselves to Use Tools',
      abstract: 'Language models exhibit remarkable abilities to solve new tasks from just a few examples or textual instructions, especially at scale. We show that LMs can teach themselves to use external tools via simple APIs and that this self-supervised approach requires nothing more than a handful of demonstrations for each API.',
      authors: [{ name: 'Timo Schick' }, { name: 'Jane Dwivedi-Yu' }, { name: 'Roberto Dessi' }],
      categories: ['cs.CL'],
      published: '2023-02-01',
      citations: 890,
    },
    {
      id: 'demo-003',
      title: 'Constitutional AI: Harmlessness from AI Feedback',
      abstract: 'As AI systems become more capable, we would like to enlist their help to supervise other AIs. We experiment with methods for training a harmless AI assistant through self-improvement, without any human labels identifying harmful outputs. The only human oversight is provided through a list of rules or principles, and so we call this method Constitutional AI.',
      authors: [{ name: 'Yuntao Bai' }, { name: 'Saurav Kadavath' }, { name: 'Sandipan Kundu' }],
      categories: ['cs.AI', 'cs.LG'],
      published: '2022-12-15',
      citations: 2100,
    },
    {
      id: 'demo-004',
      title: 'Chain-of-Thought Prompting Elicits Reasoning in Large Language Models',
      abstract: 'We explore how generating a chain of thought — a series of intermediate reasoning steps — significantly improves the ability of large language models to perform complex reasoning. A striking empirical finding is that chain-of-thought prompting improves performance on a range of arithmetic, commonsense, and symbolic reasoning tasks.',
      authors: [{ name: 'Jason Wei' }, { name: 'Xuezhi Wang' }, { name: 'Dale Schuurmans' }],
      categories: ['cs.CL'],
      published: '2022-01-28',
      citations: 3200,
    },
    {
      id: 'demo-005',
      title: 'Rethinking Multi-Agent Workflows: Single Agents Can Match Ensembles',
      abstract: 'Multi-agent systems have been proposed as a way to improve LLM task performance via specialization and parallel execution. We challenge this assumption and demonstrate that a single well-equipped agent with appropriate tool access and reasoning capabilities can match or outperform multi-agent ensembles on most standard benchmarks while requiring significantly less coordination overhead.',
      authors: [{ name: 'Lisa Chen' }, { name: 'Mark Johnson' }, { name: 'Arjun Patel' }],
      categories: ['cs.AI', 'cs.MA'],
      published: '2026-01-15',
      citations: 42,
    },
    {
      id: 'demo-006',
      title: 'Scaling Laws for Neural Language Models',
      abstract: 'We study empirical scaling laws for language model performance on the cross-entropy loss. The loss scales as a power-law with model size, dataset size, and the amount of compute used for training. Some trends span many orders of magnitude. Other architectural details such as network width or depth have minimal effects within a wide range.',
      authors: [{ name: 'Jared Kaplan' }, { name: 'Sam McCandlish' }, { name: 'Tom Henighan' }],
      categories: ['cs.LG', 'cs.CL'],
      published: '2020-01-23',
      citations: 5400,
    },
    {
      id: 'demo-007',
      title: 'AgentBench: Evaluating LLMs as Agents',
      abstract: 'Large language models (LLMs) are becoming increasingly smart and autonomous, targeting real-world pragmatic tasks. We introduce AgentBench, a multidimensional evolving benchmark that evaluates LLM-as-Agent across 8 distinct environments including OS, web browsing, web shopping, database, and lateral thinking puzzles.',
      authors: [{ name: 'Xiao Liu' }, { name: 'Hao Yu' }, { name: 'Hanchen Zhang' }],
      categories: ['cs.AI', 'cs.CL'],
      published: '2023-08-07',
      citations: 680,
    },
  ];

  const zeroVec = `[${new Array(768).fill(0).join(',')}]`;

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

  // ─── Paper Analyzer ───────────────────────────────────────────────────────
  const paData = {
    papers: [
      {
        paperId: 'demo-001',
        title: 'ReAct: Synergizing Reasoning and Acting',
        authors: 'Shunyu Yao et al.',
        date: 'Mar 2023',
        category: 'Agents',
        topic: 'LLM Agents',
        problem: 'LLMs used purely for reasoning (CoT) cannot take grounded actions; agents used purely for acting lack the ability to reason about failures and replanning.',
        approach: 'Interleave chain-of-thought reasoning traces with API actions in a single prompt — the model alternates between "Thought", "Action", and "Observation" steps.',
        keyInnovation: 'First to unify reasoning and acting in a single LLM pass, enabling the model to dynamically adjust plans based on environmental feedback.',
        mainResult: '+21% EM on HotpotQA over chain-of-thought baseline; +10% on FEVER over best supervised model.',
        limitations: ['Relies on manually written few-shot demonstrations', 'Reasoning traces add latency and cost', 'Task-specific action spaces still required'],
        methodology: {
          type: 'empirical',
          datasets: ['HotpotQA', 'FEVER', 'AlfWorld', 'WebShop'],
          models: ['PaLM-540B', 'GPT-3'],
          computeScale: '8×A100 for evaluation',
        },
        claims: [
          { statement: 'ReAct outperforms CoT-only on multi-hop QA by 21% EM', evidence: 'Table 1, HotpotQA results', strength: 'strong', chunkIds: [] },
          { statement: 'Reasoning traces reduce hallucination by grounding to observations', evidence: 'Section 4.1 qualitative analysis', strength: 'moderate', chunkIds: [] },
        ],
        takeaway: 'ReAct is now the de-facto baseline for LLM agent architectures — interleaved reasoning and acting consistently outperforms pure CoT or pure action execution.',
      },
      {
        paperId: 'demo-002',
        title: 'Toolformer: Language Models Can Teach Themselves to Use Tools',
        authors: 'Timo Schick et al.',
        date: 'Feb 2023',
        category: 'Agents',
        topic: 'LLM Agents',
        problem: 'LLMs lack access to real-time information and precise computation; manual tool-use annotation is expensive and brittle.',
        approach: 'Self-supervised bootstrap: generate candidate API calls, check if they reduce perplexity on continuation, filter and fine-tune on kept examples.',
        keyInnovation: 'Eliminates human annotation for tool-use training — the model learns when and how to call tools from its own outputs.',
        mainResult: 'GPT-J 6B with Toolformer matches or exceeds GPT-3 175B on downstream tasks requiring calculator, search, and calendar APIs.',
        limitations: ['Fixed API set defined at training time', 'Quality depends on LM perplexity heuristic', 'Chaining multiple tools remains unreliable'],
        methodology: {
          type: 'empirical',
          datasets: ['CCNet', 'SQuAD', 'SVAMP', 'LAMA'],
          models: ['GPT-J 6B', 'GPT-3 (baseline)'],
          computeScale: '64×A100 for fine-tuning',
        },
        claims: [
          { statement: 'Self-supervised tool-use matches supervised methods with zero human annotation', evidence: 'Table 3 comparison with TALM', strength: 'strong', chunkIds: [] },
          { statement: 'Tool use provides significant gains on knowledge-intensive tasks', evidence: 'Section 5, LAMA probe results', strength: 'strong', chunkIds: [] },
        ],
        takeaway: 'Toolformer demonstrates that tool-use can be learned without human labels, unlocking scalable augmentation of any LLM with external APIs.',
      },
      {
        paperId: 'demo-003',
        title: 'Constitutional AI: Harmlessness from AI Feedback',
        authors: 'Yuntao Bai et al.',
        date: 'Dec 2022',
        category: 'Safety',
        topic: 'LLM Safety',
        problem: 'Training harmless AI systems traditionally requires expensive human preference labels for harmful outputs; current RLHF pipelines scale poorly and rely on human red-teamers.',
        approach: 'Two-stage: (1) supervised learning from AI-critiqued and revised responses using a written "constitution" of principles; (2) RL from AI feedback (RLAIF) using a separate critique model.',
        keyInnovation: 'Replaces human harmfulness labels with AI-generated critique-revision loops guided by a human-authored set of principles — reducing harmful outputs without sacrificing helpfulness.',
        mainResult: 'Constitutional AI achieves lower harmlessness scores than standard RLHF while maintaining higher helpfulness ratings; evasiveness reduced by 40%.',
        limitations: ['Constitutional principles still require human authorship', 'Critique model can perpetuate biases', 'Evaluation relies on AI preference models'],
        methodology: {
          type: 'empirical',
          datasets: ['Anthropic HH dataset', 'Red-team prompts'],
          models: ['Claude (52B)', 'Critique model (52B)'],
          computeScale: 'Multi-node TPU cluster',
        },
        claims: [
          { statement: 'AI feedback can substitute human labels for harmlessness training', evidence: 'Figure 3, RLAIF vs RLHF Pareto frontier', strength: 'strong', chunkIds: [] },
          { statement: 'Constitutional principles reduce evasiveness by 40% vs base RLHF', evidence: 'Table 2, evasiveness metric', strength: 'strong', chunkIds: [] },
        ],
        takeaway: 'Constitutional AI is now the foundation for scalable safety alignment — it demonstrates that AI-assisted oversight can reduce dependence on costly human labelers.',
      },
      {
        paperId: 'demo-004',
        title: 'Chain-of-Thought Prompting Elicits Reasoning in LLMs',
        authors: 'Jason Wei et al.',
        date: 'Jan 2022',
        category: 'Reasoning',
        topic: 'LLM Reasoning',
        problem: 'Standard few-shot prompting fails on tasks requiring multi-step reasoning — models output final answers without intermediate steps, limiting accuracy on arithmetic and commonsense tasks.',
        approach: 'Augment few-shot exemplars with intermediate reasoning steps ("chain of thought") as part of the prompt; the model learns to generate its own chains before answering.',
        keyInnovation: 'Simple prompting change — adding reasoning steps to demonstrations — unlocks emergent multi-step reasoning without any fine-tuning.',
        mainResult: 'CoT prompting with PaLM 540B achieves state-of-the-art on GSM8K (57.9% → 74%), surpassing fine-tuned GPT-3.',
        limitations: ['Only emerges at large scales (>100B parameters)', 'Reasoning chains can be plausible-sounding but factually wrong', 'Annotation of reasoning exemplars required'],
        methodology: {
          type: 'empirical',
          datasets: ['GSM8K', 'MATH', 'CommonsenseQA', 'StrategyQA'],
          models: ['PaLM 540B', 'GPT-3 175B', 'LaMDA 137B'],
          computeScale: 'Google TPU Pod for PaLM inference',
        },
        claims: [
          { statement: 'Chain-of-thought prompting achieves SOTA on GSM8K without fine-tuning', evidence: 'Table 3, GSM8K benchmark comparison', strength: 'strong', chunkIds: [] },
          { statement: 'CoT reasoning ability emerges only beyond 100B parameters', evidence: 'Figure 4, scale vs accuracy curves', strength: 'strong', chunkIds: [] },
        ],
        takeaway: 'Chain-of-thought prompting is foundational — it demonstrated that reasoning can be elicited purely through prompting, catalysing an entire subfield of reasoning research.',
      },
      {
        paperId: 'demo-005',
        title: 'Rethinking Multi-Agent Workflows',
        authors: 'Lisa Chen et al.',
        date: 'Jan 2026',
        category: 'Agents',
        topic: 'LLM Agents',
        problem: 'Multi-agent pipelines are assumed to outperform single agents due to specialization, but rigorous comparisons are scarce and coordination overhead is ignored.',
        approach: 'Controlled evaluation of single-agent vs multi-agent configurations across 12 task categories, holding total compute constant and measuring both performance and cost.',
        keyInnovation: 'First controlled comparison that accounts for coordination overhead — reveals that single agents with proper tool access close most of the performance gap.',
        mainResult: 'Single-agent configurations match multi-agent performance on 9 of 12 task categories; multi-agent only wins on tasks requiring true parallelism.',
        limitations: ['Evaluation tasks may not represent production workloads', 'Only tested 3 orchestration frameworks', 'Long-horizon tasks not covered'],
        methodology: {
          type: 'empirical',
          datasets: ['AgentBench', 'WebArena', 'SWE-Bench'],
          models: ['GPT-4o', 'Claude 3.5 Sonnet'],
          computeScale: '4×H100 for eval harness',
        },
        claims: [
          { statement: 'Single agents match multi-agent performance on 75% of evaluated tasks', evidence: 'Table 1, task-by-task breakdown', strength: 'strong', chunkIds: [] },
          { statement: 'Multi-agent coordination overhead reduces effective throughput by 30%', evidence: 'Section 5.2, latency analysis', strength: 'moderate', chunkIds: [] },
        ],
        takeaway: 'The multi-agent hype is partially overblown — single capable agents are sufficient for most tasks, and simpler architectures should be the default starting point.',
      },
      {
        paperId: 'demo-006',
        title: 'Scaling Laws for Neural Language Models',
        authors: 'Jared Kaplan et al.',
        date: 'Jan 2020',
        category: 'Scaling',
        topic: 'LLM Scaling',
        problem: 'Practitioners lack principled guidance on how to allocate compute budgets across model size, data, and training steps for optimal performance.',
        approach: 'Systematic empirical study across 6 orders of magnitude in compute, varying model size (768 to 1.5B), dataset size, and training duration.',
        keyInnovation: 'Discovered that loss follows smooth power laws with model parameters, data, and compute — enabling principled optimal allocation via Chinchilla-style compute-optimal training.',
        mainResult: 'Loss ∝ N^{-0.076} for model size, D^{-0.095} for data size; compute-optimal models require roughly equal parameter and token scaling.',
        limitations: ['Measured on autoregressive LM loss — downstream task scaling may differ', 'Does not account for instruction tuning or RLHF', 'Extrapolation uncertainty beyond studied ranges'],
        methodology: {
          type: 'empirical',
          datasets: ['WebText2'],
          models: ['Transformers from 768 to 1.5B parameters'],
          computeScale: '768-GPU V100 cluster',
        },
        claims: [
          { statement: 'LM loss follows smooth power laws with compute, parameters, and data', evidence: 'Figures 1–4, scaling law fits', strength: 'strong', chunkIds: [] },
          { statement: 'Optimal compute allocation requires proportional scaling of both model size and data', evidence: 'Section 5, compute-optimal frontier', strength: 'strong', chunkIds: [] },
        ],
        takeaway: 'Scaling laws are the bedrock of modern LLM development — they transformed model training from empirical trial-and-error into a principled engineering discipline.',
      },
      {
        paperId: 'demo-007',
        title: 'AgentBench: Evaluating LLMs as Agents',
        authors: 'Xiao Liu et al.',
        date: 'Aug 2023',
        category: 'Benchmarks',
        topic: 'LLM Evaluation',
        problem: 'Existing benchmarks evaluate LLMs as static NLU models; no comprehensive benchmark assesses LLMs acting as interactive agents in real-world environments.',
        approach: 'Construct 8 diverse environments spanning OS, web, database, coding, and games; score models on task completion rate across environments with standardised eval harness.',
        keyInnovation: 'First multidimensional agent benchmark with real interactive environments — not simulated — including OS shell, web browser, and live database interactions.',
        mainResult: 'GPT-4 achieves 41.1% overall task completion; open-source models lag by 15-25 points; all models degrade significantly on long-horizon tasks.',
        limitations: ['Environments are English-only', 'Some tasks have non-deterministic evaluation', 'Static snapshot — does not track model improvements over time'],
        methodology: {
          type: 'benchmark',
          datasets: ['AgentBench-OS', 'AgentBench-Web', 'AgentBench-DB'],
          models: ['GPT-4', 'Claude-2', 'Llama-2-70B', 'Vicuna-33B'],
          computeScale: 'Cloud API calls, no local GPU required',
        },
        claims: [
          { statement: 'GPT-4 is the top-performing agent model at 41.1% task completion', evidence: 'Table 2, overall benchmark results', strength: 'strong', chunkIds: [] },
          { statement: 'Open-source models lag commercial models by 15-25% on agent tasks', evidence: 'Figure 5, radar chart across environments', strength: 'strong', chunkIds: [] },
        ],
        takeaway: 'AgentBench exposed a large and underappreciated gap between commercial and open-source LLMs on real-world agentic tasks — spurring a wave of open-source agent tuning efforts.',
      },
    ],
  };

  // ─── Trend Mapper ─────────────────────────────────────────────────────────
  const tmData = {
    topicEvolution: [
      {
        topic: 'LLM Agents',
        timeline: [
          { month: '2023-01', count: 4 },
          { month: '2023-03', count: 9 },
          { month: '2023-06', count: 15 },
          { month: '2023-09', count: 23 },
          { month: '2024-01', count: 38 },
          { month: '2024-06', count: 55 },
        ],
        momentum: 'accelerating',
        signal: '3 major labs published foundational agent papers in Q1 2023; adoption in production apps surged through 2024',
      },
      {
        topic: 'AI Safety & Alignment',
        timeline: [
          { month: '2023-01', count: 6 },
          { month: '2023-03', count: 8 },
          { month: '2023-06', count: 14 },
          { month: '2023-09', count: 19 },
          { month: '2024-01', count: 28 },
          { month: '2024-06', count: 35 },
        ],
        momentum: 'accelerating',
        signal: 'Constitutional AI and scalable oversight papers driving sustained growth; regulatory pressure amplifying interest',
      },
      {
        topic: 'Chain-of-Thought Reasoning',
        timeline: [
          { month: '2023-01', count: 12 },
          { month: '2023-03', count: 16 },
          { month: '2023-06', count: 19 },
          { month: '2023-09', count: 21 },
          { month: '2024-01', count: 22 },
          { month: '2024-06', count: 23 },
        ],
        momentum: 'steady',
        signal: 'Mature paradigm — foundational work done; incremental improvements; attention shifting to reasoning + acting hybrids',
      },
      {
        topic: 'Scaling Laws & Compute-Optimal Training',
        timeline: [
          { month: '2023-01', count: 8 },
          { month: '2023-03', count: 10 },
          { month: '2023-06', count: 12 },
          { month: '2023-09', count: 11 },
          { month: '2024-01', count: 9 },
          { month: '2024-06', count: 8 },
        ],
        momentum: 'declining',
        signal: 'Post-Chinchilla, the community has largely accepted compute-optimal training; new interest now in post-training scaling (RLHF, inference compute)',
      },
    ],
    methodShifts: [
      {
        method: 'ReAct (Reasoning + Acting)',
        adoptionCurve: [
          { month: '2023-03', paperCount: 1 },
          { month: '2023-06', paperCount: 8 },
          { month: '2023-09', paperCount: 22 },
          { month: '2024-01', paperCount: 45 },
        ],
        status: 'mainstream',
        replacedBy: null,
        evidence: 'Used as baseline or building block in 80%+ of agent papers published after March 2023',
      },
      {
        method: 'Chain-of-Thought Prompting',
        adoptionCurve: [
          { month: '2022-01', paperCount: 1 },
          { month: '2022-06', paperCount: 14 },
          { month: '2023-01', paperCount: 60 },
          { month: '2023-06', paperCount: 90 },
        ],
        status: 'mainstream',
        replacedBy: 'ReAct for agentic tasks; native reasoning models for reasoning tasks',
        evidence: 'CoT underpins most SOTA reasoning systems; now often implicit in instruction-tuned models rather than requiring explicit prompting',
      },
      {
        method: 'Multi-Agent Orchestration',
        adoptionCurve: [
          { month: '2023-06', paperCount: 3 },
          { month: '2023-09', paperCount: 12 },
          { month: '2024-01', paperCount: 28 },
          { month: '2024-06', paperCount: 31 },
        ],
        status: 'plateauing',
        replacedBy: 'Single-agent architectures with richer tool access',
        evidence: "Peak hype mid-2024; 'Rethinking Multi-Agent Workflows' (2026) showing diminishing returns vs single-agent",
      },
    ],
    emergingTopics: [
      {
        topic: 'Self-improving / self-refining agents',
        paperCount: 7,
        notableAuthors: ['Anthropic', 'DeepMind', 'Stanford NLP'],
        whyItMatters: 'Agents that can critique and improve their own outputs without human feedback could dramatically reduce oversight costs and enable longer-horizon autonomy',
      },
      {
        topic: 'Agent memory and persistence',
        paperCount: 5,
        notableAuthors: ['MIT CSAIL', 'CMU LTI', 'Google Brain'],
        whyItMatters: 'Most agents reset after each task; persistent memory across sessions is essential for real-world deployment and learning from interaction history',
      },
    ],
  };

  // ─── Contradiction Finder ─────────────────────────────────────────────────
  const cfData = {
    contradictions: [
      {
        claim1: {
          statement: 'Multi-agent systems significantly outperform single agents through specialization and parallel execution',
          paper: { id: 'demo-003', title: 'Constitutional AI' },
          evidence: 'Table 4, multi-agent task completion vs single-agent baseline',
          chunkIds: [],
        },
        claim2: {
          statement: 'Single agents with proper tool access match multi-agent performance on 75% of evaluated tasks',
          paper: { id: 'demo-005', title: 'Rethinking Multi-Agent Workflows' },
          evidence: 'Table 1, task-by-task breakdown across 12 categories',
          chunkIds: [],
        },
        nature: 'temporal_shift',
        analysis: 'Early multi-agent work (2023) compared against weak single-agent baselines with limited tool access. By 2026, frontier single models improved dramatically, closing the gap. The contradiction is partially methodological: newer single-agent work uses better scaffolding than earlier comparisons assumed.',
        resolution: 'Multi-agent remains preferable only for tasks requiring true parallelism or distinct expert knowledge; for most tasks, a well-equipped single agent is simpler and equally effective.',
        importance: 'high',
      },
      {
        claim1: {
          statement: 'Chain-of-thought reasoning must be explicitly elicited via few-shot examples and cannot emerge from instruction tuning alone',
          paper: { id: 'demo-004', title: 'Chain-of-Thought Prompting Elicits Reasoning in LLMs' },
          evidence: 'Section 3.2, comparison of zero-shot vs few-shot CoT',
          chunkIds: [],
        },
        claim2: {
          statement: 'Modern instruction-tuned models exhibit chain-of-thought reasoning implicitly without requiring explicit reasoning exemplars in the prompt',
          paper: { id: 'demo-001', title: 'ReAct: Synergizing Reasoning and Acting' },
          evidence: 'Appendix B, zero-shot ReAct results on HotpotQA',
          chunkIds: [],
        },
        nature: 'methodology_gap',
        analysis: 'The original CoT paper was published when instruction tuning was in its infancy. Later models trained on CoT data effectively internalized reasoning patterns, making explicit few-shot examples less critical. The underlying capability is real; the mechanism of elicitation has changed.',
        resolution: 'Both claims are correct for their respective model generations — the contradiction is an artifact of rapid capability improvement between 2022 and 2023.',
        importance: 'medium',
      },
      {
        claim1: {
          statement: 'LLM performance scales smoothly and predictably with compute according to power laws',
          paper: { id: 'demo-006', title: 'Scaling Laws for Neural Language Models' },
          evidence: 'Figures 1–4, cross-entropy loss vs compute across 6 orders of magnitude',
          chunkIds: [],
        },
        claim2: {
          statement: 'Agent task completion does not follow smooth scaling laws — small models with good scaffolding can outperform larger models with naive prompting',
          paper: { id: 'demo-007', title: 'AgentBench: Evaluating LLMs as Agents' },
          evidence: 'Figure 5, per-environment results showing scaffold-dependent reversals',
          chunkIds: [],
        },
        nature: 'direct_contradiction',
        analysis: 'Scaling laws measure perplexity on next-token prediction — a continuous loss metric. Agent benchmarks measure discrete task success, which is highly sensitive to prompting strategy, tool availability, and environment design. These are measuring different things, but both are cited as evidence for "scaling predicts capability" which oversimplifies.',
        resolution: 'Scaling laws are reliable for pre-training loss but poorly predictive of downstream agentic task performance, which depends heavily on post-training alignment and scaffolding quality.',
        importance: 'high',
      },
    ],
    consensus: [
      {
        finding: 'Intermediate reasoning steps — whether called chain-of-thought, scratchpad, or thinking — consistently improve complex task performance across model families and task types',
        supportingPapers: [
          { id: 'demo-004', title: 'Chain-of-Thought Prompting Elicits Reasoning in LLMs', relevantClaim: 'CoT improves GSM8K from 17.9% to 57.9% on PaLM 540B' },
          { id: 'demo-001', title: 'ReAct: Synergizing Reasoning and Acting', relevantClaim: 'Reasoning traces reduce hallucination and improve task completion' },
        ],
        strength: 5,
        caveats: ['Effect is much smaller for models under 20B parameters', 'Gains vary significantly by task type — largest for multi-step math, smallest for factual recall'],
      },
      {
        finding: 'Tool use (API calls, search, calculators) provides reliable improvements on knowledge-intensive and computation-heavy tasks that cannot be solved by parametric knowledge alone',
        supportingPapers: [
          { id: 'demo-002', title: 'Toolformer: Language Models Can Teach Themselves to Use Tools', relevantClaim: 'Tool-augmented GPT-J 6B matches GPT-3 175B on downstream tasks' },
          { id: 'demo-001', title: 'ReAct: Synergizing Reasoning and Acting', relevantClaim: 'Web search integration reduces factual errors by 35%' },
        ],
        strength: 4,
        caveats: ['Tool reliability depends on API stability', 'Models can misuse tools in unexpected ways without guardrails'],
      },
    ],
    openDebates: [
      {
        question: 'Should production AI agents operate with full autonomy, or should human oversight be mandatory at each decision point?',
        sides: [
          {
            position: 'Full autonomy enables the most capable and efficient agents — human bottlenecks defeat the purpose',
            papers: [{ id: 'demo-005', title: 'Rethinking Multi-Agent Workflows' }, { id: 'demo-002', title: 'Toolformer' }],
            strongestEvidence: 'Chen et al. (2026) show single autonomous agents achieve 75% task parity; human-in-the-loop checkpoints reduced throughput by 60% in their ablations',
          },
          {
            position: 'Human oversight is a safety requirement, not a performance choice — autonomous tool use creates unacceptable risk',
            papers: [{ id: 'demo-003', title: 'Constitutional AI' }],
            strongestEvidence: 'Constitutional AI demonstrates that even well-aligned models produce harmful outputs at scale without oversight; autonomous tool access amplifies impact of errors',
          },
        ],
        significance: 'This debate will shape regulatory frameworks and enterprise adoption patterns for AI agents over the next 3–5 years',
      },
      {
        question: 'Do current scaling laws predict agent capabilities, or do post-training alignment and scaffolding dominate performance at deployment?',
        sides: [
          {
            position: 'Scaling is the dominant factor — larger models are reliably better agents regardless of scaffolding',
            papers: [{ id: 'demo-006', title: 'Scaling Laws for Neural Language Models' }],
            strongestEvidence: 'Kaplan et al. show smooth power-law scaling across 6 orders of magnitude; GPT-4 consistently tops AgentBench despite similar architectures to smaller models',
          },
          {
            position: 'Scaffolding quality and post-training alignment explain most variance in agent performance for frontier models',
            papers: [{ id: 'demo-007', title: 'AgentBench' }, { id: 'demo-001', title: 'ReAct' }],
            strongestEvidence: 'AgentBench shows 25-point gaps between same-size models with different prompting strategies; ReAct and CoT show comparable gains to 10× model scaling',
          },
        ],
        significance: 'Determines whether AI labs should prioritise training larger models or invest in better RLHF, prompting frameworks, and agentic scaffolding',
      },
    ],
  };

  // ─── Benchmark Extractor ──────────────────────────────────────────────────
  const beData = {
    benchmarkTables: [
      {
        benchmarkName: 'HotpotQA',
        description: 'Multi-hop question answering requiring reasoning across multiple Wikipedia documents',
        metrics: ['EM', 'F1'],
        entries: [
          { model: 'ReAct + GPT-4', paper: { id: 'demo-001', title: 'ReAct' }, scores: { EM: 67.5, F1: 78.3 }, conditions: 'zero-shot, Wikipedia search', chunkIds: [] },
          { model: 'CoT + PaLM 540B', paper: { id: 'demo-004', title: 'Chain-of-Thought' }, scores: { EM: 62.1, F1: 74.8 }, conditions: 'zero-shot', chunkIds: [] },
          { model: 'Toolformer + GPT-J', paper: { id: 'demo-002', title: 'Toolformer' }, scores: { EM: 54.3, F1: 66.1 }, conditions: 'search API enabled', chunkIds: [] },
          { model: 'Standard GPT-3 (175B)', paper: { id: 'demo-004', title: 'Chain-of-Thought' }, scores: { EM: 38.7, F1: 52.4 }, conditions: 'few-shot, no tools', chunkIds: [] },
          { model: 'Supervised BERT-large', paper: { id: 'demo-007', title: 'AgentBench' }, scores: { EM: 45.6, F1: 58.9 }, conditions: 'fine-tuned on HotpotQA train set', chunkIds: [] },
        ],
        notes: ['EM = Exact Match; F1 = token-level F1', 'All LLM results are zero-shot or few-shot unless noted', 'ReAct gains largely from grounded search reducing hallucination'],
      },
      {
        benchmarkName: 'AgentBench (Overall)',
        description: 'Multidimensional agent evaluation across 8 interactive environments including OS, web, database, and game tasks',
        metrics: ['Task Completion Rate (%)'],
        entries: [
          { model: 'GPT-4 (ReAct scaffold)', paper: { id: 'demo-007', title: 'AgentBench' }, scores: { 'Task Completion Rate (%)': 41.1 }, conditions: '8 environments, ReAct prompting', chunkIds: [] },
          { model: 'Claude-2 (ReAct scaffold)', paper: { id: 'demo-007', title: 'AgentBench' }, scores: { 'Task Completion Rate (%)': 35.6 }, conditions: '8 environments, ReAct prompting', chunkIds: [] },
          { model: 'GPT-3.5-turbo (CoT)', paper: { id: 'demo-007', title: 'AgentBench' }, scores: { 'Task Completion Rate (%)': 28.4 }, conditions: '8 environments, chain-of-thought', chunkIds: [] },
          { model: 'Llama-2-70B (ReAct)', paper: { id: 'demo-007', title: 'AgentBench' }, scores: { 'Task Completion Rate (%)': 18.2 }, conditions: '8 environments, ReAct prompting', chunkIds: [] },
          { model: 'Vicuna-33B (CoT)', paper: { id: 'demo-007', title: 'AgentBench' }, scores: { 'Task Completion Rate (%)': 12.7 }, conditions: '8 environments, chain-of-thought', chunkIds: [] },
        ],
        notes: ['Task completion rate averaged across all 8 environments', 'Open-source models lag commercial models by 15–25 points', 'Scaffold choice (ReAct vs CoT) accounts for ~5 point difference'],
      },
    ],
    newBenchmarks: [
      {
        name: 'SolidBench',
        measures: 'Long-horizon agent reliability — evaluates whether agents complete 50-step tasks without catastrophic failure, metric drift, or unsafe actions',
        whyNeeded: 'Existing benchmarks (HotpotQA, AgentBench) use short-horizon tasks (1–5 steps). Production deployments require sustained reliable operation over dozens of sequential decisions. No benchmark captures this failure mode.',
      },
      {
        name: 'MemoryArena',
        measures: 'Cross-session agent memory and personalisation — tests whether agents correctly recall user preferences, prior decisions, and evolving context across independent conversation sessions',
        whyNeeded: 'Current agents reset after each task. Real-world utility requires persistent, updatable memory. No benchmark evaluates cross-session retention or the accuracy-privacy tradeoffs of memory systems.',
      },
      {
        name: 'SkillsBench',
        measures: 'Tool generalisation — evaluates whether agents can correctly invoke novel APIs not seen during training, using only documentation as context, across 200 real-world service APIs',
        whyNeeded: 'Toolformer and ReAct evaluate a fixed set of 3–5 pre-defined tools. Production agents must generalise to arbitrary APIs. SkillsBench tests zero-shot API generalisation at scale.',
      },
    ],
    warnings: [
      {
        paperRef: { id: 'demo-007', title: 'AgentBench' },
        issueType: 'benchmark_saturation',
        explanation: 'GPT-4 achieves 41.1% on AgentBench overall, but scores 78% on the web shopping sub-task — approaching saturation. Any incremental improvement on the web shopping task is now within measurement noise. Researchers should report sub-task scores and weight harder environments more heavily to avoid misleading overall-metric improvements.',
      },
      {
        paperRef: { id: 'demo-004', title: 'Chain-of-Thought Prompting Elicits Reasoning in LLMs' },
        issueType: 'evaluation_contamination',
        explanation: 'GSM8K and other math reasoning benchmarks used in CoT evaluations have likely appeared in the pre-training corpora of frontier models trained after 2023. Performance improvements on these benchmarks may partially reflect memorisation rather than generalised reasoning. New held-out math benchmarks should be preferred for frontier model evaluation.',
      },
    ],
    stateOfTheArt: [
      {
        task: 'Multi-hop Question Answering',
        benchmark: 'HotpotQA',
        currentBest: { model: 'ReAct + GPT-4', score: 67.5, paper: { id: 'demo-001', title: 'ReAct' } },
        previousBest: { model: 'CoT + PaLM 540B', score: 62.1, paper: { id: 'demo-004', title: 'Chain-of-Thought' } },
        improvement: '+5.4 EM points (+8.7% relative)',
      },
      {
        task: 'General Agent Task Completion',
        benchmark: 'AgentBench (Overall)',
        currentBest: { model: 'GPT-4 + ReAct', score: 41.1, paper: { id: 'demo-007', title: 'AgentBench' } },
        previousBest: { model: 'Claude-2 + ReAct', score: 35.6, paper: { id: 'demo-007', title: 'AgentBench' } },
        improvement: '+5.5% task completion rate',
      },
    ],
  };

  // ─── Frontier Detector ────────────────────────────────────────────────────
  const fdData = {
    frontiers: [
      {
        finding: 'Single agents are matching multi-agent systems across most real-world task categories',
        explanation: 'The dominant assumption — that specialized multi-agent pipelines are necessary for complex tasks — is being overturned. A single frontier model with appropriate tool access and scaffolding now matches multi-agent performance on 75% of benchmarked tasks, while reducing coordination overhead and architectural complexity.',
        category: 'paradigm_shift',
        sourcePapers: [
          { id: 'demo-005', title: 'Rethinking Multi-Agent Workflows', contribution: 'First controlled comparison of single vs multi-agent; shows parity on 9/12 task categories', chunkIds: [] },
        ],
        relatedContradictions: ['Multi-agent vs single-agent performance debate'],
        relatedBenchmarks: ['AgentBench'],
        trendContext: 'Counter-trend to 2023–2024 multi-agent hype; enabled by rapid improvement in single frontier models',
        implications: [
          'Simpler architectures should be the default — add agents only when tasks require true parallelism',
          'Agent frameworks (LangGraph, AutoGen) may need to pivot toward single-agent orchestration primitives',
          'Cost savings: multi-agent systems can be 3× more expensive due to coordination token overhead',
        ],
        openQuestions: [
          'Does single-agent superiority hold for tasks requiring >100 sequential decisions?',
          'Are there entire task domains where multi-agent remains clearly superior?',
        ],
        confidence: 0.78,
      },
      {
        finding: 'Interleaved reasoning and acting (ReAct) has become the dominant paradigm for grounded agent tasks',
        explanation: 'The ReAct paradigm — alternating between Thought, Action, and Observation — has rapidly become the de-facto scaffold for LLM agents interacting with external environments. Within 12 months of publication, it was used as a baseline in 80%+ of agent papers, with nearly every major agent framework implementing it natively.',
        category: 'method_breakthrough',
        sourcePapers: [
          { id: 'demo-001', title: 'ReAct: Synergizing Reasoning and Acting', contribution: 'Introduced and validated the Thought-Action-Observation loop', chunkIds: [] },
        ],
        relatedContradictions: ['CoT-only vs ReAct for grounded tasks'],
        relatedBenchmarks: ['HotpotQA', 'FEVER', 'AlfWorld'],
        trendContext: 'Dominant paradigm since Q2 2023; now being extended with multi-step planning, reflection, and memory modules',
        implications: [
          'Pure chain-of-thought is insufficient for any task requiring environmental grounding',
          'Think-act-observe loops should be the default scaffold for any tool-using agent',
          'Future work is likely to extend ReAct with long-term memory and self-reflection modules',
        ],
        openQuestions: [
          'Can ReAct-style reasoning be distilled into smaller models without losing the reasoning quality?',
          'What is the optimal frequency of reasoning vs acting steps for different task types?',
        ],
        confidence: 0.94,
      },
      {
        finding: 'Benchmark contamination is becoming a systemic problem for LLM evaluation at frontier scale',
        explanation: 'As training datasets grow to encompass most of the web, popular benchmarks (GSM8K, HotpotQA, MMLU) are increasingly likely to appear in pre-training corpora. This means measured improvements may partially reflect memorization, not generalization. The field lacks robust protocols for detecting and correcting contamination.',
        category: 'surprising_result',
        sourcePapers: [
          { id: 'demo-007', title: 'AgentBench: Evaluating LLMs as Agents', contribution: 'Identified saturation patterns consistent with contamination on web-facing sub-tasks', chunkIds: [] },
          { id: 'demo-004', title: 'Chain-of-Thought Prompting', contribution: 'GSM8K scores from this paper now suspected to reflect partial contamination in later models', chunkIds: [] },
        ],
        relatedContradictions: [],
        relatedBenchmarks: ['GSM8K', 'HotpotQA', 'MMLU'],
        trendContext: 'Growing concern as of 2024-2026; no standardized decontamination protocol established yet',
        implications: [
          'New benchmarks should use dynamically generated problems or problems from after training cutoffs',
          'Benchmark leaderboards should require contamination disclosure',
          'Evaluation methodology is becoming a first-class research area',
        ],
        openQuestions: [
          'Can we reliably detect contamination from model behavior without training data access?',
          'How much do contaminated benchmarks inflate reported state-of-the-art?',
        ],
        confidence: 0.71,
      },
      {
        finding: 'Safety alignment methods are converging — Constitutional AI, RLAIF, and DPO are showing complementary strengths',
        explanation: 'Multiple independent lines of alignment research are producing convergent techniques: Constitutional AI uses AI-generated critiques, RLAIF uses AI preference models, and DPO directly optimizes against preference data without a reward model. These approaches are increasingly used in combination, suggesting the field is approaching a mature alignment stack.',
        category: 'convergence',
        sourcePapers: [
          { id: 'demo-003', title: 'Constitutional AI', contribution: 'Demonstrated AI-critiqued revision as scalable harmlessness training signal', chunkIds: [] },
        ],
        relatedContradictions: [],
        relatedBenchmarks: [],
        trendContext: 'Post-InstructGPT convergence phase; major labs using hybrid alignment stacks by 2024',
        implications: [
          'Alignment is becoming a solved engineering problem for narrow capabilities — the hard problems lie in scalable oversight for highly capable models',
          'Smaller labs can now replicate RLHF-quality alignment using open-source DPO pipelines',
          'Focus is shifting from "how to align" to "how to verify alignment"',
        ],
        openQuestions: [
          'Do these methods generalize to highly capable models that could deceive their overseers?',
          'What combination of methods is optimal for different capability levels?',
        ],
        confidence: 0.82,
      },
    ],
    pivotingTrends: [
      {
        from: 'Multi-agent orchestration as default architecture',
        to: 'Single capable agents with rich tool access',
        timespan: 'Mid 2024 — Jan 2026',
        evidence: [
          {
            paperId: 'demo-005',
            quote: 'Single agents match multi-agent performance on 9 of 12 task categories when given equivalent tool access and compute budget',
            chunkId: '',
          },
          {
            paperId: 'demo-007',
            quote: 'Coordination overhead in multi-agent systems accounts for 30% of total token cost with no corresponding performance benefit on serial tasks',
            chunkId: '',
          },
        ],
        significance: 'Simplifies production deployments, reduces cost, and removes a major source of failure modes (inter-agent communication errors)',
      },
      {
        from: 'Scale as the primary driver of capability improvement',
        to: 'Post-training alignment and scaffolding as the primary differentiator at frontier scale',
        timespan: '2023 — 2025',
        evidence: [
          {
            paperId: 'demo-006',
            quote: 'Performance scales smoothly as a power-law with parameters and compute — but only on pre-training loss',
            chunkId: '',
          },
          {
            paperId: 'demo-001',
            quote: 'Prompting strategy (ReAct vs standard) produces gains equivalent to a 10× increase in model scale on grounded reasoning tasks',
            chunkId: '',
          },
        ],
        significance: 'Shifts competitive moats from training compute to RLHF pipelines, instruction-tuning data quality, and agentic scaffolding design',
      },
    ],
    gaps: [
      {
        area: 'Long-horizon agent safety and reliability',
        whyItMatters: 'No published papers systematically evaluate agent behavior over 50+ sequential decisions. Current benchmarks use 1–5 step tasks. Production deployments require sustained reliable operation where small error rates compound catastrophically over long task horizons.',
        adjacentWork: [
          { paperId: 'demo-001', title: 'ReAct' },
          { paperId: 'demo-007', title: 'AgentBench' },
        ],
      },
      {
        area: 'Cross-session agent memory and personalisation',
        whyItMatters: 'All evaluated agent systems reset between tasks. Real-world utility requires agents to maintain accurate, updatable models of user preferences, prior decisions, and evolving context. No benchmark or training methodology addresses this, and naive approaches (storing all context) create unacceptable privacy and latency costs.',
        adjacentWork: [
          { paperId: 'demo-002', title: 'Toolformer' },
          { paperId: 'demo-005', title: 'Rethinking Multi-Agent Workflows' },
        ],
      },
    ],
  };

  // ─── Insert all artifacts ──────────────────────────────────────────────────
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
  console.log(`Inserted ${artifactInserts.length} demo artifacts`);
  console.log('\nSeed complete!');

  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
