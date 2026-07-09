// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { createGame } from './state.svelte';
import { firstEmptyIndex, nextEmptyIndex } from './board';

describe('difficulty tiers in game state', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('buyTier deducts pointokus, marks the tier owned, and persists', () => {
    localStorage.setItem('sudoku-incremental:pointokus', '135');
    const game = createGame();

    game.buyTier('medium');

    expect(game.pointokus).toBe(10); // 135 - 125
    expect(game.tiers.find((t) => t.id === 'medium')!.owned).toBe(true);
    expect(loadJson('sudoku-incremental:tiers:default')).toContain('medium');
    expect(Number(localStorage.getItem('sudoku-incremental:pointokus'))).toBe(10);
  });

  it('buyTier enforces sequential order (cannot skip to hard)', () => {
    localStorage.setItem('sudoku-incremental:pointokus', '1000');
    const game = createGame();

    game.buyTier('hard');

    expect(game.tiers.find((t) => t.id === 'hard')!.owned).toBe(false);
    expect(game.pointokus).toBe(1000); // unchanged
  });

  it('selectTier switches the active tier when owned', () => {
    localStorage.setItem('sudoku-incremental:tiers:default', JSON.stringify(['easy', 'medium']));
    const game = createGame();

    game.selectTier('medium');

    expect(game.selectedTier.id).toBe('medium');
    expect(localStorage.getItem('sudoku-incremental:tier-selected:default')).toBe('medium');
  });

  it('selectTier is blocked while a solve is in progress', () => {
    localStorage.setItem('sudoku-incremental:tiers:default', JSON.stringify(['easy', 'medium']));
    const game = createGame();

    game.start(); // status -> playing
    game.selectTier('medium');

    expect(game.selectedTier.id).toBe('easy'); // unchanged mid-play
    game.resetAll(); // stop the timer
  });

  it("start() generates a board with the selected tier's empty-cell count", () => {
    localStorage.setItem('sudoku-incremental:tiers:default', JSON.stringify(['easy', 'medium']));
    localStorage.setItem('sudoku-incremental:tier-selected:default', 'medium');
    const game = createGame();

    game.start();

    expect(game.editableCount).toBe(5); // medium = 5 empty cells
    game.resetAll();
  });
});

describe('board selection and purchasing', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('buyBoard with ≥430 points: deducts 430, marks owned, persists, and auto-selects', () => {
    localStorage.setItem('sudoku-incremental:pointokus', '600');
    const game = createGame();

    game.buyBoard('board6x3');

    expect(game.pointokus).toBe(170); // 600 - 430
    expect(game.boards.find((b) => b.id === 'board6x3')!.owned).toBe(true);
    expect(loadJson('sudoku-incremental:owned-boards')).toContain('board6x3');
    expect(Number(localStorage.getItem('sudoku-incremental:pointokus'))).toBe(170);
    expect(game.activeBoard.id).toBe('board6x3');
  });

  it('buyBoard with <430 points: no-op (unchanged points, not owned, default active)', () => {
    localStorage.setItem('sudoku-incremental:pointokus', '429');
    const game = createGame();

    game.buyBoard('board6x3');

    expect(game.pointokus).toBe(429);
    expect(game.boards.find((b) => b.id === 'board6x3')!.owned).toBe(false);
    expect(game.activeBoard.id).toBe('default');
  });

  it('buyBoard is idempotent for an already-owned board', () => {
    localStorage.setItem('sudoku-incremental:pointokus', '600');
    const game = createGame();

    game.buyBoard('default'); // default is cost=0 and already owned

    expect(game.pointokus).toBe(600); // no deduction
    expect(game.activeBoard.id).toBe('default'); // unchanged
  });

  it('buyBoard a second time is a no-op', () => {
    localStorage.setItem('sudoku-incremental:pointokus', '1200');
    const game = createGame();

    game.buyBoard('board6x3'); // -430 → 770
    game.buyBoard('board6x3'); // already owned, no-op

    expect(game.pointokus).toBe(770);
  });

  it('selectBoard swaps per-board tier state and restores on return', () => {
    // Need enough points: board6x3 costs 430, its medium tier costs 1780
    localStorage.setItem('sudoku-incremental:pointokus', '2260');
    const game = createGame();

    game.buyBoard('board6x3');  // -430 → 1830, active=board6x3
    game.buyTier('medium');     // -1780 → 50, medium owned on board6x3
    game.selectTier('medium'); // medium selected on board6x3

    game.selectBoard('default');
    expect(game.selectedTier.id).toBe('easy'); // default's tier is still easy

    game.selectBoard('board6x3');
    expect(game.selectedTier.id).toBe('medium'); // board6x3 tier restored from storage
  });

  it('selectBoard is blocked mid-solve', () => {
    localStorage.setItem('sudoku-incremental:pointokus', '0');
    localStorage.setItem('sudoku-incremental:owned-boards', JSON.stringify(['board6x3']));
    const game = createGame();

    game.start(); // status -> playing on default
    game.selectBoard('board6x3'); // blocked mid-solve

    expect(game.activeBoard.id).toBe('default');
    game.resetAll(); // stop the timer
  });

  it('preserves a solved board across switches; only resetAll clears it', () => {
    localStorage.setItem('sudoku-incremental:pointokus', '500');
    const game = createGame();

    game.buyBoard('board6x3'); // owns board6x3 and auto-selects it (default was idle)
    game.selectBoard('default'); // back to default to solve it
    game.start();
    solveDefault(game);
    expect(game.status).toBe('complete');
    expect(game.boards.find((b) => b.id === 'default')!.done).toBe(true); // chip → done
    const solvedValues = game.board!.map((c) => c.value);

    game.selectBoard('board6x3'); // never played
    expect(game.status).toBe('idle');
    expect(game.boards.find((b) => b.id === 'board6x3')!.done).toBe(false);
    expect(game.boards.find((b) => b.id === 'default')!.done).toBe(true); // stays done

    game.selectBoard('default');
    expect(game.status).toBe('complete'); // state preserved, not wiped by the switch
    expect(game.board!.map((c) => c.value)).toEqual(solvedValues); // same solved grid

    game.resetAll(); // banks points and clears every board's state
    expect(game.status).toBe('idle');
    expect(game.boards.find((b) => b.id === 'default')!.done).toBe(false); // done cleared
    game.selectBoard('board6x3');
    game.selectBoard('default');
    expect(game.status).toBe('idle'); // default's solved state was cleared by resetAll
  });
});

describe('conflict tracking', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('conflicts is empty while idle', () => {
    const game = createGame();

    expect(game.conflicts.size).toBe(0);
  });

  it('conflicts is empty once the board is complete', () => {
    const game = createGame();

    game.start();
    solveDefault(game);

    expect(game.status).toBe('complete');
    expect(game.conflicts.size).toBe(0);
  });

  it('placing a duplicate value while playing populates conflicts and sets lastEntered', () => {
    const game = createGame();
    game.start();

    const emptyIdx = game.board!.findIndex((c) => c.value === null);
    const dupValue = game.board!.find((c) => c.value !== null)!.value!;
    game.select(emptyIdx);
    game.place(dupValue);

    expect(game.conflicts.size).toBeGreaterThan(0);
    expect(game.conflicts.has(emptyIdx)).toBe(true);
    expect(game.lastEntered).toBe(emptyIdx);

    game.resetAll(); // stop the timer
  });

  it('clear() resets lastEntered to null', () => {
    const game = createGame();
    game.start();

    const emptyIdx = game.board!.findIndex((c) => c.value === null);
    const dupValue = game.board!.find((c) => c.value !== null)!.value!;
    game.select(emptyIdx);
    game.place(dupValue);
    expect(game.lastEntered).toBe(emptyIdx);

    game.select(emptyIdx);
    game.clear();

    expect(game.lastEntered).toBe(null);
    game.resetAll(); // stop the timer
  });

  it('lastEntered survives a selectBoard round-trip', () => {
    // selectBoard is blocked mid-solve, so exercise the round-trip via a
    // completed board (same pattern as "preserves a solved board" above).
    localStorage.setItem('sudoku-incremental:pointokus', '600');
    const game = createGame();
    game.buyBoard('board6x3'); // owns board6x3 and auto-selects it (default was idle)
    game.selectBoard('default');
    game.start();
    solveDefault(game);
    expect(game.status).toBe('complete');
    const entered = game.lastEntered;
    expect(entered).not.toBe(null);

    game.selectBoard('board6x3');
    expect(game.lastEntered).toBe(null); // board6x3 was never played

    game.selectBoard('default');
    expect(game.lastEntered).toBe(entered); // restored from snapshot

    game.resetAll(); // stop the timer
  });
});

describe('cursor auto-advance', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('start() auto-selects the first empty cell', () => {
    const game = createGame();

    game.start();

    expect(game.selected).not.toBeNull();
    expect(game.selected).toBe(firstEmptyIndex(game.board!));

    game.resetAll();
  });

  it('a non-conflicting place() advances the cursor to the next empty cell', () => {
    const game = createGame();
    game.start();

    const prevSelected = game.selected!;
    const present = new Set(game.board!.filter((c) => c.value !== null).map((c) => c.value));
    const missing = [1, 2, 3, 4, 5, 6, 7, 8, 9].find((v) => !present.has(v))!;
    const expectedNext = nextEmptyIndex(game.board!, prevSelected);

    game.place(missing);

    expect(game.selected).toBe(expectedNext);

    game.resetAll();
  });

  it('a conflicting place() leaves the cursor unchanged', () => {
    const game = createGame();
    game.start();

    const selectedBefore = game.selected!;
    const dupValue = game.board!.find((c) => c.value !== null)!.value!;

    game.place(dupValue);

    expect(game.selected).toBe(selectedBefore);

    game.resetAll();
  });

  it('solving the whole board via solveDefault still reaches complete', () => {
    const game = createGame();
    game.start();

    expect(() => solveDefault(game)).not.toThrow();

    expect(game.status).toBe('complete');

    game.resetAll();
  });
});

describe('prestige breakdown', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('is empty for a fresh game', () => {
    const game = createGame();

    expect(game.prestigeBreakdown).toEqual([]);
  });

  it('has one entry after solving the active board', () => {
    const game = createGame();

    game.start();
    solveDefault(game);

    expect(game.prestigeBreakdown).toHaveLength(1);
    expect(game.prestigeBreakdown[0].points).toBe(game.pendingPoints);
    expect(game.prestigeBreakdown[0].id).toBe('default');
    expect(game.prestigeBreakdown[0].name).toBeTruthy();

    game.resetAll(); // stop the timer
  });

  it('is cleared by resetAll along with pendingPoints', () => {
    const game = createGame();

    game.start();
    solveDefault(game);
    game.resetAll();

    expect(game.prestigeBreakdown).toEqual([]);
    expect(game.pendingPoints).toBe(0);
  });
});

// Completes the active default board: it is a single block holding a permutation
// of 1..9, so the blank cells' values are exactly the numbers missing from the
// filled cells (any bijective assignment keeps all nine distinct).
function solveDefault(game: ReturnType<typeof createGame>): void {
  const b = game.board!;
  const present = new Set(b.filter((c) => c.value !== null).map((c) => c.value));
  const missing: number[] = [];
  for (let v = 1; v <= 9; v++) if (!present.has(v)) missing.push(v);
  const emptyIdx = b.map((c, i) => (c.value === null ? i : -1)).filter((i) => i >= 0);
  emptyIdx.forEach((idx, k) => {
    game.select(idx);
    game.place(missing[k]);
  });
}

function loadJson(key: string): unknown {
  return JSON.parse(localStorage.getItem(key) ?? 'null');
}
