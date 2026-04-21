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
