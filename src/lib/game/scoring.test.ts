import { describe, it, expect } from 'vitest';
import { computeScore, speedFactor, speedComponents, boardWorth, difficultyFactor, recordTerm, globalRecordMultiplier } from './scoring';
import { BOARDS, POINT_SCALE } from './config';

const brackets = BOARDS.default.brackets;

// Reference board+tier factors (3×3 Easy) = 1.0 each, so the baseline payout is POINT_SCALE.
const ref = { boardWorth: 1, difficultyFactor: 1 };

describe('speedFactor', () => {
  it('equals the bracket mult exactly at a bracket boundary (expFactor = 1)', () => {
    // 2.0s is the 3×3 fastest-bracket boundary → mult 8, expFactor 1
    expect(speedFactor(2000, brackets)).toBeCloseTo(8, 5);
    // 3.0s boundary → mult 5, expFactor 1
    expect(speedFactor(3000, brackets)).toBeCloseTo(5, 5);
  });

  it('exceeds the bracket mult inside a bracket (expFactor > 1)', () => {
    // 2.5s: mult 5, f = (3-2.5)/(3-2) = 0.5 → 5 × 1.5^0.5 ≈ 6.12
    expect(speedFactor(2500, brackets)).toBeCloseTo(6.1237, 3);
  });

  it('is the plain mult in the open catch-all bracket', () => {
    expect(speedFactor(50000, brackets)).toBeCloseTo(1, 5);
  });

  it('speedComponents returns the same product computeScore applies', () => {
    const { bracketMult, expFactor } = speedComponents(2500, brackets);
    expect(bracketMult * expFactor).toBeCloseTo(speedFactor(2500, brackets), 10);
  });
});

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

describe('recordTerm', () => {
  it('is 1 (neutral) when there is no record', () => {
    expect(recordTerm(null, BOARDS.default)).toBe(1);
  });

  it('equals the speed factor at the best time', () => {
    expect(recordTerm(2000, BOARDS.default)).toBeCloseTo(8, 5);
    expect(recordTerm(3000, BOARDS.default)).toBeCloseTo(5, 5);
    expect(recordTerm(2500, BOARDS.default)).toBeCloseTo(6.1237, 3);
  });
});

describe('globalRecordMultiplier', () => {
  it('is 1 when the records unlock is not owned, regardless of terms', () => {
    expect(globalRecordMultiplier([8, 5], false)).toBe(1);
  });

  it('is 1 when owned but there are no terms', () => {
    expect(globalRecordMultiplier([], true)).toBe(1);
  });

  it('sums 1 + Σ(term − 1) over the terms when owned', () => {
    expect(globalRecordMultiplier([8], true)).toBeCloseTo(8, 5);
    expect(globalRecordMultiplier([8, 5], true)).toBeCloseTo(12, 5); // 1 + 7 + 4
  });
});
