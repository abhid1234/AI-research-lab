import {
  getPapersByTopic,
  getPaperChunksByPaperIds,
  writeArtifact,
  updateJobProgress,
} from '@research-lab/db';
import { runPaperAnalyzer, type PaperAnalyzerInput } from './agents/paper-analyzer.js';
import { runTrendMapper, type TrendMapperInput } from './agents/trend-mapper.js';
import { runBenchmarkExtractor, type BenchmarkExtractorInput } from './agents/benchmark-extractor.js';
import { runContradictionFinder, type ContradictionFinderInput } from './agents/contradiction-finder.js';
import { runFrontierDetector, type FrontierDetectorInput } from './agents/frontier-detector.js';

// Batch size: each agent call processes this many papers at a time.
// Keeps prompt tokens manageable while still analyzing the entire collection.
const BATCH_SIZE = 20;

function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function runAnalysis(topicId: string, jobId: string): Promise<void> {
  // 1. Fetch all papers and chunks for this topic
  const allPapersForTopic = await getPapersByTopic(topicId);

  if (allPapersForTopic.length === 0) {
    throw new Error('No papers found for this topic. Run ingestion first.');
  }

  // Sort by publishedAt (newest first) — deterministic order across agent calls
  const papers = [...allPapersForTopic].sort((a, b) => {
    const da = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const db = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return db - da;
  });

  const paperIds = papers.map((p) => p.id);
  const allChunks = await getPaperChunksByPaperIds(paperIds);
  const paperBatches = chunkArray(papers, BATCH_SIZE);

  console.log(
    `[orchestrator] Analyzing ALL ${papers.length} papers in ${paperBatches.length} batch(es) of up to ${BATCH_SIZE} with ${allChunks.length} chunks`,
  );

  // ── Phase 1: Paper Analyzer + Trend Mapper + Benchmark Extractor (batched) ──

  await updateJobProgress(jobId, {
    step: 'phase1',
    total: 3,
    message: `Phase 1: Analyzing ${papers.length} papers in ${paperBatches.length} batches...`,
  });

  const benchmarkChunks = allChunks.filter((c) =>
    /benchmark|accuracy|score|f1|bleu|eval|performance|baseline|sota|state.of.the.art/i.test(c.content),
  );

  // Helpers to build per-batch inputs
  const buildAnalyzerInput = (batch: typeof papers): PaperAnalyzerInput => ({
    papers: batch.map((p) => ({
      id: p.id,
      title: p.title,
      abstract: p.abstract,
      authors: ((p.authors as any[]) ?? []).map((a: any) =>
        typeof a === 'string' ? { name: a } : { name: a.name ?? String(a) },
      ),
      publishedAt: p.publishedAt?.toISOString() ?? null,
      chunks: allChunks
        .filter((c) => c.paperId === p.id)
        .slice(0, 3)
        .map((c) => ({ id: c.id, content: c.content, chunkIndex: c.chunkIndex })),
    })),
  });

  const buildTrendInput = (batch: typeof papers): TrendMapperInput => ({
    papers: batch.map((p) => ({
      id: p.id,
      title: p.title,
      abstract: p.abstract,
      authors: ((p.authors as any[]) ?? []).map((a: any) =>
        typeof a === 'string'
          ? { name: a }
          : { name: a.name ?? String(a), affiliation: a.affiliation },
      ),
      publishedAt: p.publishedAt?.toISOString() ?? null,
      categories: (p.categories as string[]) ?? [],
    })),
  });

  const buildBenchmarkInput = (batch: typeof papers): BenchmarkExtractorInput => ({
    papers: batch.map((p) => ({
      id: p.id,
      title: p.title,
      authors: ((p.authors as any[]) ?? []).map((a: any) =>
        typeof a === 'string' ? { name: a } : { name: a.name ?? String(a) },
      ),
      publishedAt: p.publishedAt?.toISOString() ?? null,
      methodology: {
        type: 'empirical',
        datasets: [],
        models: [],
        computeScale: 'unknown',
      },
      chunks: benchmarkChunks
        .filter((c) => c.paperId === p.id)
        .map((c) => ({ id: c.id, content: c.content, chunkIndex: c.chunkIndex })),
    })),
  });

  // Run all 3 Phase-1 agents on each batch in parallel, then merge results
  const batchResults = await Promise.all(
    paperBatches.map(async (batch, i) => {
      console.log(`[orchestrator]   batch ${i + 1}/${paperBatches.length} (${batch.length} papers)`);
      const [a, t, b] = await Promise.all([
        runPaperAnalyzer(buildAnalyzerInput(batch)),
        runTrendMapper(buildTrendInput(batch)),
        runBenchmarkExtractor(buildBenchmarkInput(batch)),
      ]);
      return { analyzer: a, trend: t, benchmark: b };
    }),
  );

  // Merge analyzer outputs (simple concat of papers arrays)
  const analyzerResult = {
    papers: batchResults.flatMap((r) => r.analyzer.papers ?? []),
  };

  // Merge trend outputs — concatenate arrays (topicEvolution, methodShifts, emergingTopics)
  const trendResult = {
    topicEvolution: batchResults.flatMap((r) => r.trend.topicEvolution ?? []),
    methodShifts: batchResults.flatMap((r) => r.trend.methodShifts ?? []),
    emergingTopics: batchResults.flatMap((r) => r.trend.emergingTopics ?? []),
  };

  // Merge benchmark outputs — concat all arrays
  const benchmarkResult = {
    benchmarkTables: batchResults.flatMap((r) => r.benchmark.benchmarkTables ?? []),
    newBenchmarks: batchResults.flatMap((r) => r.benchmark.newBenchmarks ?? []),
    warnings: batchResults.flatMap((r) => r.benchmark.warnings ?? []),
    stateOfTheArt: batchResults.flatMap((r) => r.benchmark.stateOfTheArt ?? []),
  };

  console.log(`[orchestrator] Phase 1 complete — ${analyzerResult.papers.length} papers analyzed`);

  // ── Phase 2: Contradiction Finder (needs Paper Analyzer claims) ──

  await updateJobProgress(jobId, {
    step: 'phase2',
    total: 3,
    message: 'Phase 2: Finding contradictions...',
  });

  // Build a lookup so we can attach per-paper chunks
  const chunksByPaperId = new Map<string, typeof allChunks>();
  for (const chunk of allChunks) {
    const list = chunksByPaperId.get(chunk.paperId) ?? [];
    list.push(chunk);
    chunksByPaperId.set(chunk.paperId, list);
  }

  // Batch Phase 2 — split analyzed papers into batches of BATCH_SIZE
  const analyzedBatches = chunkArray(analyzerResult.papers, BATCH_SIZE);

  const contradictionBatchResults = await Promise.all(
    analyzedBatches.map(async (analyzedBatch, i) => {
      console.log(`[orchestrator]   contradiction batch ${i + 1}/${analyzedBatches.length}`);
      const contradictionInput: ContradictionFinderInput = {
        papers: analyzedBatch.map((analyzed) => {
          const paper = papers.find((p) => p.id === analyzed.paperId);
          const paperChunks = chunksByPaperId.get(analyzed.paperId) ?? [];
          return {
            id: analyzed.paperId,
            title: paper?.title ?? 'Unknown',
            authors: ((paper?.authors as any[]) ?? []).map((a: any) =>
              typeof a === 'string' ? { name: a } : { name: a.name ?? String(a) },
            ),
            publishedAt: paper?.publishedAt?.toISOString() ?? null,
            claims: analyzed.claims,
            chunks: paperChunks.map((c) => ({
              id: c.id,
              content: c.content,
              chunkIndex: c.chunkIndex,
            })),
          };
        }),
      };
      return runContradictionFinder(contradictionInput);
    }),
  );

  const contradictionResult = {
    contradictions: contradictionBatchResults.flatMap((r) => r.contradictions ?? []),
    consensus: contradictionBatchResults.flatMap((r) => r.consensus ?? []),
    openDebates: contradictionBatchResults.flatMap((r) => r.openDebates ?? []),
  };

  console.log(`[orchestrator] Phase 2 complete — ${contradictionResult.contradictions.length} contradictions, ${contradictionResult.consensus.length} consensus findings`);

  // ── Phase 3: Frontier Detector (batched) ──

  await updateJobProgress(jobId, {
    step: 'phase3',
    total: 3,
    message: 'Phase 3: Detecting research frontiers...',
  });

  // Batch frontier detector over paper batches. It gets synthesized agent outputs
  // scoped to each batch so it can find frontiers across the full collection.
  const frontierBatchResults = await Promise.all(
    paperBatches.map(async (batch, i) => {
      console.log(`[orchestrator]   frontier batch ${i + 1}/${paperBatches.length}`);
      const frontierInput: FrontierDetectorInput = {
        papers: batch.map((p) => ({
          id: p.id,
          title: p.title,
          authors: ((p.authors as any[]) ?? []).map((a: any) =>
            typeof a === 'string' ? { name: a } : { name: a.name ?? String(a) },
          ),
          publishedAt: p.publishedAt?.toISOString() ?? null,
          chunks: (chunksByPaperId.get(p.id) ?? []).map((c) => ({
            id: c.id,
            content: c.content,
            chunkIndex: c.chunkIndex,
          })),
        })),
        agentOutputs: {
          paperAnalysis: {
            papers: analyzerResult.papers.filter((ap) => batch.some((p) => p.id === ap.paperId)),
          },
          trendMap: trendResult,
          contradictions: contradictionResult,
          benchmarks: benchmarkResult,
        },
      };
      return runFrontierDetector(frontierInput);
    }),
  );

  const frontierResult = {
    frontiers: frontierBatchResults.flatMap((r) => r.frontiers ?? []),
    pivotingTrends: frontierBatchResults.flatMap((r) => r.pivotingTrends ?? []),
    gaps: frontierBatchResults.flatMap((r) => r.gaps ?? []),
  };

  console.log(`[orchestrator] Phase 3 complete — ${frontierResult.frontiers.length} frontiers`);

  // ── Write all artifacts to DB ──

  // Paper Analyzer → overview + papers tabs
  await writeArtifact({
    topicId,
    jobId,
    agentType: 'paper-analyzer',
    tabTarget: 'overview',
    data: analyzerResult,
  });
  await writeArtifact({
    topicId,
    jobId,
    agentType: 'paper-analyzer',
    tabTarget: 'papers',
    data: analyzerResult,
  });

  // Trend Mapper → overview tab
  await writeArtifact({
    topicId,
    jobId,
    agentType: 'trend-mapper',
    tabTarget: 'overview',
    data: trendResult,
  });

  // Benchmark Extractor → overview + insights tabs
  await writeArtifact({
    topicId,
    jobId,
    agentType: 'benchmark-extractor',
    tabTarget: 'overview',
    data: benchmarkResult,
  });
  await writeArtifact({
    topicId,
    jobId,
    agentType: 'benchmark-extractor',
    tabTarget: 'insights',
    data: benchmarkResult,
  });

  // Contradiction Finder → insights + connections tabs
  await writeArtifact({
    topicId,
    jobId,
    agentType: 'contradiction-finder',
    tabTarget: 'insights',
    data: contradictionResult,
  });
  await writeArtifact({
    topicId,
    jobId,
    agentType: 'contradiction-finder',
    tabTarget: 'connections',
    data: contradictionResult,
  });

  // Frontier Detector → frontiers tab
  await writeArtifact({
    topicId,
    jobId,
    agentType: 'frontier-detector',
    tabTarget: 'frontiers',
    data: frontierResult,
  });

  console.log('[orchestrator] All artifacts written to DB');
}
