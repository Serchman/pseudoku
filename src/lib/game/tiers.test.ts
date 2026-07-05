import { describe, it, expect } from 'vitest';
import { getNextTier, getTierById, canBuyTier } from './tiers';
import { BOARDS } from './config';

const tiers = BOARDS.default.tiers; // easy (0), medium (50), hard (200)

describe('getNextTier', () => {
  it('returns the first tier when nothing is owned', () => {
    expect(getNextTier(tiers, new Set())).toBe(tiers[0]);
  });

  it('returns the next unowned tier in order', () => {
    expect(getNextTier(tiers, new Set(['easy']))).toBe(tiers[1]);
    expect(getNextTier(tiers, new Set(['easy', 'medium']))).toBe(tiers[2]);
  });

  it('returns undefined when all tiers are owned', () => {
    expect(getNextTier(tiers, new Set(['easy', 'medium', 'hard']))).toBeUndefined();
  });
});

describe('getTierById', () => {
  it('finds a tier by id', () => {
    expect(getTierById(tiers, 'medium')).toBe(tiers[1]);
  });

  it('returns undefined for an unknown id', () => {
    expect(getTierById(tiers, 'nope')).toBeUndefined();
  });
});

describe('canBuyTier', () => {
  it('returns false for a tier that is not the sequentially-next one', () => {
    // hard is locked behind medium even with plenty of points
    expect(canBuyTier('hard', 1000, new Set(['easy']), tiers)).toBe(false);
  });

  it('returns false when the tier is already owned', () => {
    expect(canBuyTier('easy', 1000, new Set(['easy']), tiers)).toBe(false);
  });

  it('returns false when not affordable', () => {
    expect(canBuyTier('medium', 49, new Set(['easy']), tiers)).toBe(false);
  });

  it('returns true for the next tier when affordable', () => {
    expect(canBuyTier('medium', 50, new Set(['easy']), tiers)).toBe(true);
  });

  it('returns false when all tiers are owned', () => {
    expect(canBuyTier('hard', 1000, new Set(['easy', 'medium', 'hard']), tiers)).toBe(false);
  });
});
