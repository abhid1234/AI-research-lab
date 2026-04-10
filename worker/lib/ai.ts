import { google } from '@ai-sdk/google';
import type { LanguageModel } from 'ai';

/**
 * Agent models — default to Gemini (free tier 1500 req/min).
 * Override with AI_MODEL_STRONG / AI_MODEL_FAST env vars.
 */
export function getStrongModel(): LanguageModel {
  // Using flash for the "strong" slot too — 2.5-pro requires thinking tokens which
  // eats our output budget for structured JSON. Flash is fast, free, and plenty capable.
  const id = process.env.AI_MODEL_STRONG ?? 'gemini-2.5-flash';
  return google(id);
}

export function getFastModel(): LanguageModel {
  const id = process.env.AI_MODEL_FAST ?? 'gemini-2.5-flash';
  return google(id);
}
