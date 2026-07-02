import { describe, it, expect } from 'vitest';
import { computeMeter, formatClock, formatCountdown } from './meter';
import { ACTIVE_BOARD } from './config';

const brackets = ACTIVE_BOARD.brackets;

describe('computeMeter', () => {
  it('builds segments fast→slow with widths summing to ~100', () => {
    const { segments } = computeMeter(0, brackets);

    expect(segments.length).toBe(brackets.length);
    expect(segments.map((s) => s.mult)).toEqual([8, 5, 3, 2, 1]);

    const totalWidth = segments.reduce((sum, s) => sum + (s.endPct - s.startPct), 0);
    expect(totalWidth).toBeCloseTo(100);
  });

  it('t=0 → fastest bracket, indicator at start, drop info for next bracket', () => {
    const state = computeMeter(0, brackets);

    expect(state.currentMult).toBe(8);
    expect(state.activeIndex).toBe(0);
    expect(state.positionPct).toBe(0);
    expect(state.nextDropSec).toBe(5);
    expect(state.nextMult).toBe(5);
  });

  it('t=7 → second bracket, drop info for third bracket', () => {
    const state = computeMeter(7, brackets);

    expect(state.currentMult).toBe(5);
    expect(state.nextDropSec).toBe(3);
    expect(state.nextMult).toBe(3);
  });

  it('t=5 boundary → still fastest bracket (<= semantics)', () => {
    const state = computeMeter(5, brackets);

    expect(state.currentMult).toBe(8);
  });

  it('t=45 (past 40, within 60 horizon) → last bracket, no next drop', () => {
    const state = computeMeter(45, brackets);

    expect(state.currentMult).toBe(1);
    expect(state.nextDropSec).toBeNull();
    expect(state.nextMult).toBeNull();
    expect(state.segments[state.segments.length - 1].endSec).toBe(60);
  });

  it('t=100 (past horizon) → position pinned at 100, still last bracket', () => {
    const state = computeMeter(100, brackets);

    expect(state.positionPct).toBe(100);
    expect(state.currentMult).toBe(1);
  });

  it('formats clock and countdown', () => {
    expect(formatClock(42000)).toBe('00:42');
    expect(formatCountdown(18)).toBe('0:18');
  });
});
