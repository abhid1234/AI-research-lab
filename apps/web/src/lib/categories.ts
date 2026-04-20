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
  'Multi-Agent Systems',
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

export const CATEGORY_COLORS: Record<Category, CategoryColors> = {
  'LLM Agents':                  { border: '#6366f1', bg: '#eef2ff', text: '#4338ca', pill: '#e0e7ff' },
  'Multi-Agent Systems':         { border: '#ec4899', bg: '#fdf2f8', text: '#be185d', pill: '#fce7f3' },
  'Reasoning & Chain-of-Thought':{ border: '#f59e0b', bg: '#fffbeb', text: '#b45309', pill: '#fef3c7' },
  'Vision & Multimodal':         { border: '#a855f7', bg: '#faf5ff', text: '#7e22ce', pill: '#f3e8ff' },
  'RAG & Retrieval':             { border: '#06b6d4', bg: '#ecfeff', text: '#0e7490', pill: '#cffafe' },
  'Code Generation':             { border: '#0ea5e9', bg: '#f0f9ff', text: '#0369a1', pill: '#e0f2fe' },
  'AI Safety & Alignment':       { border: '#ef4444', bg: '#fef2f2', text: '#b91c1c', pill: '#fee2e2' },
  'Fine-tuning & PEFT':          { border: '#3b82f6', bg: '#eff6ff', text: '#1d4ed8', pill: '#dbeafe' },
  'Scaling & Architecture':      { border: '#8b5cf6', bg: '#f5f3ff', text: '#6d28d9', pill: '#ede9fe' },
  'Evaluation & Benchmarks':     { border: '#84cc16', bg: '#f7fee7', text: '#4d7c0f', pill: '#ecfccb' },
};

// Short labels for tight UI surfaces (radar axis labels, narrow legend rows).
// Maps full topic name -> compact display.
export const SHORT_LABELS: Record<Category, string> = {
  'LLM Agents': 'Agents',
  'Multi-Agent Systems': 'Multi-Agent',
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
 * Bucket a paper into one of the canonical content categories.
 *
 * Order of preference:
 *   1. paper.topics — explicit topic membership from ingestion (TRUTH)
 *   2. arXiv categories — strong structural signal
 *   3. Title/abstract keyword fallback
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
  if (arxivCats.some((c) => c === 'cs.ma')) return 'Multi-Agent Systems';
  if (arxivCats.some((c) => c === 'cs.cr')) return 'AI Safety & Alignment';
  if (arxivCats.some((c) => c === 'cs.se' || c === 'cs.pl')) return 'Code Generation';
  if (arxivCats.some((c) => c === 'cs.ir')) return 'RAG & Retrieval';

  // 3. Keyword fallback
  const text = [
    p?.title ?? '', p?.abstract ?? '',
    ...arxivCats,
  ].join(' ').toLowerCase();

  if (text.includes('multimodal') || text.includes('vision-language') || text.includes(' vlm') || text.includes(' mllm') || text.includes(' lvlm') || text.includes('visual question') || text.includes('image generation')) return 'Vision & Multimodal';
  if (text.includes('multi-agent') || text.includes('multi agent')) return 'Multi-Agent Systems';
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
