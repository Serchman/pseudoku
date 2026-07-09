import { describe, it, expect } from 'vitest';
import { PROGRESSION, GATE_COSTS, BOARDS } from './config';
import { UNLOCKS } from './unlocks';

// Readable, always-in-sync view of the derived unlock ladder + regression guard.
// If you retune an N, REF_SPEED_MULT, or a scoring exponent, update these numbers.
const EXPECTED: Record<string, number> = {
  'speed-bonus': 30,
  'default:medium': 125,
  'board6x3': 430,
  'default:hard': 800,
  'board6x3:medium': 1605,
  'board6x3:hard': 2650,
};

describe('derived unlock ladder', () => {
  it('matches the documented cost table', () => {
    expect(GATE_COSTS).toEqual(EXPECTED);
  });

  it('wires derived costs into UNLOCKS, board, and tier configs', () => {
    expect(UNLOCKS.find((u) => u.id === 'speed-bonus')!.cost).toBe(30);
    expect(BOARDS.default.tiers.find((t) => t.id === 'medium')!.cost).toBe(125);
    expect(BOARDS.default.tiers.find((t) => t.id === 'hard')!.cost).toBe(800);
    expect(BOARDS.board6x3.cost).toBe(430);
    expect(BOARDS.board6x3.tiers.find((t) => t.id === 'medium')!.cost).toBe(1605);
    expect(BOARDS.board6x3.tiers.find((t) => t.id === 'hard')!.cost).toBe(2650);
  });

  it('rises monotonically along the progression', () => {
    const costs = PROGRESSION.map((p) => GATE_COSTS[p.gate]);
    for (let i = 1; i < costs.length; i++) {
      expect(costs[i]).toBeGreaterThan(costs[i - 1]);
    }
  });
});
