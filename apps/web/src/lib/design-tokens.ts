/**
 * Centralized color tokens for semantic UI concepts.
 * Change these in one place to restyle the whole app.
 */

export const contradictionNatureColors: Record<string, string> = {
  temporal_shift: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  direct_contradiction: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  scope_difference: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  methodology_gap: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  // legacy keys
  direct: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  indirect: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  methodological: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  contextual: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
};

export const frontierCategoryColors: Record<string, string> = {
  paradigm_shift: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  method_breakthrough: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  surprising_result: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  convergence: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  capability_unlock: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
};

export const frontierCategoryEmoji: Record<string, string> = {
  paradigm_shift: '🔴',
  method_breakthrough: '🔵',
  surprising_result: '🟡',
  convergence: '🟢',
  capability_unlock: '🟣',
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
