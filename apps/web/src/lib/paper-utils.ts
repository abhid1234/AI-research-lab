/**
 * Safely coerce any value to a string. Useful for rendering potentially-object values.
 */
export function safeString(val: any): string {
  if (typeof val === 'string') return val;
  if (val == null) return '';
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (typeof val === 'object') {
    return typeof val.title === 'string' ? val.title
      : typeof val.id === 'string' ? val.id
      : typeof val.name === 'string' ? val.name
      : '';
  }
  return '';
}

/**
 * Build a URL to view a paper. Prefers arxiv, falls back to Google Scholar.
 */
export function paperLink(id: string | undefined, title?: string): string {
  if (!id) return title ? `https://scholar.google.com/scholar?q=${encodeURIComponent(title)}` : '#';
  if (id.includes('arxiv.org')) return id;
  if (id.includes('.') || id.includes('/')) return `https://arxiv.org/abs/${id}`;
  return `https://scholar.google.com/scholar?q=${encodeURIComponent(title ?? id)}`;
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
