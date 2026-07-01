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
