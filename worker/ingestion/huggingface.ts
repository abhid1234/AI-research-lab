export interface HFPaper {
  arxivId: string;
  title: string;
  upvotes: number;
  publishedAt: string;
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export async function fetchHFDailyPapers(opts: {
  daysBack?: number;
  minUpvotes?: number;
}): Promise<HFPaper[]> {
  const daysBack = opts.daysBack ?? 30;
  const minUpvotes = opts.minUpvotes ?? 20;
  const results: HFPaper[] = [];

  for (let i = 0; i < daysBack; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const url = `https://huggingface.co/api/daily_papers?date=${dateStr}`;

    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = (await res.json()) as Array<{
        paper?: { id?: string; title?: string; upvotes?: number };
        publishedAt?: string;
      }>;

      for (const item of data) {
        const arxivId = item.paper?.id ?? '';
        const upvotes = item.paper?.upvotes ?? 0;
        if (arxivId && upvotes >= minUpvotes) {
          results.push({
            arxivId,
            title: item.paper?.title ?? '',
            upvotes,
            publishedAt: item.publishedAt ?? dateStr,
          });
        }
      }
    } catch {
      // skip days that error
    }
    await sleep(500);
  }

  // Dedupe by arxivId, keep highest upvotes
  const map = new Map<string, HFPaper>();
  for (const p of results) {
    const existing = map.get(p.arxivId);
    if (!existing || p.upvotes > existing.upvotes) map.set(p.arxivId, p);
  }

  return Array.from(map.values()).sort((a, b) => b.upvotes - a.upvotes);
}
