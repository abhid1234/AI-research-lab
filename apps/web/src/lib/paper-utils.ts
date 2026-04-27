/**
 * Safely coerce any value to a string. Useful for rendering potentially-object values.
 * Checks common text fields before falling back to JSON.
 */
export function safeString(val: any): string {
  if (typeof val === 'string') return val;
  if (val == null) return '';
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (typeof val === 'object') {
    // Check common text-bearing fields in priority order
    if (typeof val.text === 'string') return val.text;
    if (typeof val.statement === 'string') return val.statement;
    if (typeof val.title === 'string') return val.title;
    if (typeof val.name === 'string') return val.name;
    if (typeof val.finding === 'string') return val.finding;
    if (typeof val.question === 'string') return val.question;
    if (typeof val.id === 'string') return val.id;
    // Last resort: truncated JSON so we never render "[object Object]"
    try { return JSON.stringify(val).slice(0, 120); } catch { return ''; }
  }
  return String(val);
}

/**
 * Arxiv id shape: `2304.07193`, `2304.07193v2`, or legacy `cs/0001234`,
 * `math.GT/0309136`. 40-char S2 SHA-1 hashes and free text are not directly
 * resolvable to an arxiv abstract page.
 */
export function isArxivId(id: string | undefined | null): boolean {
  if (!id) return false;
  if (/^\d{4}\.\d{4,5}(v\d+)?$/.test(id)) return true;
  if (/^[a-z\-]+(\.[A-Z]{2})?\/\d{7}(v\d+)?$/.test(id)) return true;
  return false;
}

/**
 * Build a direct arxiv URL for a paper. Returns '' when no real arxiv id is
 * available — callers must treat empty-string as "do not render as a link"
 * (we never link to Google Scholar, search pages, or other indirections).
 */
export function paperLink(id: string | undefined, _title?: string): string {
  if (!id) return '';
  if (id.includes('arxiv.org')) return id;
  if (isArxivId(id)) return `https://arxiv.org/abs/${id}`;
  return '';
}

/**
 * Resolve the best direct arxiv URL for a paper-shaped object by checking the
 * canonical `arxivId` field first, then `paperId` / `id` fallbacks (some
 * upstreams stuff the arxiv id into one of those instead).
 */
export function arxivUrlFor(paper: any): string {
  const arxiv = typeof paper?.arxivId === 'string' ? paper.arxivId
              : typeof paper?.arxiv_id === 'string' ? paper.arxiv_id
              : '';
  if (arxiv && isArxivId(arxiv)) return `https://arxiv.org/abs/${arxiv}`;
  const fallback = typeof paper?.paperId === 'string' ? paper.paperId
                : typeof paper?.id === 'string' ? paper.id
                : '';
  if (fallback && isArxivId(fallback)) return `https://arxiv.org/abs/${fallback}`;
  return '';
}

/**
 * Extract paper ID from a paper-shaped object (checking multiple common field names).
 */
export function extractPaperId(p: any): string {
  if (typeof p?.paperId === 'string') return p.paperId;
  if (typeof p?.arxivId === 'string') return p.arxivId;
  if (typeof p?.arxiv_id === 'string') return p.arxiv_id;
  if (typeof p?.id === 'string') return p.id;
  return '';
}

/**
 * Extract paper title from a paper-shaped object.
 */
export function extractPaperTitle(p: any): string {
  return typeof p?.title === 'string' ? p.title : safeString(p);
}
