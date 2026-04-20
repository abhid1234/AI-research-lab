const STORAGE_KEY = 'reading-lists';

export interface ReadingList {
  id: string;
  name: string;
  paperIds: string[];
  createdAt: string;
}

function getAll(): ReadingList[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function saveAll(lists: ReadingList[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
}

export function getReadingLists(): ReadingList[] {
  return getAll();
}

export function createReadingList(name: string): ReadingList {
  const lists = getAll();
  const newList: ReadingList = {
    id: crypto.randomUUID(),
    name,
    paperIds: [],
    createdAt: new Date().toISOString(),
  };
  lists.push(newList);
  saveAll(lists);
  return newList;
}

export function deleteReadingList(id: string): void {
  const lists = getAll().filter(l => l.id !== id);
  saveAll(lists);
}

export function addPaperToList(listId: string, paperId: string): void {
  const lists = getAll();
  const list = lists.find(l => l.id === listId);
  if (list && !list.paperIds.includes(paperId)) {
    list.paperIds.push(paperId);
    saveAll(lists);
  }
}

export function removePaperFromList(listId: string, paperId: string): void {
  const lists = getAll();
  const list = lists.find(l => l.id === listId);
  if (list) {
    list.paperIds = list.paperIds.filter(id => id !== paperId);
    saveAll(lists);
  }
}

export function getListsContainingPaper(paperId: string): ReadingList[] {
  return getAll().filter(l => l.paperIds.includes(paperId));
}
