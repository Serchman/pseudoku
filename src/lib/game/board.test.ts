import { describe, it, expect } from 'vitest';
import { generatePuzzle, isComplete, toBlocks, findConflicts, type Board } from './board';
import { BOARDS, BOARD_SIZE, EMPTY_CELLS } from './config';

describe('generatePuzzle (default board)', () => {
  it('returns a board of BOARD_SIZE cells', () => {
    expect(generatePuzzle(BOARDS.default, EMPTY_CELLS)).toHaveLength(BOARD_SIZE);
  });

  it('leaves exactly EMPTY_CELLS empty, non-prefilled cells', () => {
    const board = generatePuzzle(BOARDS.default, EMPTY_CELLS);
    const empty = board.filter((c) => c.value === null);
    expect(empty).toHaveLength(EMPTY_CELLS);
    expect(empty.every((c) => c.prefilled === false)).toBe(true);
  });

  it('leaves exactly the requested number of empty cells for n = 3, 5, 7', () => {
    for (const n of [3, 5, 7]) {
      const board = generatePuzzle(BOARDS.default, n);
      const empty = board.filter((c) => c.value === null);
      expect(empty).toHaveLength(n);
      expect(empty.every((c) => c.prefilled === false)).toBe(true);
    }
  });

  it('prefilled cells hold distinct numbers within 1..BOARD_SIZE', () => {
    const board = generatePuzzle(BOARDS.default, EMPTY_CELLS);
    const filled = board.filter((c) => c.value !== null);
    expect(filled.every((c) => c.prefilled === true)).toBe(true);
    const values = filled.map((c) => c.value);
    expect(new Set(values).size).toBe(values.length);
    expect(values.every((v) => v! >= 1 && v! <= BOARD_SIZE)).toBe(true);
  });
});

describe('isComplete (default board)', () => {
  function fullDistinct(): Board {
    return Array.from({ length: BOARD_SIZE }, (_, i) => ({
      value: i + 1,
      prefilled: false,
    }));
  }

  it('is true when full and all values distinct', () => {
    expect(isComplete(fullDistinct(), BOARDS.default)).toBe(true);
  });

  it('is false when a cell is empty', () => {
    const board = fullDistinct();
    board[0] = { value: null, prefilled: false };
    expect(isComplete(board, BOARDS.default)).toBe(false);
  });

  it('is false when full but a value is duplicated', () => {
    const board = fullDistinct();
    board[0] = { value: board[1].value, prefilled: false };
    expect(isComplete(board, BOARDS.default)).toBe(false);
  });
});

describe('board6x3', () => {
  it('isComplete recognizes a full 6×3 solution as complete', () => {
    expect(isComplete(generatePuzzle(BOARDS.board6x3, 0), BOARDS.board6x3)).toBe(true);
  });

  it('generatePuzzle yields a full solution with 9 distinct values per block and distinct rows', () => {
    const board = generatePuzzle(BOARDS.board6x3, 0);
    expect(board).toHaveLength(18);

    // Each block must have 9 distinct values 1..9
    const blocks = toBlocks(board, BOARDS.board6x3);
    for (const block of blocks) {
      const vals = new Set(block.map(({ cell }) => cell.value));
      expect(vals.size).toBe(9);
      expect([...vals].every((v) => v! >= 1 && v! <= 9)).toBe(true);
    }

    // Every 6-cell row must have distinct values
    for (let r = 0; r < 3; r++) {
      const rowVals = new Set<number | null>();
      for (let c = 0; c < 6; c++) {
        rowVals.add(board[r * 6 + c].value);
      }
      expect(rowVals.size).toBe(6);
    }
  });

  it('isComplete is false when a row repeats even though each block is individually valid', () => {
    // Block 0 (cells 0,1,2,6,7,8,12,13,14) gets values 1..9 in order.
    // Block 1 (cells 3,4,5,9,10,11,15,16,17) also gets values 1..9 in order.
    // Row 0 = [cell0=1, cell1=2, cell2=3, cell3=1, cell4=2, cell5=3] → repeats 1,2,3.
    // Each block is individually valid, but the row constraint is violated.
    const board: Board = Array(18)
      .fill(null)
      .map(() => ({ value: null, prefilled: false }));
    [0, 1, 2, 6, 7, 8, 12, 13, 14].forEach((idx, i) => {
      board[idx] = { value: i + 1, prefilled: false };
    });
    [3, 4, 5, 9, 10, 11, 15, 16, 17].forEach((idx, i) => {
      board[idx] = { value: i + 1, prefilled: false };
    });
    expect(isComplete(board, BOARDS.board6x3)).toBe(false);
  });

  it('toBlocks returns 2 blocks of 9, covering indices 0..17 exactly once', () => {
    const board = generatePuzzle(BOARDS.board6x3, 0);
    const blocks = toBlocks(board, BOARDS.board6x3);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toHaveLength(9);
    expect(blocks[1]).toHaveLength(9);
    const allIndices = blocks.flat().map(({ index }) => index);
    expect(allIndices.sort((a, b) => a - b)).toEqual(Array.from({ length: 18 }, (_, i) => i));
  });
});

describe('findConflicts', () => {
  function emptyBoard(size: number): Board {
    return Array(size)
      .fill(null)
      .map(() => ({ value: null, prefilled: false }));
  }

  it('returns empty set when no duplicates exist', () => {
    const board = emptyBoard(9);
    board[0] = { value: 1, prefilled: false };
    board[1] = { value: 2, prefilled: false };
    board[2] = { value: 3, prefilled: false };
    expect(findConflicts(board, BOARDS.default)).toEqual(new Set());
  });

  it('returns empty set for a board full of null cells', () => {
    const board = emptyBoard(9);
    expect(findConflicts(board, BOARDS.default)).toEqual(new Set());
  });

  it('detects row duplicates and returns both indices', () => {
    // board6x3: 6 cols, 3 rows; row 0 is indices 0-5
    const board = emptyBoard(18);
    board[0] = { value: 1, prefilled: false };
    board[3] = { value: 1, prefilled: false }; // same row, different block
    const conflicts = findConflicts(board, BOARDS.board6x3);
    expect(conflicts).toEqual(new Set([0, 3]));
  });

  it('detects column duplicates and returns both indices', () => {
    // board6x3: column 0 is indices 0, 6, 12
    const board = emptyBoard(18);
    board[0] = { value: 2, prefilled: false };
    board[6] = { value: 2, prefilled: false }; // same column
    const conflicts = findConflicts(board, BOARDS.board6x3);
    expect(conflicts).toEqual(new Set([0, 6]));
  });

  it('detects block (box) duplicates and returns both indices', () => {
    // board6x3: block 0 is indices 0,1,2,6,7,8,12,13,14
    // 0 = row 0, col 0; 7 = row 1, col 1 — same block, but different row and column,
    // so this genuinely isolates the sameBlock branch.
    const board = emptyBoard(18);
    board[0] = { value: 3, prefilled: false };
    board[7] = { value: 3, prefilled: false }; // same block, different row and column
    const conflicts = findConflicts(board, BOARDS.board6x3);
    expect(conflicts).toEqual(new Set([0, 7]));
  });

  it('detects three-way duplicates within a unit and returns all three indices', () => {
    // board6x3: row 0 is indices 0-5
    const board = emptyBoard(18);
    board[0] = { value: 4, prefilled: false };
    board[2] = { value: 4, prefilled: false }; // same row as 0
    board[4] = { value: 4, prefilled: false }; // same row as 0 and 2
    const conflicts = findConflicts(board, BOARDS.board6x3);
    expect(conflicts).toEqual(new Set([0, 2, 4]));
  });

  it('ignores null cells in conflict detection', () => {
    // board6x3: row 0 is indices 0-5
    const board = emptyBoard(18);
    board[0] = { value: 5, prefilled: false };
    board[1] = { value: null, prefilled: false }; // null, ignored
    board[2] = { value: 5, prefilled: false }; // duplicate of 0
    const conflicts = findConflicts(board, BOARDS.board6x3);
    expect(conflicts).toEqual(new Set([0, 2]));
  });
});
