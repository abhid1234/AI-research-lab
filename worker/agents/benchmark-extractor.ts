import { generateText, Output } from 'ai';
import { getFastModel, getStrongModel } from '../lib/ai.js';
import { BenchmarkExtractorOutput, type BenchmarkExtractorResult } from './schemas.js';
import { loadWorkflow } from '../lib/workflow-loader.js';
import { throttle } from '../lib/throttle.js';

export interface BenchmarkExtractorInput {
  papers: {
    id: string;
    title: string;
    authors: { name: string }[];
    publishedAt: string | null;
    methodology: {
      type: 'empirical' | 'theoretical' | 'survey' | 'system';
      datasets: string[];
      models: string[];
      computeScale: string;
    };
    chunks: { id: string; content: string; chunkIndex: number }[];
  }[];
}

const workflow = loadWorkflow('benchmark-extractor');

export async function runBenchmarkExtractor(
  input: BenchmarkExtractorInput,
): Promise<BenchmarkExtractorResult> {
  const prompt = buildPrompt(input);

  const { output } = await throttle(() =>
    generateText({
      model: workflow.model === 'strong' ? getStrongModel() : getFastModel(),
      output: Output.object({ schema: BenchmarkExtractorOutput }),
      maxOutputTokens: workflow.maxOutputTokens,
      system: workflow.prompt,
      prompt,
      providerOptions: {
        google: { thinkingConfig: { thinkingBudget: 0 } },
      },
    }),
  );

  return output;
}

function buildPrompt(input: BenchmarkExtractorInput): string {
  const header = `Extract benchmark results, state-of-the-art comparisons, new benchmarks, and evaluation warnings from the following ${input.papers.length} papers.\n\n`;

  const paperList = input.papers
    .map((p) => {
      const chunks = p.chunks
        .map((c) => `[Chunk ${c.chunkIndex} | ID: ${c.id}]\n${c.content}`)
        .join('\n\n');

      return `## Paper: ${p.title}
ID: ${p.id}
Authors: ${p.authors.map((a) => a.name).join(', ')}
Date: ${p.publishedAt ?? 'Unknown'}
Type: ${p.methodology.type}
Datasets: ${p.methodology.datasets.join(', ') || 'None listed'}
Models evaluated: ${p.methodology.models.join(', ') || 'None listed'}
Compute scale: ${p.methodology.computeScale}

${chunks}`;
    })
    .join('\n\n---\n\n');

  return header + paperList;
}
