// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createGame } from './state.svelte';
import { BOARDS } from './config';
import { PROFILES, solvePoints, solveTimeMs } from './simulate';

const ENGAGED = PROFILES.find((p) => p.id === 'engaged')!;
const easy3x3 = BOARDS.default.tiers[0];

// Same approach as state.test.ts's solveDefault: the 3×3 board is a permutation
// of 1..9, so blanks take exactly the missing values.
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

// Solve the active board with the wall clock pinned so timeMs === solveMs exactly.
function solveAt(game: ReturnType<typeof createGame>, solveMs: number): void {
  const nowSpy = vi.spyOn(performance, 'now');
  nowSpy.mockReturnValue(0);
  game.start();
  nowSpy.mockReturnValue(solveMs);
  solveDefault(game);
  expect(game.status).toBe('complete');
}

describe('simulator agrees with the real game', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  // Drive the real game at exactly the solve time the sim models for this profile,
  // so any divergence is a payout/banking disagreement, not a solve-time mismatch.
  const ENGAGED_EASY_MS = solveTimeMs(ENGAGED, 'default', easy3x3); // 3000 ms

  it('per-solve payout and banking match, without speed bonus', () => {
    const game = createGame();
    solveAt(game, ENGAGED_EASY_MS); // engaged-profile 3×3 easy solve
    solveAt(game, ENGAGED_EASY_MS);
    game.resetAll(); // bank

    const simPoints = 2 * solvePoints(ENGAGED, 'default', easy3x3, false);
    expect(game.pointokus).toBe(simPoints); // 20
  });

  it('per-solve payout and banking match, with speed bonus owned', () => {
    localStorage.setItem('sudoku-incremental:pointokus', '30');
    const game = createGame();
    game.buyUnlock('speed-bonus');
    expect(game.speedBonusOwned).toBe(true);

    solveAt(game, ENGAGED_EASY_MS);
    game.resetAll();

    const simPoints = solvePoints(ENGAGED, 'default', easy3x3, true);
    expect(game.pointokus).toBe(simPoints); // 50: banked pending, 0 left from the buy
  });
});
