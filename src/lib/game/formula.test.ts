import { describe, it, expect } from 'vitest';
import { gateCost, hintCost } from './formula';
import { BOARDS } from './config';

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

describe('hintCost', () => {
  it('follows a geometric ladder on the 3×3 (worth 1)', () => {
    // round5( 10 × 1 × 2 × 2^(level-1) × 2.5 )
    expect(hintCost(1, BOARDS.default)).toBe(50);
    expect(hintCost(2, BOARDS.default)).toBe(100);
    expect(hintCost(3, BOARDS.default)).toBe(200);
    expect(hintCost(4, BOARDS.default)).toBe(400);
  });

  it('scales with board worth on the 6×3', () => {
    // worth(6×3) = (18/9)^1.3 ≈ 2.4623 → hint 1 ≈ 123 → 125; hint 2 ≈ 246 → 245
    expect(hintCost(1, BOARDS.board6x3)).toBe(125);
    expect(hintCost(2, BOARDS.board6x3)).toBe(245);
  });
});
