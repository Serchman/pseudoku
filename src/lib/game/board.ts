import { BOARD_SIZE, EMPTY_CELLS } from './config';

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

export function generatePuzzle(emptyCells: number = EMPTY_CELLS): Board {
  const numbers = shuffle(
    Array.from({ length: BOARD_SIZE }, (_, i) => i + 1),
  );
  const board: Board = numbers.map((value) => ({ value, prefilled: true }));

  const indices = shuffle(
    Array.from({ length: BOARD_SIZE }, (_, i) => i),
  ).slice(0, emptyCells);

  for (const i of indices) {
    board[i] = { value: null, prefilled: false };
  }
  return board;
}

export function isComplete(board: Board): boolean {
  const values = board.map((c) => c.value);
  if (values.some((v) => v === null)) return false;
  return new Set(values).size === BOARD_SIZE;
}
