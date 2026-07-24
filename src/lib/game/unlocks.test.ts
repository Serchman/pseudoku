import { describe, it, expect } from 'vitest';
import { UNLOCKS, getNextUnlock, canBuy } from './unlocks';

describe('getNextUnlock', () => {
  it('returns the speed-bonus unlock when nothing is owned', () => {
    expect(getNextUnlock(new Set())).toBe(UNLOCKS[0]);
  });

  it('returns the records unlock when only speed-bonus is owned', () => {
    expect(getNextUnlock(new Set(['speed-bonus']))).toBe(UNLOCKS[1]);
  });

  it('returns undefined when all unlocks are owned', () => {
    expect(getNextUnlock(new Set(['speed-bonus', 'records']))).toBeUndefined();
  });
});

describe('canBuy', () => {
  it('returns false for an unknown id', () => {
    expect(canBuy('does-not-exist', 1000, new Set())).toBe(false);
  });

  it('returns false when already owned, even with enough points', () => {
    expect(canBuy('speed-bonus', 1000, new Set(['speed-bonus']))).toBe(false);
  });

  it('returns false when pointokus is less than cost', () => {
    expect(canBuy('speed-bonus', 29, new Set())).toBe(false);
  });

  it('returns true when pointokus equals cost', () => {
    expect(canBuy('speed-bonus', 30, new Set())).toBe(true);
  });

  it('returns true when pointokus is greater than cost', () => {
    expect(canBuy('speed-bonus', 31, new Set())).toBe(true);
  });
});
