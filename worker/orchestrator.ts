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

export async function runAnalysis(topicId: string, jobId: string): Promise<void> {
  // 1. Fetch all papers and chunks for this topic
  const papers = await getPapersByTopic(topicId);

  if (papers.length === 0) {
    throw new Error('No papers found for this topic. Run ingestion first.');
  }

  const paperIds = papers.map((p) => p.id);
  const allChunks = await getPaperChunksByPaperIds(paperIds);

  console.log(`[orchestrator] Analyzing ${papers.length} papers with ${allChunks.length} chunks`);

  // ── Phase 1: Paper Analyzer + Trend Mapper + Benchmark Extractor (parallel) ──

  await updateJobProgress(jobId, {
    step: 'phase1',
    total: 3,
    message: 'Phase 1: Running paper analyzer, trend mapper, benchmark extractor...',
  });

  // Paper Analyzer — needs abstract + top 3 chunks per paper
  const paperAnalyzerInput: PaperAnalyzerInput = {
    papers: papers.map((p) => ({
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
  };

  // Trend Mapper — needs abstract + author affiliations; no chunks
  const trendMapperInput: TrendMapperInput = {
    papers: papers.map((p) => ({
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
  };

  // Benchmark Extractor — needs methodology + benchmark-heavy chunks
  // We can't know methodology yet (it comes from Phase 1), so we pass placeholder
  // methodology values and rely on the chunks to provide the raw numbers.
  const benchmarkChunks = allChunks.filter((c) =>
    /benchmark|accuracy|score|f1|bleu|eval|performance|baseline|sota|state.of.the.art/i.test(
      c.content,
    ),
  );

  const benchmarkInput: BenchmarkExtractorInput = {
    papers: papers.map((p) => ({
      id: p.id,
      title: p.title,
      authors: ((p.authors as any[]) ?? []).map((a: any) =>
        typeof a === 'string' ? { name: a } : { name: a.name ?? String(a) },
      ),
      publishedAt: p.publishedAt?.toISOString() ?? null,
      // Methodology is not available until Phase 1 completes; use defaults so
      // the agent can still parse benchmark numbers from the provided chunks.
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
  };

  const [analyzerResult, trendResult, benchmarkResult] = await Promise.all([
    runPaperAnalyzer(paperAnalyzerInput),
    runTrendMapper(trendMapperInput),
    runBenchmarkExtractor(benchmarkInput),
  ]);

  console.log('[orchestrator] Phase 1 complete');

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

  const contradictionInput: ContradictionFinderInput = {
    papers: analyzerResult.papers.map((analyzed) => {
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

  const contradictionResult = await runContradictionFinder(contradictionInput);
  console.log('[orchestrator] Phase 2 complete');

  // ── Phase 3: Frontier Detector (needs all prior agent outputs) ──

  await updateJobProgress(jobId, {
    step: 'phase3',
    total: 3,
    message: 'Phase 3: Detecting research frontiers...',
  });

  const frontierInput: FrontierDetectorInput = {
    papers: papers.map((p) => ({
      id: p.id,
      title: p.title,
      authors: ((p.authors as any[]) ?? []).map((a: any) =>
        typeof a === 'string' ? { name: a } : { name: a.name ?? String(a) },
      ),
      publishedAt: p.publishedAt?.toISOString() ?? null,
      // Pass all chunks — frontier-detector filters internally by referenced chunk IDs
      chunks: (chunksByPaperId.get(p.id) ?? []).map((c) => ({
        id: c.id,
        content: c.content,
        chunkIndex: c.chunkIndex,
      })),
    })),
    agentOutputs: {
      paperAnalysis: analyzerResult,
      trendMap: trendResult,
      contradictions: contradictionResult,
      benchmarks: benchmarkResult,
    },
  };

  const frontierResult = await runFrontierDetector(frontierInput);
  console.log('[orchestrator] Phase 3 complete');

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
