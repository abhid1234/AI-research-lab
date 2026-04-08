export function getStrongModel(): string {
  return process.env.AI_MODEL_STRONG ?? 'anthropic/claude-sonnet-4.6';
}

export function getFastModel(): string {
  return process.env.AI_MODEL_FAST ?? 'anthropic/claude-haiku-4.5';
}
