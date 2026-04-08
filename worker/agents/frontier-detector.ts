import { generateText, Output } from 'ai';
import { getStrongModel } from '../lib/ai.js';
import { FrontierDetectorOutput, type FrontierDetectorResult } from './schemas.js';
import type { PaperAnalyzerResult } from './schemas.js';
import type { TrendMapperResult } from './schemas.js';
import type { ContradictionFinderResult } from './schemas.js';
import type { BenchmarkExtractorResult } from './schemas.js';

export interface FrontierDetectorInput {
  papers: {
    id: string;
    title: string;
    authors: { name: string }[];
    publishedAt: string | null;
    chunks: { id: string; content: string; chunkIndex: number }[];
  }[];
  agentOutputs: {
    paperAnalysis: PaperAnalyzerResult;
    trendMap: TrendMapperResult;
    contradictions: ContradictionFinderResult;
    benchmarks: BenchmarkExtractorResult;
  };
}

const SYSTEM_PROMPT = `You are a research frontier detector — a senior scientist who synthesizes outputs from multiple specialized analysis agents to identify the most significant developments in a research area. Your job is not to summarize individual papers but to surface what is genuinely important when you look across the entire collection.

For frontiers, identify findings that represent a step-change in the field — not incremental improvements but qualitative shifts. Classify each frontier:
- "paradigm_shift": A finding that forces researchers to rethink a widely held assumption or approach.
- "method_breakthrough": A technique that substantially outperforms prior art and is likely to be widely adopted.
- "surprising_result": A result that contradicts prevailing intuitions or expectations in the field.
- "convergence": Independent groups arriving at similar conclusions through different methods, strongly validating a finding.
- "capability_unlock": A result that demonstrates a new capability that was previously thought impossible or far off.

For each frontier, cite the specific papers and chunk IDs that ground it. Reference related contradictions and benchmark changes that inform or complicate the finding. Provide a trend context (how does this fit the trajectory from the trend analysis?), a list of implications for practitioners and researchers, and open questions the frontier raises. Assign a confidence score between 0 and 1 — be conservative. A paradigm shift with weak evidence should score 0.4, not 0.9.

For pivoting trends, identify cases where the field appears to be moving away from one approach and toward another. This is stronger than a trend — it implies the prior approach is being actively abandoned. Ground each pivot in direct quotes from paper chunks.

For gaps, identify research areas that are conspicuously absent given what the collection covers. A gap is not just "we need more work on X" — it is a specific missing piece whose absence limits progress in the rest of the field. Reference adjacent work that makes the gap visible.

You have access to all prior agent outputs: paper analyses, trend maps, contradictions, and benchmark data. Use ALL of them. The best frontiers are those where multiple signals converge — a method that is trending up, producing SOTA benchmark results, with convergent findings across labs, but also raising unresolved theoretical questions. Synthesize, do not merely list.

Quality bar: 3–7 frontiers is better than 15 weak ones. Every claim must trace to specific paper IDs and chunk IDs. Confidence scores must be calibrated — most findings should score between 0.4 and 0.8. A score of 1.0 means absolute certainty, which almost never applies.`;

export async function runFrontierDetector(
  input: FrontierDetectorInput,
): Promise<FrontierDetectorResult> {
  const prompt = buildPrompt(input);

  const { output } = await generateText({
    model: getStrongModel(),
    output: Output.object({ schema: FrontierDetectorOutput }),
    maxOutputTokens: 8192,
    system: SYSTEM_PROMPT,
    prompt,
  });

  return output;
}

function buildPrompt(input: FrontierDetectorInput): string {
  const { paperAnalysis, trendMap, contradictions, benchmarks } =
    input.agentOutputs;

  const paperIndex = input.papers
    .map(
      (p) =>
        `ID: ${p.id} | Title: ${p.title} | Date: ${p.publishedAt ?? 'Unknown'} | Authors: ${p.authors.map((a) => a.name).join(', ')}`,
    )
    .join('\n');

  // Include only high-signal chunks (those referenced in prior agent outputs)
  const referencedChunkIds = new Set<string>([
    ...paperAnalysis.papers.flatMap((p) =>
      p.claims.flatMap((c) => c.chunkIds),
    ),
    ...contradictions.contradictions.flatMap((c) => [
      ...c.claim1.chunkIds,
      ...c.claim2.chunkIds,
    ]),
    ...benchmarks.benchmarkTables.flatMap((t) =>
      t.entries.flatMap((e) => e.chunkIds),
    ),
    ...benchmarks.warnings.flatMap((w) => w.chunkIds),
  ]);

  const relevantChunks = input.papers.flatMap((p) =>
    p.chunks
      .filter((c) => referencedChunkIds.has(c.id))
      .map(
        (c) =>
          `[Paper: ${p.id} | Chunk ${c.chunkIndex} | ID: ${c.id}]\n${c.content}`,
      ),
  );

  return `## Paper Index (${input.papers.length} papers)
${paperIndex}

## Paper Analysis Summary
${JSON.stringify(paperAnalysis, null, 2)}

## Trend Map
${JSON.stringify(trendMap, null, 2)}

## Contradictions & Consensus
${JSON.stringify(contradictions, null, 2)}

## Benchmark Data
${JSON.stringify(benchmarks, null, 2)}

## Referenced Source Chunks (${relevantChunks.length} chunks cited by prior agents)
${relevantChunks.join('\n\n---\n\n')}

Synthesize the above to identify research frontiers, pivoting trends, and significant gaps.`;
}
