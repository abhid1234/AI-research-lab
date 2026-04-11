import { generateText, Output } from 'ai';
import { getFastModel, getStrongModel } from '../lib/ai.js';
import { PaperAnalyzerOutput, type PaperAnalyzerResult } from './schemas.js';
import { loadWorkflow } from '../lib/workflow-loader.js';

export interface PaperAnalyzerInput {
  papers: {
    id: string;
    title: string;
    abstract: string;
    authors: { name: string }[];
    publishedAt: string | null;
    chunks: { id: string; content: string; chunkIndex: number }[];
  }[];
}

const workflow = loadWorkflow('paper-analyzer');

export async function runPaperAnalyzer(
  input: PaperAnalyzerInput,
): Promise<PaperAnalyzerResult> {
  const prompt = buildPrompt(input);

  const { output } = await generateText({
    model: workflow.model === 'strong' ? getStrongModel() : getFastModel(),
    output: Output.object({ schema: PaperAnalyzerOutput }),
    maxOutputTokens: workflow.maxOutputTokens,
    system: workflow.prompt,
    prompt,
    providerOptions: {
      google: { thinkingConfig: { thinkingBudget: 0 } },
    },
  });

  return output;
}

function buildPrompt(input: PaperAnalyzerInput): string {
  return input.papers
    .map(
      (p) =>
        `## Paper: ${p.title}
ID: ${p.id}
Authors: ${p.authors.map((a) => a.name).join(', ')}
Date: ${p.publishedAt ?? 'Unknown'}
Abstract: ${p.abstract}

${p.chunks.map((c) => `[Chunk ${c.chunkIndex} | ID: ${c.id}]\n${c.content}`).join('\n\n')}`,
    )
    .join('\n\n---\n\n');
}
