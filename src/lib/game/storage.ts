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
