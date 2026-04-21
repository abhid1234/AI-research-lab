import { google } from '@ai-sdk/google';
import { anthropic } from '@ai-sdk/anthropic';
import type { LanguageModel } from 'ai';

/**
 * Agent models — prefer Claude (via Anthropic) when ANTHROPIC_API_KEY is set,
 * else fall back to Gemini.
 *
 * Claude has higher rate limits than Gemini's free tier — needed for large
 * topics like "All AI Papers" (500+ papers).
 */

const useAnthropic = Boolean(process.env.ANTHROPIC_API_KEY);

/**
 * Cost note: Haiku-4.5 is ~$1/$5 per 1M tokens (in/out).
 * Sonnet-4.5 is ~$3/$15 — 3x more.
 * Default both tiers to Haiku for cost; opt into Sonnet via env var.
 */
export function getStrongModel(): LanguageModel {
  if (useAnthropic) {
    const id = process.env.AI_MODEL_STRONG ?? 'claude-haiku-4-5';
    return anthropic(id);
  }
  const id = process.env.AI_MODEL_STRONG ?? 'gemini-2.5-flash';
  return google(id);
}

export function getFastModel(): LanguageModel {
  if (useAnthropic) {
    const id = process.env.AI_MODEL_FAST ?? 'claude-haiku-4-5';
    return anthropic(id);
  }
  const id = process.env.AI_MODEL_FAST ?? 'gemini-2.5-flash';
  return google(id);
}
