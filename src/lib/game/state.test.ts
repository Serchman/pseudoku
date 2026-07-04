// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { createGame } from './state.svelte';

describe('difficulty tiers in game state', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('buyTier deducts pointokus, marks the tier owned, and persists', () => {
    localStorage.setItem('sudoku-incremental:pointokus', '60');
    const game = createGame();

    game.buyTier('medium');

    expect(game.pointokus).toBe(10); // 60 - 50
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

  it('buyBoard with ≥500 points: deducts 500, marks owned, persists, and auto-selects', () => {
    localStorage.setItem('sudoku-incremental:pointokus', '600');
    const game = createGame();

    game.buyBoard('board6x3');

    expect(game.pointokus).toBe(100); // 600 - 500
    expect(game.boards.find((b) => b.id === 'board6x3')!.owned).toBe(true);
    expect(loadJson('sudoku-incremental:owned-boards')).toContain('board6x3');
    expect(Number(localStorage.getItem('sudoku-incremental:pointokus'))).toBe(100);
    expect(game.activeBoard.id).toBe('board6x3');
  });

  it('buyBoard with <500 points: no-op (unchanged points, not owned, default active)', () => {
    localStorage.setItem('sudoku-incremental:pointokus', '499');
    const game = createGame();

    game.buyBoard('board6x3');

    expect(game.pointokus).toBe(499);
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

    game.buyBoard('board6x3'); // -500 → 700
    game.buyBoard('board6x3'); // already owned, no-op

    expect(game.pointokus).toBe(700);
  });

  it('selectBoard swaps per-board tier state and restores on return', () => {
    // Need enough points: board6x3 costs 500, its medium tier costs 150
    localStorage.setItem('sudoku-incremental:pointokus', '700');
    const game = createGame();

    game.buyBoard('board6x3');  // -500 → 200, active=board6x3
    game.buyTier('medium');     // -150 → 50, medium owned on board6x3
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
});

function loadJson(key: string): unknown {
  return JSON.parse(localStorage.getItem(key) ?? 'null');
}
