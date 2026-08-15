import { describe, it, expect } from 'vitest'
import { gateCost, timeFactor } from './formula'

describe('timeFactor', () => {
  it('is 1 at the 3×3 Easy reference solve time', () => {
    expect(timeFactor(1.5)).toBe(1)
  })

  it('scales linearly with the reference solve time', () => {
    expect(timeFactor(12)).toBe(8) // 6×3 Hard
  })
})

describe('gateCost', () => {
  it('is N × POINT_SCALE at the reference tier with no speed', () => {
    // anchor 3×3 Easy: timeFactor 1, worth 1, difficulty 1, withSpeed false → 3 × 10 = 30
    expect(gateCost(3, 3, 3, 3, 1.5, false)).toBe(30)
  })

  it('folds in REF_SPEED_MULT when withSpeed is true', () => {
    // 5 × 10 × 1 × 1 × 1 × 2.5 = 125
    expect(gateCost(5, 3, 3, 3, 1.5, true)).toBe(125)
  })

  it('scales with the anchor time factor, board worth, and difficulty', () => {
    // anchor 6×3 Easy (ref 7 s → tf 4.6667, worth 2.4623, diff 1):
    // 13 × 10 × 4.6667 × 2.4623 × 1 × 2.5 ≈ 3734 → 3735
    expect(gateCost(13, 6, 3, 6, 7, true)).toBe(3735)
  })

  it('rounds to the nearest 5', () => {
    // anchor 6×3 Medium (ref 10 s → tf 6.6667, worth 2.4623, diff 2.1517):
    // 30 × 10 × 6.6667 × 2.4623 × 2.1517 × 2.5 ≈ 26490.2 → 26490
    expect(gateCost(30, 6, 3, 10, 10, true)).toBe(26490)
  })
})
