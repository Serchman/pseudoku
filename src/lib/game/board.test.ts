import { describe, it, expect } from 'vitest';
import { generatePuzzle, isComplete, type Board } from './board';
import { BOARD_SIZE, EMPTY_CELLS } from './config';

describe('generatePuzzle', () => {
  it('returns a board of BOARD_SIZE cells', () => {
    expect(generatePuzzle()).toHaveLength(BOARD_SIZE);
  });

  it('leaves exactly EMPTY_CELLS empty, non-prefilled cells', () => {
    const board = generatePuzzle();
    const empty = board.filter((c) => c.value === null);
    expect(empty).toHaveLength(EMPTY_CELLS);
    expect(empty.every((c) => c.prefilled === false)).toBe(true);
  });

  it('leaves exactly the requested number of empty cells for n = 3, 5, 7', () => {
    for (const n of [3, 5, 7]) {
      const board = generatePuzzle(n);
      const empty = board.filter((c) => c.value === null);
      expect(empty).toHaveLength(n);
      expect(empty.every((c) => c.prefilled === false)).toBe(true);
    }
  });

  it('prefilled cells hold distinct numbers within 1..BOARD_SIZE', () => {
    const board = generatePuzzle();
    const filled = board.filter((c) => c.value !== null);
    expect(filled.every((c) => c.prefilled === true)).toBe(true);
    const values = filled.map((c) => c.value);
    expect(new Set(values).size).toBe(values.length);
    expect(values.every((v) => v! >= 1 && v! <= BOARD_SIZE)).toBe(true);
  });
});

describe('isComplete', () => {
  function fullDistinct(): Board {
    return Array.from({ length: BOARD_SIZE }, (_, i) => ({
      value: i + 1,
      prefilled: false,
    }));
  }

  it('is true when full and all values distinct', () => {
    expect(isComplete(fullDistinct())).toBe(true);
  });

  it('is false when a cell is empty', () => {
    const board = fullDistinct();
    board[0] = { value: null, prefilled: false };
    expect(isComplete(board)).toBe(false);
  });

  it('is false when full but a value is duplicated', () => {
    const board = fullDistinct();
    board[0] = { value: board[1].value, prefilled: false };
    expect(isComplete(board)).toBe(false);
  });
});
