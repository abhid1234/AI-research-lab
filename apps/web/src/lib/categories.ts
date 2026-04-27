/**
 * Single source of truth for paper categorization.
 *
 * The canonical category set is the **content topics** users see in the
 * topic dropdown — the same names the ingestion pipeline uses. Charts and
 * filters MUST use this list so the dropdown, spider chart, citation graph,
 * and paper card pills all show the same buckets.
 *
 * Meta-collections ("All AI Papers", "HuggingFace Trending") are excluded
 * because they aren't content categories — they're aggregate views.
 */

export const CATEGORIES = [
  'LLM Agents',
  'Reasoning & Chain-of-Thought',
  'Vision & Multimodal',
  'RAG & Retrieval',
  'Code Generation',
  'AI Safety & Alignment',
  'Fine-tuning & PEFT',
  'Scaling & Architecture',
  'Evaluation & Benchmarks',
] as const;

export type Category = (typeof CATEGORIES)[number];

const CATEGORY_SET: Set<string> = new Set(CATEGORIES);

export interface CategoryColors {
  border: string;
  bg: string;
  text: string;
  pill: string;
}

// Warm-neutral editorial palette aligned to globals.css chart tokens.
// Each category maps to a chart hue (so radar / line / category badges
// share a consistent visual language).
export const CATEGORY_COLORS: Record<Category, CategoryColors> = {
  'LLM Agents':                  { border: 'oklch(0.50 0.13 260)', bg: 'oklch(0.97 0.012 260)', text: 'oklch(0.38 0.13 260)', pill: 'oklch(0.94 0.020 260)' },
  'Reasoning & Chain-of-Thought':{ border: 'oklch(0.55 0.14 70)',  bg: 'oklch(0.97 0.014 70)',  text: 'oklch(0.42 0.14 70)',  pill: 'oklch(0.94 0.022 70)'  },
  'Vision & Multimodal':         { border: 'oklch(0.55 0.12 195)', bg: 'oklch(0.97 0.012 195)', text: 'oklch(0.42 0.12 195)', pill: 'oklch(0.94 0.020 195)' },
  'RAG & Retrieval':             { border: 'oklch(0.55 0.14 110)', bg: 'oklch(0.97 0.014 110)', text: 'oklch(0.42 0.14 110)', pill: 'oklch(0.94 0.022 110)' },
  'Code Generation':             { border: 'oklch(0.55 0.13 90)',  bg: 'oklch(0.97 0.013 90)',  text: 'oklch(0.42 0.13 90)',  pill: 'oklch(0.94 0.021 90)'  },
  'AI Safety & Alignment':       { border: 'oklch(0.55 0.18 20)',  bg: 'oklch(0.97 0.018 20)',  text: 'oklch(0.42 0.18 20)',  pill: 'oklch(0.94 0.026 20)'  },
  'Fine-tuning & PEFT':          { border: 'oklch(0.50 0.18 325)', bg: 'oklch(0.97 0.018 325)', text: 'oklch(0.38 0.18 325)', pill: 'oklch(0.94 0.026 325)' },
  'Scaling & Architecture':      { border: 'oklch(0.50 0.12 150)', bg: 'oklch(0.97 0.012 150)', text: 'oklch(0.38 0.12 150)', pill: 'oklch(0.94 0.020 150)' },
  'Evaluation & Benchmarks':     { border: 'oklch(0.55 0.16 40)',  bg: 'oklch(0.97 0.016 40)',  text: 'oklch(0.42 0.16 40)',  pill: 'oklch(0.94 0.024 40)'  },
};

// Short labels for tight UI surfaces (radar axis labels, narrow legend rows).
// Maps full topic name -> compact display.
export const SHORT_LABELS: Record<Category, string> = {
  'LLM Agents': 'Agents',
  'Reasoning & Chain-of-Thought': 'Reasoning',
  'Vision & Multimodal': 'Vision',
  'RAG & Retrieval': 'Retrieval',
  'Code Generation': 'Code',
  'AI Safety & Alignment': 'Safety',
  'Fine-tuning & PEFT': 'Fine-tuning',
  'Scaling & Architecture': 'Scaling',
  'Evaluation & Benchmarks': 'Benchmarks',
};

/**
 * Detect ALL categories a paper could belong to. A paper genuinely
 * spans multiple topics (e.g., an "agentic RAG vision-language" paper
 * is in three buckets). The spider chart and any "by category" counts
 * use this so the data isn't artificially flattened.
 *
 * Sources unioned:
 *   1. paper.topics — explicit topic membership from ingestion
 *   2. arXiv category mapping
 *   3. Title/abstract keyword detection
 */
export function derivePaperCategories(p: any): Category[] {
  const found = new Set<Category>();

  // 1. Topic memberships (set during ingestion).
  //    Treat the legacy "Multi-Agent Systems" topic as LLM Agents — they're merged.
  if (Array.isArray(p?.topics)) {
    for (const t of p.topics) {
      if (typeof t !== 'string') continue;
      if (t === 'Multi-Agent Systems') found.add('LLM Agents');
      else if (CATEGORY_SET.has(t)) found.add(t as Category);
    }
  }

  const arxivCats: string[] = (Array.isArray(p?.categories) ? p.categories : [])
    .map((c: any) => String(c).toLowerCase());

  // 2. arXiv category mapping
  if (arxivCats.some((c) => c === 'cs.cv' || c === 'cs.mm' || c === 'eess.iv')) found.add('Vision & Multimodal');
  if (arxivCats.some((c) => c === 'cs.ma')) found.add('LLM Agents'); // multi-agent merged into agents
  if (arxivCats.some((c) => c === 'cs.cr')) found.add('AI Safety & Alignment');
  if (arxivCats.some((c) => c === 'cs.se' || c === 'cs.pl')) found.add('Code Generation');
  if (arxivCats.some((c) => c === 'cs.ir')) found.add('RAG & Retrieval');

  // 3. Keyword detection (additive — every match adds another category)
  const text = [p?.title ?? '', p?.abstract ?? '', ...arxivCats].join(' ').toLowerCase();

  if (text.includes('multimodal') || text.includes('vision-language') || text.includes(' vlm') || text.includes(' mllm') || text.includes(' lvlm') || text.includes('visual question')) found.add('Vision & Multimodal');
  if (text.includes('multi-agent') || text.includes('multi agent') || text.includes('agent collaboration')) found.add('LLM Agents');
  if (text.includes('retriev') || text.includes(' rag ') || text.includes('rag-') || text.includes('retrieval-augmented') || text.includes('retrieval augmented')) found.add('RAG & Retrieval');
  if (text.includes('code generation') || text.includes('code synthesis') || text.includes('program synthesis') || text.includes('codegen')) found.add('Code Generation');
  if (text.includes('jailbreak') || text.includes('red team') || text.includes('adversarial') || text.includes('safety alignment') || text.includes('rlhf safety')) found.add('AI Safety & Alignment');
  if (text.includes('benchmark') || text.includes('leaderboard') || text.includes('contamination')) found.add('Evaluation & Benchmarks');
  if (text.includes('fine-tun') || text.includes('rlhf') || text.includes(' dpo ') || text.includes('lora') || text.includes('peft') || text.includes('instruction tuning')) found.add('Fine-tuning & PEFT');
  if (text.includes('reason') || text.includes('chain-of-thought') || text.includes(' cot ') || text.includes('mathematical') || text.includes('theorem')) found.add('Reasoning & Chain-of-Thought');
  if (text.includes('scaling law') || text.includes('mixture of experts') || text.includes(' moe ') || (text.includes('transformer') && (text.includes('architect') || text.includes('attention')))) found.add('Scaling & Architecture');
  if (text.includes('agent')) found.add('LLM Agents');

  // If nothing matched, default to LLM Agents (most populous fallback)
  if (found.size === 0) found.add('LLM Agents');

  return Array.from(found);
}

/**
 * Bucket a paper into ONE canonical category. Used where a single
 * label is required (paper card pill, badge color). Picks the most
 * specific category from the multi-category result.
 */
export function derivePaperCategory(p: any): Category {
  // 1. Explicit topic membership (set by ingestion pipeline)
  if (Array.isArray(p?.topics)) {
    for (const t of p.topics) {
      if (typeof t === 'string' && CATEGORY_SET.has(t)) return t as Category;
    }
  }

  const arxivCats: string[] = (Array.isArray(p?.categories) ? p.categories : [])
    .map((c: any) => String(c).toLowerCase());

  // 2. arXiv category mapping (most reliable structural signal)
  if (arxivCats.some((c) => c === 'cs.cv' || c === 'cs.mm' || c === 'eess.iv')) return 'Vision & Multimodal';
  if (arxivCats.some((c) => c === 'cs.ma')) return 'LLM Agents'; // multi-agent merged into agents
  if (arxivCats.some((c) => c === 'cs.cr')) return 'AI Safety & Alignment';
  if (arxivCats.some((c) => c === 'cs.se' || c === 'cs.pl')) return 'Code Generation';
  if (arxivCats.some((c) => c === 'cs.ir')) return 'RAG & Retrieval';

  // 3. Keyword fallback
  const text = [
    p?.title ?? '', p?.abstract ?? '',
    ...arxivCats,
  ].join(' ').toLowerCase();

  if (text.includes('multimodal') || text.includes('vision-language') || text.includes(' vlm') || text.includes(' mllm') || text.includes(' lvlm') || text.includes('visual question') || text.includes('image generation')) return 'Vision & Multimodal';
  if (text.includes('multi-agent') || text.includes('multi agent')) return 'LLM Agents';
  if (text.includes('retriev') || text.includes(' rag ') || text.includes('rag-') || text.includes('retrieval-augmented') || text.includes('retrieval augmented')) return 'RAG & Retrieval';
  if (text.includes('code generation') || text.includes('code synthesis') || text.includes('program synthesis') || text.includes('codegen')) return 'Code Generation';
  if (text.includes('safe') || text.includes('align') || text.includes('jailbreak') || text.includes('red team') || text.includes('adversarial')) return 'AI Safety & Alignment';
  if (text.includes('benchmark') || text.includes('evaluation') || text.includes('leaderboard') || text.includes('contamination')) return 'Evaluation & Benchmarks';
  if (text.includes('fine-tun') || text.includes('rlhf') || text.includes(' dpo ') || text.includes('lora') || text.includes('peft') || text.includes('instruction tuning')) return 'Fine-tuning & PEFT';
  if (text.includes('reason') || text.includes('chain-of-thought') || text.includes(' cot ') || text.includes('mathematical') || text.includes('theorem')) return 'Reasoning & Chain-of-Thought';
  if (text.includes('scaling') || text.includes('mixture of experts') || text.includes(' moe ') || text.includes('transformer') || text.includes('attention mechanism') || text.includes('architecture')) return 'Scaling & Architecture';

  // Generic agent/LLM papers default to LLM Agents (most populous bucket)
  return 'LLM Agents';
}
