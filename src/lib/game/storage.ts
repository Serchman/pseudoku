const KEY = 'sudoku-incremental:pointokus';

export function loadPointokus(): number {
  const raw = localStorage.getItem(KEY);
  if (raw === null) return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

export function savePointokus(value: number): void {
  localStorage.setItem(KEY, String(value));
}

const UNLOCKS_KEY = 'sudoku-incremental:unlocks';

export function loadUnlocks(): string[] {
  const raw = localStorage.getItem(UNLOCKS_KEY);
  if (raw === null) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function saveUnlocks(ids: string[]): void {
  localStorage.setItem(UNLOCKS_KEY, JSON.stringify(ids));
}

// Per-board difficulty tiers. Easy ('easy') is always owned/selected by default.
function tiersKey(boardId: string): string {
  return `sudoku-incremental:tiers:${boardId}`;
}

function selectedTierKey(boardId: string): string {
  return `sudoku-incremental:tier-selected:${boardId}`;
}

export function loadOwnedTiers(boardId: string): string[] {
  const raw = localStorage.getItem(tiersKey(boardId));
  if (raw === null) return ['easy'];
  try {
    const parsed = JSON.parse(raw);
    const ids = Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === 'string')
      : [];
    return ids.includes('easy') ? ids : ['easy', ...ids];
  } catch {
    return ['easy'];
  }
}

export function saveOwnedTiers(boardId: string, ids: string[]): void {
  localStorage.setItem(tiersKey(boardId), JSON.stringify(ids));
}

export function loadSelectedTier(boardId: string): string {
  const raw = localStorage.getItem(selectedTierKey(boardId));
  return raw === null ? 'easy' : raw;
}

export function saveSelectedTier(boardId: string, id: string): void {
  localStorage.setItem(selectedTierKey(boardId), id);
}
