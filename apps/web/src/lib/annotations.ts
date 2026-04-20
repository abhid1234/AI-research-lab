const STORAGE_KEY = 'paper-annotations';

export interface Annotation {
  id: string;
  paperId: string;
  text: string;
  createdAt: string; // ISO date
}

function getAll(): Record<string, Annotation[]> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function saveAll(data: Record<string, Annotation[]>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getAnnotations(paperId: string): Annotation[] {
  return getAll()[paperId] ?? [];
}

export function addAnnotation(paperId: string, text: string): Annotation {
  const all = getAll();
  const annotation: Annotation = {
    id: crypto.randomUUID(),
    paperId,
    text,
    createdAt: new Date().toISOString(),
  };
  all[paperId] = [...(all[paperId] ?? []), annotation];
  saveAll(all);
  return annotation;
}

export function removeAnnotation(paperId: string, annotationId: string): void {
  const all = getAll();
  if (!all[paperId]) return;
  all[paperId] = all[paperId].filter(a => a.id !== annotationId);
  saveAll(all);
}

export function getAllAnnotations(): Annotation[] {
  const all = getAll();
  return Object.values(all).flat();
}
