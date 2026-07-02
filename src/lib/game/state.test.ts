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

function loadJson(key: string): unknown {
  return JSON.parse(localStorage.getItem(key) ?? 'null');
}
