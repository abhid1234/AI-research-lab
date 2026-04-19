export interface PWCPaper {
  arxivId: string;
  hasCode: boolean;
  githubStars?: number;
}

export async function fetchPapersWithCode(opts: {
  yearStart: number;
  limit?: number;
}): Promise<Map<string, PWCPaper>> {
  const limit = opts.limit ?? 500;
  const map = new Map<string, PWCPaper>();
  let page = 1;

  while (map.size < limit && page <= 10) {
    const url = `https://paperswithcode.com/api/v1/papers/?ordering=-published&page=${page}&items_per_page=50`;
    try {
      const res = await fetch(url);
      if (!res.ok) break;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (await res.json()) as { results?: any[]; next?: string };
      if (!data.results || data.results.length === 0) break;
      for (const p of data.results) {
        const arxivId = typeof p.arxiv_id === 'string' ? p.arxiv_id : '';
        const pubDate =
          typeof p.published === 'string' ? new Date(p.published) : null;
        if (arxivId && pubDate && pubDate.getFullYear() >= opts.yearStart) {
          map.set(arxivId, { arxivId, hasCode: true });
        }
      }
      if (!data.next) break;
      page++;
      await new Promise((r) => setTimeout(r, 1000));
    } catch {
      break;
    }
  }

  return map;
}
