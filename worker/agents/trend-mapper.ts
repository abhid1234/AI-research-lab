import { generateText, Output } from 'ai';
import { getFastModel } from '../lib/ai.js';
import { TrendMapperOutput, type TrendMapperResult } from './schemas.js';

export interface TrendMapperInput {
  papers: {
    id: string;
    title: string;
    abstract: string;
    authors: { name: string; affiliation?: string }[];
    publishedAt: string | null;
    categories: string[];
  }[];
}

const SYSTEM_PROMPT = `You are a research trend analyst specializing in tracking the evolution of ideas, methods, and topics in machine learning and AI research. Your job is to identify momentum and directional signals across a collection of papers — not just what exists, but what is accelerating, plateauing, or being abandoned.

For topic evolution, group papers into coherent topic clusters and trace how publication volume changes month over month. Assign each topic a momentum label: "accelerating" means the rate of new work is increasing; "steady" means consistent output; "declining" means dropping off; "emerging" means very recent with rapid early uptake. The "signal" field should explain WHY you assigned that momentum — what specific pattern in the data supports it.

For method shifts, track how specific technical methods (e.g., LoRA fine-tuning, chain-of-thought prompting, diffusion models, RLHF) rise and fall in adoption over time. Classify each method's current status and note what replaced it if it is declining or niche. The evidence field must cite specific papers or author patterns.

For emerging topics, identify areas with fewer than 5 papers but showing signs of rapid early interest (multiple groups publishing, high-profile authors, cross-lab convergence). Explain specifically why each emerging topic matters in the context of the broader field.

Be data-driven: your analysis should be traceable to the paper collection provided. Do not invent trends not evidenced in the papers. When publication dates are missing, make conservative inferences. If the paper set is too small for reliable trend detection, say so explicitly in the signal fields rather than inventing false precision.

The output will be rendered as charts and timelines — so month strings must be consistent ISO format (YYYY-MM), counts must be integers, and paper IDs must match those in the input.`;

export async function runTrendMapper(
  input: TrendMapperInput,
): Promise<TrendMapperResult> {
  const prompt = buildPrompt(input);

  const { output } = await generateText({
    model: getFastModel(),
    output: Output.object({ schema: TrendMapperOutput }),
    maxOutputTokens: 8192,
    system: SYSTEM_PROMPT,
    prompt,
  });

  return output;
}

function buildPrompt(input: TrendMapperInput): string {
  const header = `Analyze the following ${input.papers.length} papers for trends, topic evolution, and method adoption shifts.\n\n`;

  const paperList = input.papers
    .map(
      (p) =>
        `ID: ${p.id}
Title: ${p.title}
Authors: ${p.authors.map((a) => (a.affiliation ? `${a.name} (${a.affiliation})` : a.name)).join(', ')}
Date: ${p.publishedAt ?? 'Unknown'}
Categories: ${p.categories.join(', ')}
Abstract: ${p.abstract}`,
    )
    .join('\n\n---\n\n');

  return header + paperList;
}
