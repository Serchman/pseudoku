import { describe, it, expect } from 'vitest';
import { computeSegments, computeMeterPosition, formatClock, formatCountdown } from './meter';
import { ACTIVE_BOARD } from './config';

const brackets = ACTIVE_BOARD.brackets;
const { segments, horizonSec } = computeSegments(brackets);
const positionAt = (elapsedSec: number) => computeMeterPosition(elapsedSec, brackets, horizonSec);

describe('computeSegments', () => {
  it('builds segments fast→slow with widths summing to ~100', () => {
    expect(segments.length).toBe(brackets.length);
    expect(segments.map((s) => s.mult)).toEqual([8, 5, 3, 2, 1]);

    const totalWidth = segments.reduce((sum, s) => sum + (s.endPct - s.startPct), 0);
    expect(totalWidth).toBeCloseTo(100);
  });

  it('clamps the open last bracket to the horizon (60s)', () => {
    expect(horizonSec).toBe(60);
    expect(segments[segments.length - 1].endSec).toBe(60);
  });
});

describe('computeMeterPosition', () => {
  it('t=0 → fastest bracket, indicator at start, drop info for next bracket', () => {
    const pos = positionAt(0);

    expect(pos.currentMult).toBe(8);
    expect(pos.activeIndex).toBe(0);
    expect(pos.positionPct).toBe(0);
    expect(pos.nextDropSec).toBe(5);
    expect(pos.nextMult).toBe(5);
  });

  it('t=7 → second bracket, drop info for third bracket', () => {
    const pos = positionAt(7);

    expect(pos.currentMult).toBe(5);
    expect(pos.nextDropSec).toBe(3);
    expect(pos.nextMult).toBe(3);
  });

  it('t=5 boundary → still fastest bracket (<= semantics)', () => {
    expect(positionAt(5).currentMult).toBe(8);
  });

  it('t=45 (past 40, within 60 horizon) → last bracket, no next drop', () => {
    const pos = positionAt(45);

    expect(pos.currentMult).toBe(1);
    expect(pos.nextDropSec).toBeNull();
    expect(pos.nextMult).toBeNull();
  });

  it('t=100 (past horizon) → position pinned at 100, still last bracket', () => {
    const pos = positionAt(100);

    expect(pos.positionPct).toBe(100);
    expect(pos.currentMult).toBe(1);
  });
});

describe('formatters', () => {
  it('formats clock and countdown', () => {
    expect(formatClock(42000)).toBe('00:42');
    expect(formatCountdown(18)).toBe('0:18');
  });
});
