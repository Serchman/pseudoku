import { describe, it, expect } from 'vitest';
import {
  targetOffset,
  resolveTarget,
  clampOrigin,
  RADIUS,
  DEAD_ZONE,
  OUTER_CANCEL,
  STEP_DEG,
  MARGIN,
} from './radial';

describe('targetOffset', () => {
  it('k=0 (digit 1) is straight up', () => {
    const { x, y } = targetOffset(0);
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(-RADIUS);
  });

  it('sweeps clockwise: k for digit 4 (k=3) lands to the right-ish', () => {
    const { x } = targetOffset(3);
    expect(x).toBeGreaterThan(0);
  });

  it('all 10 offsets lie on the circle of radius RADIUS', () => {
    for (let k = 0; k < 10; k++) {
      const { x, y } = targetOffset(k);
      expect(Math.hypot(x, y)).toBeCloseTo(RADIUS);
    }
  });
});

describe('resolveTarget', () => {
  it('resolves all 10 sectors from a point directly on target k', () => {
    for (let k = 0; k < 9; k++) {
      const { x, y } = targetOffset(k);
      expect(resolveTarget(x, y)).toBe(k + 1);
    }
    const remove = targetOffset(9);
    expect(resolveTarget(remove.x, remove.y)).toBe('remove');
  });

  it('a point just clockwise of straight-up resolves to digit 1', () => {
    const deg = STEP_DEG / 2 - 1; // just inside digit 1's sector, clockwise side
    const rad = (deg * Math.PI) / 180;
    const x = RADIUS * Math.sin(rad);
    const y = -RADIUS * Math.cos(rad);
    expect(resolveTarget(x, y)).toBe(1);
  });

  it('a point just counter-clockwise of straight-up resolves to remove', () => {
    const deg = -(STEP_DEG / 2 + 1); // just past the digit-1/remove boundary, ccw of top
    const rad = (deg * Math.PI) / 180;
    const x = RADIUS * Math.sin(rad);
    const y = -RADIUS * Math.cos(rad);
    expect(resolveTarget(x, y)).toBe('remove');
  });

  it('cancels inside the dead zone at the exact centre', () => {
    expect(resolveTarget(0, 0)).toBeNull();
  });

  it('cancels for r < DEAD_ZONE', () => {
    expect(resolveTarget(DEAD_ZONE - 1, 0)).toBeNull();
  });

  it('does not cancel at r === DEAD_ZONE', () => {
    expect(resolveTarget(0, -DEAD_ZONE)).not.toBeNull();
  });

  it('cancels for r > OUTER_CANCEL', () => {
    expect(resolveTarget(0, -(OUTER_CANCEL + 1))).toBeNull();
  });

  it('does not cancel at r === OUTER_CANCEL', () => {
    expect(resolveTarget(0, -OUTER_CANCEL)).not.toBeNull();
  });
});

describe('clampOrigin', () => {
  it('leaves an origin comfortably inside a large viewport unchanged', () => {
    const result = clampOrigin(500, 500, 1000, 1000);
    expect(result).toEqual({ x: 500, y: 500 });
  });

  it('pushes all four corners of a phone-sized viewport inward to exactly MARGIN', () => {
    const vw = 390;
    const vh = 844;

    expect(clampOrigin(0, 0, vw, vh)).toEqual({ x: MARGIN, y: MARGIN });
    expect(clampOrigin(vw, 0, vw, vh)).toEqual({ x: vw - MARGIN, y: MARGIN });
    expect(clampOrigin(0, vh, vw, vh)).toEqual({ x: MARGIN, y: vh - MARGIN });
    expect(clampOrigin(vw, vh, vw, vh)).toEqual({ x: vw - MARGIN, y: vh - MARGIN });
  });

  it('returns the viewport centre on an axis too small to fit 2 * MARGIN', () => {
    const vw = 100; // narrower than 2 * MARGIN
    const vh = 844;
    expect(clampOrigin(0, 0, vw, vh)).toEqual({ x: vw / 2, y: MARGIN });
  });
});
