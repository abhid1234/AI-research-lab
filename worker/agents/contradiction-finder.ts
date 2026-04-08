import { generateText, Output } from 'ai';
import { getStrongModel } from '../lib/ai.js';
import { ContradictionFinderOutput, type ContradictionFinderResult } from './schemas.js';

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

const SYSTEM_PROMPT = `You are a research contradiction analyst. Your job is to carefully compare claims across multiple research papers and identify where they conflict, diverge, or debate the same question from different angles — as well as where they converge on shared findings.

When identifying contradictions, classify each by its nature:
- "direct_contradiction": Two papers make mutually exclusive empirical or theoretical claims about the same thing under the same conditions (e.g., Paper A says scaling helps, Paper B says it does not).
- "scope_difference": The claims appear contradictory but actually apply to different scopes, domains, or settings (e.g., one finds improvements on NLP tasks, another fails to replicate on vision tasks).
- "methodology_gap": The claims differ because the evaluation methodology, metrics, or baselines are fundamentally different, making direct comparison invalid.
- "temporal_shift": An older paper's claim has been superseded or updated by a newer paper due to advances in the field.

For each contradiction, provide: the exact statements from each paper, the specific chunk IDs that ground those statements, an analysis of what the disagreement reveals, a resolution if one exists (or null if genuinely unresolved), and an importance rating.

For consensus, identify claims that multiple papers independently agree on. Compute a strength score between 0 and 1 (higher = more papers, stronger evidence). Include honest caveats about scope or conditions that limit the consensus.

For open debates, identify genuine scientific questions where the field is divided. Represent each side fairly, with the strongest available evidence. Note the significance of the debate for the field.

Quality principles: do not manufacture contradictions from superficial wording differences — only flag genuine substantive disagreements. Do not conflate different research questions as contradictions. Ground every claim to specific chunk IDs. Be precise about what each paper actually claims vs. implies.`;

export async function runContradictionFinder(
  input: ContradictionFinderInput,
): Promise<ContradictionFinderResult> {
  const prompt = buildPrompt(input);

  const { output } = await generateText({
    model: getStrongModel(),
    output: Output.object({ schema: ContradictionFinderOutput }),
    maxOutputTokens: 8192,
    system: SYSTEM_PROMPT,
    prompt,
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
