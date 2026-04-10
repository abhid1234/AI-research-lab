import { generateText, Output } from 'ai';
import { getFastModel, getStrongModel } from '../lib/ai.js';
import { ContradictionFinderOutput, type ContradictionFinderResult } from './schemas.js';
import { loadWorkflow } from '../lib/workflow-loader.js';

export interface ContradictionFinderInput {
  papers: {
    id: string;
    title: string;
    authors: { name: string }[];
    publishedAt: string | null;
    claims: {
      statement: string;
      evidence: string;
      strength: 'strong' | 'moderate' | 'weak';
      chunkIds: string[];
    }[];
    chunks: { id: string; content: string; chunkIndex: number }[];
  }[];
}

const workflow = loadWorkflow('contradiction-finder');

export async function runContradictionFinder(
  input: ContradictionFinderInput,
): Promise<ContradictionFinderResult> {
  const prompt = buildPrompt(input);

  const { output } = await generateText({
    model: workflow.model === 'strong' ? getStrongModel() : getFastModel(),
    output: Output.object({ schema: ContradictionFinderOutput }),
    maxOutputTokens: workflow.maxOutputTokens,
    system: workflow.prompt,
    prompt,
    providerOptions: {
      google: { thinkingConfig: { thinkingBudget: 0 } },
    },
  });

  return output;
}

function buildPrompt(input: ContradictionFinderInput): string {
  const header = `Compare the following ${input.papers.length} papers for contradictions, consensus, and open debates.\n\n`;

  const paperList = input.papers
    .map((p) => {
      const claimsList = p.claims
        .map(
          (c, i) =>
            `  Claim ${i + 1} [${c.strength}] (chunks: ${c.chunkIds.join(', ')}): ${c.statement}\n  Evidence: ${c.evidence}`,
        )
        .join('\n');

      const relevantChunks = p.chunks
        .filter((ch) =>
          p.claims.some((cl) => cl.chunkIds.includes(ch.id)),
        )
        .map((c) => `[Chunk ${c.chunkIndex} | ID: ${c.id}]\n${c.content}`)
        .join('\n\n');

      return `## Paper: ${p.title}
ID: ${p.id}
Authors: ${p.authors.map((a) => a.name).join(', ')}
Date: ${p.publishedAt ?? 'Unknown'}

Claims:
${claimsList || '  (none extracted)'}

Relevant Chunks:
${relevantChunks || '  (none)'}`;
    })
    .join('\n\n---\n\n');

  return header + paperList;
}
