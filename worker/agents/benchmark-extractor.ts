import { generateText, Output } from 'ai';
import { getFastModel } from '../lib/ai.js';
import { BenchmarkExtractorOutput, type BenchmarkExtractorResult } from './schemas.js';

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

const SYSTEM_PROMPT = `You are a benchmark analyst specializing in evaluating how research papers measure and report performance. Your job is to extract benchmark results, normalize them for comparison, identify new benchmarks, flag evaluation red flags, and track state-of-the-art changes.

For benchmark tables, group results by benchmark name. Each entry should identify the model evaluated, the paper it comes from, the scores (as a record mapping metric name to numeric value), the experimental conditions (e.g., "zero-shot", "fine-tuned on X", "with chain-of-thought"), and the chunk IDs that contain the actual numbers. Only include numeric scores — do not invent values not present in the text.

For new benchmarks introduced in the collection, explain what they measure, why existing benchmarks were insufficient, and assess early adoption (are other papers already using it?).

For warnings, flag the following evaluation problems when you see them:
- "cherry_picked_benchmarks": The paper selects only benchmarks where their method wins, ignoring relevant ones where it does not.
- "incomparable_conditions": Results are compared to baselines under different training data, compute, or prompting conditions, making comparison invalid.
- "unreproducible": The paper omits hyperparameters, random seeds, or implementation details necessary to reproduce results.
- "saturated_benchmark": The paper reports near-ceiling results on a benchmark that is too easy to distinguish between methods.

For state-of-the-art tracking, identify the best known result on each benchmark within this paper collection. When a paper improves on a prior result that is also in this collection, record both. Use null for previousBest if no prior result exists in the collection. The "improvement" field should be a human-readable delta (e.g., "+2.3 F1 points", "5% relative gain").

Ground every score extraction to specific chunk IDs. Do not report scores you are not confident came from the paper text.`;

export async function runBenchmarkExtractor(
  input: BenchmarkExtractorInput,
): Promise<BenchmarkExtractorResult> {
  const prompt = buildPrompt(input);

  const { output } = await generateText({
    model: getFastModel(),
    output: Output.object({ schema: BenchmarkExtractorOutput }),
    maxOutputTokens: 8192,
    system: SYSTEM_PROMPT,
    prompt,
  });

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
