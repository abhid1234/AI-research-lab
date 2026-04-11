// Simple localStorage-based voting (no backend needed for v1)
const STORAGE_KEY = 'paper-votes';

export function getVotes(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

export function upvotePaper(paperId: string): number {
  const votes = getVotes();
  votes[paperId] = (votes[paperId] ?? 0) + 1;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(votes));
  return votes[paperId];
}

export function getVoteCount(paperId: string): number {
  return getVotes()[paperId] ?? 0;
}
