import { NextResponse } from 'next/server';
import { embedMany } from 'ai';
import { google } from '@ai-sdk/google';
import { vectorSearch } from '@research-lab/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q');
  const topicId = searchParams.get('topicId') ?? undefined;
  const limit = parseInt(searchParams.get('limit') ?? '10', 10);

  if (!query || query.trim().length === 0) {
    return NextResponse.json({ results: [] });
  }

  try {
    // Embed the query using Gemini (same model as ingestion pipeline)
    const model = google.textEmbeddingModel('gemini-embedding-001');
    const { embeddings } = await embedMany({ model, values: [query] });
    // Truncate from 3072 to 768 dims (Matryoshka representation — same as embedder.ts)
    const queryEmbedding = embeddings[0].slice(0, 768);

    // Vector search
    const results = await vectorSearch(queryEmbedding, { limit, topicId });

    return NextResponse.json({
      results: results.map((r) => ({
        paperId: r.paperId,
        paper: r.paper,
        content: r.content,
        distance: r.distance,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Search failed', details: String(error) },
      { status: 500 },
    );
  }
}
