export interface ChunkResult {
  content: string;
  chunkIndex: number;
}

/**
 * Split text into segments using a separator. Returns segments that are non-empty after trimming.
 */
function splitBy(text: string, separator: string): string[] {
  return text.split(separator).filter((s) => s.trim().length > 0);
}

/**
 * Recursively split a single segment until all pieces fit within chunkSize chars.
 * Splitting priority: double newlines → single newlines → sentences → hard boundary.
 */
function splitSegment(text: string, chunkSize: number): string[] {
  if (text.length <= chunkSize) return [text];

  const strategies = ['\n\n', '\n', '. '];
  for (const sep of strategies) {
    const parts = splitBy(text, sep);
    if (parts.length > 1) {
      const result: string[] = [];
      let current = '';
      for (const part of parts) {
        const candidate = current ? `${current}${sep}${part}` : part;
        if (candidate.length <= chunkSize) {
          current = candidate;
        } else {
          if (current) result.push(current);
          // Part itself might be too big — recurse
          if (part.length > chunkSize) {
            result.push(...splitSegment(part, chunkSize));
            current = '';
          } else {
            current = part;
          }
        }
      }
      if (current) result.push(current);
      return result;
    }
  }

  // Hard split at chunkSize boundary
  const pieces: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    pieces.push(text.slice(i, i + chunkSize));
  }
  return pieces;
}

export function chunkText(
  text: string,
  options?: { chunkSize?: number; overlap?: number },
): ChunkResult[] {
  const chunkSize = (options?.chunkSize ?? 512) * 4; // tokens → chars
  const overlap = (options?.overlap ?? 50) * 4;

  const segments = splitSegment(text.trim(), chunkSize);

  const chunks: ChunkResult[] = [];
  let chunkIndex = 0;

  for (let i = 0; i < segments.length; i++) {
    let content = segments[i];

    // Prepend overlap from previous chunk
    if (i > 0 && overlap > 0) {
      const prev = segments[i - 1];
      const tail = prev.slice(Math.max(0, prev.length - overlap));
      content = tail + ' ' + content;
    }

    chunks.push({ content: content.trim(), chunkIndex: chunkIndex++ });
  }

  return chunks;
}
