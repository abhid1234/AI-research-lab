import { embedMany, gateway } from 'ai';

/**
 * Embed an array of text chunks using the Vercel AI Gateway.
 *
 * Authentication is handled automatically via:
 *   1. AI_GATEWAY_API_KEY env var (static key / CI)
 *   2. VERCEL_OIDC_TOKEN (set via `vercel env pull .env.local`)
 *
 * Set EMBEDDING_MODEL to override the default model string (provider/model).
 * Default: openai/text-embedding-3-small (1536 dimensions — matches pgvector schema).
 */
export async function embedChunks(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const modelString =
    process.env.EMBEDDING_MODEL ?? 'openai/text-embedding-3-small';

  const model = gateway.embeddingModel(modelString);

  const results: number[][] = [];
  const batchSize = 100;

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const { embeddings } = await embedMany({ model, values: batch });
    results.push(...embeddings);
  }

  return results;
}
