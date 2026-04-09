import { generateText, Output } from 'ai';
import { getFastModel, getStrongModel } from '../lib/ai.js';
import { FrontierDetectorOutput, type FrontierDetectorResult } from './schemas.js';
import type { PaperAnalyzerResult } from './schemas.js';
import type { TrendMapperResult } from './schemas.js';
import type { ContradictionFinderResult } from './schemas.js';
import type { BenchmarkExtractorResult } from './schemas.js';
import { loadWorkflow } from '../lib/workflow-loader.js';

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

const workflow = loadWorkflow('frontier-detector');

export async function runFrontierDetector(
  input: FrontierDetectorInput,
): Promise<FrontierDetectorResult> {
  const prompt = buildPrompt(input);

  const { output } = await generateText({
    model: workflow.model === 'strong' ? getStrongModel() : getFastModel(),
    output: Output.object({ schema: FrontierDetectorOutput }),
    maxOutputTokens: workflow.maxOutputTokens,
    system: workflow.prompt,
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
