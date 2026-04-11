const BASE_URL = 'https://api.semanticscholar.org/graph/v1';

export interface SemanticScholarPaper {
  paperId: string;
  externalIds?: { ArXiv?: string };
  title: string;
  abstract: string | null;
  authors: { name: string; affiliations?: string[] }[];
  venue?: string;
  year?: number;
  citationCount?: number;
  fieldsOfStudy?: string[];
  publicationDate?: string; // YYYY-MM-DD
}

const SEARCH_FIELDS =
  'paperId,externalIds,title,abstract,authors,venue,year,citationCount,fieldsOfStudy,publicationDate';
const DETAIL_FIELDS =
  'paperId,externalIds,title,abstract,authors,venue,year,citationCount,fieldsOfStudy,publicationDate,references,citations';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, attempt = 0): Promise<Response> {
  const res = await fetch(url);

  if (res.status === 429) {
    const wait = 10000 + attempt * 5000; // 10s, 15s, 20s, 25s, 30s
    console.warn(`[semantic-scholar] Rate limited (429). Waiting ${wait/1000}s before retry ${attempt + 1}/5...`);
    await sleep(wait);
    if (attempt >= 5) throw new Error(`Rate limited after ${attempt} retries: ${url}`);
    return fetchWithRetry(url, attempt + 1);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Semantic Scholar API error ${res.status} for ${url}: ${body}`);
  }

  return res;
}

export async function searchPapers(
  query: string,
  limit: number,
): Promise<SemanticScholarPaper[]> {
  await sleep(3000); // Respect rate limits — 3s between requests for safety

  const url = `${BASE_URL}/paper/search?query=${encodeURIComponent(query)}&limit=${limit}&fields=${SEARCH_FIELDS}`;
  const res = await fetchWithRetry(url);
  const json = (await res.json()) as { data: SemanticScholarPaper[] };

  return json.data ?? [];
}

export async function getPaperDetails(paperId: string): Promise<SemanticScholarPaper> {
  await sleep(1100);

  const url = `${BASE_URL}/paper/${encodeURIComponent(paperId)}?fields=${DETAIL_FIELDS}`;
  const res = await fetchWithRetry(url);
  return res.json() as Promise<SemanticScholarPaper>;
}
