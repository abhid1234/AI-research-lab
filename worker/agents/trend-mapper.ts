import { generateText, Output } from 'ai';
import { getFastModel, getStrongModel } from '../lib/ai.js';
import { TrendMapperOutput, type TrendMapperResult } from './schemas.js';
import { loadWorkflow } from '../lib/workflow-loader.js';

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

const workflow = loadWorkflow('trend-mapper');

export async function runTrendMapper(
  input: TrendMapperInput,
): Promise<TrendMapperResult> {
  const prompt = buildPrompt(input);

  const { output } = await generateText({
    model: workflow.model === 'strong' ? getStrongModel() : getFastModel(),
    output: Output.object({ schema: TrendMapperOutput }),
    maxOutputTokens: workflow.maxOutputTokens,
    system: workflow.prompt,
    prompt,
    providerOptions: {
      google: { thinkingConfig: { thinkingBudget: 0 } },
    },
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
