import { describe, it, expect } from 'vitest';
import { gateCost } from './formula';

describe('gateCost', () => {
  it('is N × POINT_SCALE at the reference tier with no speed', () => {
    // anchor 3×3 Easy: worth 1, difficulty 1, withSpeed false → 3 × 10 = 30
    expect(gateCost(3, 3, 3, 3, false)).toBe(30);
  });

  it('folds in REF_SPEED_MULT when withSpeed is true', () => {
    // 5 × 10 × 1 × 1 × 2.5 = 125
    expect(gateCost(5, 3, 3, 3, true)).toBe(125);
  });

  it('scales with the anchor board worth and difficulty', () => {
    // anchor 6×3 Easy (18 cells, density 1/3): 13 × 10 × (18/9)^1.3 × 1 × 2.5 ≈ 800
    expect(gateCost(13, 6, 3, 6, true)).toBe(800);
  });

  it('rounds to the nearest 5', () => {
    // anchor 6×3 Medium (18 cells, 10 blank): 30 × 10 × 2.4623 × 2.1517 × 2.5 ≈ 3973 → 3975
    expect(gateCost(30, 6, 3, 10, true)).toBe(3975);
  });
});
