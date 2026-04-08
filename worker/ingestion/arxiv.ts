export function getArxivPdfUrl(arxivId: string): string {
  return `https://arxiv.org/pdf/${arxivId}`;
}

export function getArxivAbsUrl(arxivId: string): string {
  return `https://arxiv.org/abs/${arxivId}`;
}
