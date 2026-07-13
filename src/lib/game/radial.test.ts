import { describe, it, expect } from 'vitest';
import {
  targetOffset,
  resolveTarget,
  clampOrigin,
  RADIUS,
  HIT_RADIUS,
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

// A point `dist` px from target k's centre, pushed radially inward toward the ring centre.
function offCentre(k: number, dist: number): { x: number; y: number } {
  const c = targetOffset(k);
  const scale = (RADIUS - dist) / RADIUS;
  return { x: c.x * scale, y: c.y * scale };
}

describe('resolveTarget', () => {
  it('resolves all 10 targets from a point dead-centre on target k', () => {
    for (let k = 0; k < 9; k++) {
      const { x, y } = targetOffset(k);
      expect(resolveTarget(x, y)).toBe(k + 1);
    }
    const remove = targetOffset(9);
    expect(resolveTarget(remove.x, remove.y)).toBe('remove');
  });

  it('picks a target from a point just inside its circle', () => {
    const { x, y } = offCentre(0, HIT_RADIUS - 1);
    expect(resolveTarget(x, y)).toBe(1);
  });

  it('picks nothing from a point just outside every circle', () => {
    const { x, y } = offCentre(0, HIT_RADIUS + 1);
    expect(resolveTarget(x, y)).toBeNull();
  });

  it('cancels at the exact ring centre', () => {
    expect(resolveTarget(0, 0)).toBeNull();
  });

  it('cancels mid-annulus on a target bearing but off its circle', () => {
    // 50px out along digit 1's bearing (target k=0): the old sector hit-test called this
    // digit 1, but it is 38px from that circle's centre — the finger is on no target.
    const k = 0;
    const rad = (STEP_DEG * k * Math.PI) / 180;
    expect(resolveTarget(50 * Math.sin(rad), -50 * Math.cos(rad))).toBeNull();
  });

  it('cancels far outside the ring', () => {
    expect(resolveTarget(0, -150)).toBeNull();
  });

  it('still picks one of two neighbours midway along the ring between them', () => {
    // Adjacent hit circles just meet along the ring — sliding around it never falls through.
    const rad = ((STEP_DEG / 2) * Math.PI) / 180;
    const picked = resolveTarget(RADIUS * Math.sin(rad), -RADIUS * Math.cos(rad));
    expect([1, 2]).toContain(picked);
  });

  it('regression: these clamp-shifted edge-origin deltas lie on no circle', () => {
    // The clamp shifts the ring inward, so an edge-column press can land tens of px off
    // the ring centre with zero finger travel; -33 and 65 are two such deltas. The old
    // sector hit-test resolved them to digits 9 and 4 and committed them on lift, but
    // neither is inside any target's circle, so resolveTarget must cancel both. Guarding
    // against accidental commits in general is the component's ARM_THRESHOLD job, not this
    // pure module's — resolveTarget alone does not guarantee every no-drag edge press cancels.
    expect(resolveTarget(-33, 0)).toBeNull();
    expect(resolveTarget(65, 0)).toBeNull();
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
