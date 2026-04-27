/**
 * Centralized color tokens for semantic UI concepts.
 * Change these in one place to restyle the whole app.
 */

// Editorial badge palette — warm-neutral, no violet/indigo (AI-slop hues).
// `text-*-700` for light-mode contrast; `dark:text-*-400` keeps prior dark-mode legibility.
export const contradictionNatureColors: Record<string, string> = {
  temporal_shift:        'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25',
  direct_contradiction:  'bg-rose-500/10  text-rose-700  dark:text-rose-400  border-rose-500/25',
  scope_difference:      'bg-teal-500/10  text-teal-700  dark:text-teal-400  border-teal-500/25',
  methodology_gap:       'bg-stone-500/10 text-stone-700 dark:text-stone-400 border-stone-500/25',
  // legacy keys
  direct:                'bg-rose-500/10  text-rose-700  dark:text-rose-400  border-rose-500/25',
  indirect:              'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25',
  methodological:        'bg-teal-500/10  text-teal-700  dark:text-teal-400  border-teal-500/25',
  contextual:            'bg-stone-500/10 text-stone-700 dark:text-stone-400 border-stone-500/25',
};

export const frontierCategoryColors: Record<string, string> = {
  paradigm_shift:     'bg-rose-500/10    text-rose-700    dark:text-rose-400    border-rose-500/25',
  method_breakthrough:'bg-sky-500/10     text-sky-700     dark:text-sky-400     border-sky-500/25',
  surprising_result:  'bg-amber-500/10   text-amber-700   dark:text-amber-400   border-amber-500/25',
  convergence:        'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25',
  capability_unlock:  'bg-stone-500/10   text-stone-700   dark:text-stone-400   border-stone-500/25',
};

// Hairline dot indicator color (used in place of the previous emoji squares —
// emoji-as-design is on the AI-slop blacklist).
export const frontierCategoryDotColors: Record<string, string> = {
  paradigm_shift:      'bg-rose-500',
  method_breakthrough: 'bg-sky-500',
  surprising_result:   'bg-amber-500',
  convergence:         'bg-emerald-500',
  capability_unlock:   'bg-stone-500',
};

// Deprecated — kept for backwards compat with any consumer not yet migrated.
// Prefer frontierCategoryDotColors + a styled dot element.
export const frontierCategoryEmoji: Record<string, string> = {
  paradigm_shift:      '',
  method_breakthrough: '',
  surprising_result:   '',
  convergence:         '',
  capability_unlock:   '',
};

export const frontierCategoryLabel: Record<string, string> = {
  paradigm_shift: 'Paradigm Shift',
  method_breakthrough: 'Method Breakthrough',
  surprising_result: 'Surprising Result',
  convergence: 'Convergence',
  capability_unlock: 'Capability Unlock',
};

export const importanceDotColors: Record<string, string> = {
  high: 'bg-rose-500',
  medium: 'bg-amber-400',
  low: 'bg-muted-foreground/40',
};

export const warningIssueLabels: Record<string, string> = {
  cherry_picked_benchmarks: 'Cherry-Picked Benchmarks',
  incomparable_conditions: 'Incomparable Conditions',
  missing_baselines: 'Missing Baselines',
  overfitted_metrics: 'Overfitted Metrics',
};
