// Pure geometry for the radial touch-drag number picker. No DOM, no Svelte, no game state.

export const RADIUS = 88; // px, distance from ring centre to a target's centre
export const IDLE = 44; // px, diameter of an idle target
export const SELECTED = 58; // px, diameter of the locked/selected target
export const GUIDE = 180; // px, diameter of the breathing guide ring
export const SCRIM = 250; // px, diameter of the radial scrim
export const STEP_DEG = 36; // 360 / 10 targets
export const START_DEG = 0; // target k=0 (digit 1) sits straight up, at 12 o'clock

// A target is hit only when the finger is genuinely inside its circle: the circle you see is
// the circle you hit. At RADIUS 88 adjacent centres are 2 * 88 * sin(18°) ≈ 54.4px apart, so a
// 29px hit radius makes neighbouring hit areas just meet — sliding around the ring stays
// continuous, while no distance-from-centre other than the ring itself resolves to a digit.
export const HIT_RADIUS = SELECTED / 2; // px, a target's locked/grown radius
export const ARM_THRESHOLD = 8; // px the finger must travel before a target can be picked

export const MARGIN = RADIUS + SELECTED / 2; // keeps the whole fan on screen

export type RadialTarget = number | 'remove';

// Pixel offset of target k's centre from the ring centre, in screen coordinates (y down).
export function targetOffset(k: number): { x: number; y: number } {
  const rad = ((START_DEG + STEP_DEG * k) * Math.PI) / 180;
  return {
    x: RADIUS * Math.sin(rad),
    y: -RADIUS * Math.cos(rad),
  };
}

// Given the finger's offset from the ring centre (screen coords, y down), return the target
// whose circle the finger is inside, or null for cancel (the finger is on no target).
export function resolveTarget(dx: number, dy: number): RadialTarget | null {
  let best: number | null = null;
  let bestDist = HIT_RADIUS;
  for (let k = 0; k < 10; k++) {
    const c = targetOffset(k);
    const d = Math.hypot(dx - c.x, dy - c.y);
    if (d < bestDist) {
      bestDist = d;
      best = k;
    }
  }
  if (best === null) return null;
  return best === 9 ? 'remove' : best + 1;
}

// Shifts the ring's origin inward so the whole fan stays on screen. Does not rotate the fan.
export function clampOrigin(x: number, y: number, vw: number, vh: number): { x: number; y: number } {
  const clampAxis = (v: number, size: number): number => {
    const lo = MARGIN;
    const hi = size - MARGIN;
    if (lo > hi) return size / 2;
    return Math.min(Math.max(v, lo), hi);
  };
  return { x: clampAxis(x, vw), y: clampAxis(y, vh) };
}
