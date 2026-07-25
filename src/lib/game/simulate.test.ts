import { describe, it, expect } from 'vitest';
import { BOARDS } from './config';
import { PROFILES, solveTimeMs, solvePoints, pointsPerSec } from './simulate';

const ENGAGED = PROFILES.find((p) => p.id === 'engaged')!;
const easy3x3 = BOARDS.default.tiers[0];

describe('solve model', () => {
  it('solve time is secPerBlank × emptyCells', () => {
    // engaged = 2 s/blank; 3×3 Easy has 3 blanks
    expect(solveTimeMs(ENGAGED, easy3x3)).toBe(6000);
  });

  it('payout matches the real scoring formula', () => {
    // 6 s lands the ≤6 s bracket (mult 2) exactly at its edge (expFactor 1):
    // base 10 × 2 = 20 with Speed Bonus, flat 10 without.
    expect(solvePoints(ENGAGED, 'default', easy3x3, false)).toBe(10);
    expect(solvePoints(ENGAGED, 'default', easy3x3, true)).toBe(20);
  });

  it('rate divides payout by solve time plus overhead', () => {
    // engaged overhead 3 s → 20 pts / (6 s + 3 s)
    expect(pointsPerSec(ENGAGED, 'default', easy3x3, true)).toBeCloseTo(20 / 9);
  });
});
