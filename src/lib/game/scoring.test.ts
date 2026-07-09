import { describe, it, expect } from 'vitest';
import { computeScore, boardWorth, difficultyFactor } from './scoring';
import { BOARDS, POINT_SCALE } from './config';

const brackets = BOARDS.default.brackets;

// Reference board+tier factors (3×3 Easy) = 1.0 each, so the baseline payout is POINT_SCALE.
const ref = { boardWorth: 1, difficultyFactor: 1 };

describe('computeScore', () => {
  it('returns the base payout when speed bonus is not owned, regardless of time', () => {
    const fast = computeScore(1000, brackets, { speedBonusOwned: false, globalMultiplier: 1, ...ref });
    const slow = computeScore(50000, brackets, { speedBonusOwned: false, globalMultiplier: 1, ...ref });

    expect(fast).toEqual({ points: POINT_SCALE, bracketMult: 1, expFactor: 1, speedApplied: false });
    expect(slow).toEqual({ points: POINT_SCALE, bracketMult: 1, expFactor: 1, speedApplied: false });
  });

  it('awards strictly more points for a faster solve across brackets', () => {
    const fast = computeScore(3000, brackets, { speedBonusOwned: true, globalMultiplier: 1, ...ref });
    const slow = computeScore(15000, brackets, { speedBonusOwned: true, globalMultiplier: 1, ...ref });

    expect(fast.points).toBeGreaterThan(slow.points);
  });

  it('awards strictly more points for a faster solve within the same bracket', () => {
    const fast = computeScore(500, brackets, { speedBonusOwned: true, globalMultiplier: 1, ...ref });
    const slow = computeScore(1500, brackets, { speedBonusOwned: true, globalMultiplier: 1, ...ref });

    expect(fast.bracketMult).toBe(slow.bracketMult);
    expect(fast.points).toBeGreaterThan(slow.points);
  });

  it('picks the bracket at the exact 2s boundary (<=)', () => {
    const result = computeScore(2000, brackets, { speedBonusOwned: true, globalMultiplier: 1, ...ref });
    expect(result.bracketMult).toBe(8);
  });

  it('picks the bracket at the exact 3s boundary (<=)', () => {
    const result = computeScore(3000, brackets, { speedBonusOwned: true, globalMultiplier: 1, ...ref });
    expect(result.bracketMult).toBe(5);
  });

  it('scales points proportionally with globalMultiplier (±1 for rounding)', () => {
    const base = computeScore(3000, brackets, { speedBonusOwned: true, globalMultiplier: 1, ...ref });
    const doubled = computeScore(3000, brackets, { speedBonusOwned: true, globalMultiplier: 2, ...ref });

    expect(doubled.points).toBeGreaterThanOrEqual(base.points * 2 - 1);
    expect(doubled.points).toBeLessThanOrEqual(base.points * 2 + 1);
  });

  it('applies no bonus in the catch-all bracket beyond 6s', () => {
    const result = computeScore(50000, brackets, { speedBonusOwned: true, globalMultiplier: 1, ...ref });
    expect(result.expFactor).toBe(1);
    expect(result.bracketMult).toBe(1);
  });

  it('scales the base payout by boardWorth (±1 for rounding)', () => {
    const base = computeScore(3000, brackets, { speedBonusOwned: true, globalMultiplier: 1, ...ref });
    const bigger = computeScore(3000, brackets, { speedBonusOwned: true, globalMultiplier: 1, boardWorth: 2, difficultyFactor: 1 });

    expect(bigger.points).toBeGreaterThanOrEqual(base.points * 2 - 1);
    expect(bigger.points).toBeLessThanOrEqual(base.points * 2 + 1);
  });

  it('applies difficultyFactor to the base payout when speed bonus is not owned', () => {
    const result = computeScore(1000, brackets, { speedBonusOwned: false, globalMultiplier: 1, boardWorth: 1, difficultyFactor: 2 });
    expect(result.points).toBe(POINT_SCALE * 2);
    expect(result.speedApplied).toBe(false);
  });

  it('scales speed-bonus points proportionally with difficultyFactor (±1 for rounding)', () => {
    const base = computeScore(3000, brackets, { speedBonusOwned: true, globalMultiplier: 1, ...ref });
    const scaled = computeScore(3000, brackets, { speedBonusOwned: true, globalMultiplier: 1, boardWorth: 1, difficultyFactor: 3.5 });

    expect(scaled.points).toBeGreaterThanOrEqual(base.points * 3.5 - 1);
    expect(scaled.points).toBeLessThanOrEqual(base.points * 3.5 + 1);
  });
});

describe('boardWorth', () => {
  it('is 1.0 for the reference 3×3 board', () => {
    expect(boardWorth(BOARDS.default)).toBeCloseTo(1.0, 5);
  });

  it('scales above 1 for the larger 6×3 board', () => {
    // (18/9) ** 1.3 ≈ 2.4623
    expect(boardWorth(BOARDS.board6x3)).toBeCloseTo(2.4623, 3);
  });
});

describe('difficultyFactor', () => {
  it('is 1.0 at the reference density (Easy: 3 of 9 blank)', () => {
    expect(difficultyFactor(3, 9)).toBeCloseTo(1.0, 5);
  });

  it('increases with blank density', () => {
    expect(difficultyFactor(7, 9)).toBeGreaterThan(difficultyFactor(3, 9));
  });

  it('is identical for equal densities across board sizes', () => {
    // 3/9 and 6/18 are both 1/3
    expect(difficultyFactor(3, 9)).toBeCloseTo(difficultyFactor(6, 18), 5);
  });
});
