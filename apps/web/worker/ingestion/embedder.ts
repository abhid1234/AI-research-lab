import { embedMany } from 'ai';
import { google } from '@ai-sdk/google';

/**
 * Embed an array of text chunks using Google Gemini embedding API.
 *
 * Requires GOOGLE_GENERATIVE_AI_API_KEY env var.
 * Model: text-embedding-004 (768 dimensions — matches pgvector schema).
 * Free tier: 1500 requests/min.
 */
export async function embedChunks(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const model = google.textEmbeddingModel('gemini-embedding-001');

  const results: number[][] = [];
  const batchSize = 100;

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const { embeddings } = await embedMany({ model, values: batch });
    // Truncate from 3072 to 768 dims (Matryoshka representation — first N dims are most informative)
    results.push(...embeddings.map(e => e.slice(0, 768)));
  }

  return results;
}
