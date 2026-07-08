import type { BoardConfig } from './config';

export type Cell = { value: number | null; prefilled: boolean };
export type Board = Cell[];

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function blockOf(i: number, cols: number, blockCols: number, blockRows: number): number {
  const row = Math.floor(i / cols);
  const col = i % cols;
  const blocksAcross = cols / blockCols;
  return Math.floor(row / blockRows) * blocksAcross + Math.floor(col / blockCols);
}

export function generatePuzzle(config: BoardConfig, emptyCells: number): Board {
  const { cols, rows, blockCols, blockRows, symbols, constraints } = config;
  const total = cols * rows;
  const solution: number[] = new Array(total).fill(0);

  function isValid(pos: number, val: number): boolean {
    const row = Math.floor(pos / cols);
    const col = pos % cols;
    const block = blockOf(pos, cols, blockCols, blockRows);
    for (let j = 0; j < pos; j++) {
      const v = solution[j];
      if (blockOf(j, cols, blockCols, blockRows) === block && v === val) return false;
      if (constraints.rows && Math.floor(j / cols) === row && v === val) return false;
      if (constraints.cols && j % cols === col && v === val) return false;
    }
    return true;
  }

  function solve(pos: number): boolean {
    if (pos === total) return true;
    const candidates = shuffle(Array.from({ length: symbols }, (_, i) => i + 1));
    for (const val of candidates) {
      if (isValid(pos, val)) {
        solution[pos] = val;
        if (solve(pos + 1)) return true;
        solution[pos] = 0;
      }
    }
    return false;
  }

  if (!solve(0)) throw new Error(`unsolvable board: ${config.id}`);

  const board: Board = solution.map((v) => ({ value: v, prefilled: true }));

  const indices = shuffle(Array.from({ length: total }, (_, i) => i)).slice(0, emptyCells);
  for (const i of indices) {
    board[i] = { value: null, prefilled: false };
  }

  return board;
}

export function isComplete(board: Board, config: BoardConfig): boolean {
  const { cols, rows, blockCols, blockRows, symbols, constraints } = config;
  const total = cols * rows;
  const blocksAcross = cols / blockCols;
  const totalBlocks = (rows / blockRows) * blocksAcross;

  if (board.some((c) => c.value === null)) return false;

  // Each block must contain `symbols` distinct values.
  for (let b = 0; b < totalBlocks; b++) {
    const vals = new Set<number>();
    for (let i = 0; i < total; i++) {
      if (blockOf(i, cols, blockCols, blockRows) === b) vals.add(board[i].value as number);
    }
    if (vals.size !== symbols) return false;
  }

  // Each row must have distinct values (when constraint is active).
  if (constraints.rows) {
    for (let r = 0; r < rows; r++) {
      const vals = new Set<number>();
      for (let c = 0; c < cols; c++) {
        vals.add(board[r * cols + c].value as number);
      }
      if (vals.size !== cols) return false;
    }
  }

  // Each column must have distinct values (when constraint is active).
  if (constraints.cols) {
    for (let c = 0; c < cols; c++) {
      const vals = new Set<number>();
      for (let r = 0; r < rows; r++) {
        vals.add(board[r * cols + c].value as number);
      }
      if (vals.size !== rows) return false;
    }
  }

  return true;
}

export function toBlocks(board: Board, config: BoardConfig): { index: number; cell: Cell }[][] {
  const { cols, rows, blockCols, blockRows } = config;
  const total = cols * rows;
  const blocksAcross = cols / blockCols;
  const totalBlocks = (rows / blockRows) * blocksAcross;

  const blocks: { index: number; cell: Cell }[][] = Array.from({ length: totalBlocks }, () => []);

  for (let i = 0; i < total; i++) {
    const b = blockOf(i, cols, blockCols, blockRows);
    blocks[b].push({ index: i, cell: board[i] });
  }

  return blocks;
}

// First editable, empty cell in row-major order, or null if the board is full.
export function firstEmptyIndex(board: Board): number | null {
  for (let i = 0; i < board.length; i++) if (board[i].value === null) return i;
  return null;
}

// Next empty cell strictly after `from` in row-major order, wrapping around
// to the start. Null if no empty cell remains.
export function nextEmptyIndex(board: Board, from: number): number | null {
  const n = board.length;
  for (let step = 1; step <= n; step++) {
    const i = (from + step) % n;
    if (board[i].value === null) return i;
  }
  return null;
}

// Two cells are peers when they share a row, column, or block — the units a
// value must be unique within. Single source of truth for both conflict checks.
function arePeers(a: number, b: number, config: BoardConfig): boolean {
  const { cols, blockCols, blockRows } = config;
  const sameRow = Math.floor(a / cols) === Math.floor(b / cols);
  const sameCol = a % cols === b % cols;
  const sameBlock =
    blockOf(a, cols, blockCols, blockRows) === blockOf(b, cols, blockCols, blockRows);
  return sameRow || sameCol || sameBlock;
}

// True if the value at `index` duplicates a peer in the same row, col, or block.
// Targeted O(n) check — mirrors findConflicts' comparison so behavior matches
// the conflict highlight exactly.
export function conflictsAt(board: Board, index: number, config: BoardConfig): boolean {
  const v = board[index].value;
  if (v === null) return false;
  for (let j = 0; j < board.length; j++) {
    if (j === index || board[j].value !== v) continue;
    if (arePeers(index, j, config)) return true;
  }
  return false;
}

export function findConflicts(board: Board, config: BoardConfig): Set<number> {
  const conflicts = new Set<number>();
  for (let i = 0; i < board.length; i++) {
    const v = board[i].value;
    if (v === null) continue;
    for (let j = i + 1; j < board.length; j++) {
      if (board[j].value !== v) continue;
      if (arePeers(i, j, config)) { conflicts.add(i); conflicts.add(j); }
    }
  }
  return conflicts;
}
