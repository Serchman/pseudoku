import { describe, it, expect } from 'vitest';
import { computeScore } from './scoring';
import { ACTIVE_BOARD, FLAT_POINTS } from './config';

const brackets = ACTIVE_BOARD.brackets;

describe('computeScore', () => {
  it('returns flat points when speed bonus is not owned, regardless of time', () => {
    const fast = computeScore(1000, brackets, { speedBonusOwned: false, globalMultiplier: 1 });
    const slow = computeScore(50000, brackets, { speedBonusOwned: false, globalMultiplier: 1 });

    expect(fast).toEqual({ points: FLAT_POINTS, bracketMult: 1, expFactor: 1, speedApplied: false });
    expect(slow).toEqual({ points: FLAT_POINTS, bracketMult: 1, expFactor: 1, speedApplied: false });
  });

  it('awards strictly more points for a faster solve across brackets', () => {
    const fast = computeScore(3000, brackets, { speedBonusOwned: true, globalMultiplier: 1 });
    const slow = computeScore(15000, brackets, { speedBonusOwned: true, globalMultiplier: 1 });

    expect(fast.points).toBeGreaterThan(slow.points);
  });

  it('awards strictly more points for a faster solve within the same bracket', () => {
    const fast = computeScore(1000, brackets, { speedBonusOwned: true, globalMultiplier: 1 });
    const slow = computeScore(4000, brackets, { speedBonusOwned: true, globalMultiplier: 1 });

    expect(fast.bracketMult).toBe(slow.bracketMult);
    expect(fast.points).toBeGreaterThan(slow.points);
  });

  it('picks the bracket at the exact 5s boundary (<=)', () => {
    const result = computeScore(5000, brackets, { speedBonusOwned: true, globalMultiplier: 1 });
    expect(result.bracketMult).toBe(8);
  });

  it('picks the bracket at the exact 10s boundary (<=)', () => {
    const result = computeScore(10000, brackets, { speedBonusOwned: true, globalMultiplier: 1 });
    expect(result.bracketMult).toBe(5);
  });

  it('scales points proportionally with globalMultiplier (±1 for rounding)', () => {
    const base = computeScore(3000, brackets, { speedBonusOwned: true, globalMultiplier: 1 });
    const doubled = computeScore(3000, brackets, { speedBonusOwned: true, globalMultiplier: 2 });

    expect(doubled.points).toBeGreaterThanOrEqual(base.points * 2 - 1);
    expect(doubled.points).toBeLessThanOrEqual(base.points * 2 + 1);
  });

  it('applies no bonus in the catch-all bracket beyond 40s', () => {
    const result = computeScore(50000, brackets, { speedBonusOwned: true, globalMultiplier: 1 });
    expect(result.expFactor).toBe(1);
    expect(result.bracketMult).toBe(1);
  });
});
