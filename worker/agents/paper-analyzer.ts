import { generateText, Output } from 'ai';
import { getFastModel } from '../lib/ai.js';
import { PaperAnalyzerOutput, type PaperAnalyzerResult } from './schemas.js';

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

const SYSTEM_PROMPT = `You are a research paper analyst with deep expertise in machine learning, AI, and computer science. Your job is to produce structured, grounded analyses of research papers that practitioners can act on.

For each paper you are given, extract the following with precision:

1. **Problem**: The specific, concrete problem the paper addresses. Be precise — not "improves LLMs" but "reduces hallucination in long-context summarization tasks."

2. **Approach**: The technical approach taken. Name the key algorithmic idea, architecture change, training strategy, or theoretical framework.

3. **Key Innovation**: What is genuinely new compared to prior work. This must be specific — avoid vague phrases like "novel method." Identify the actual contribution: new objective function, new architectural component, new insight about scaling behavior, etc.

4. **Main Result**: The primary quantitative or qualitative finding. Include benchmark names and numbers when available.

5. **Limitations**: Enumerate honest limitations — computational cost, dataset scope, evaluation gaps, reproducibility concerns. Do not skip this.

6. **Methodology**: Classify the paper type (empirical/theoretical/survey/system), list datasets and models used, and characterize compute scale (e.g., "single A100", "32 H100s", "TPU pod").

7. **Claims**: Extract 3–7 explicit or implicit claims the paper makes, each with supporting evidence and a strength rating. Ground EVERY claim to specific chunk IDs from the input.

8. **Takeaway**: One sentence a senior ML engineer would find useful. Avoid hype. Focus on what is actionable or important to know.

Quality bar: if a claim cannot be grounded to a chunk ID, mark it weak. If a limitation is not stated but obvious, include it. Precision beats coverage — a short accurate analysis beats a long vague one.`;

export async function runPaperAnalyzer(
  input: PaperAnalyzerInput,
): Promise<PaperAnalyzerResult> {
  const prompt = buildPrompt(input);

  const { output } = await generateText({
    model: getFastModel(),
    output: Output.object({ schema: PaperAnalyzerOutput }),
    maxOutputTokens: 8192,
    system: SYSTEM_PROMPT,
    prompt,
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
