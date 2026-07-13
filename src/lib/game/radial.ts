// Pure geometry for the radial touch-drag number picker. No DOM, no Svelte, no game state.

export const RADIUS = 88; // px, distance from ring centre to a target's centre
export const IDLE = 44; // px, diameter of an idle target
export const SELECTED = 58; // px, diameter of the locked/selected target
export const GUIDE = 180; // px, diameter of the breathing guide ring
export const SCRIM = 250; // px, diameter of the radial scrim
export const DEAD_ZONE = 30; // px, radius below which the gesture resolves to null (cancel)
export const OUTER_CANCEL = 132; // px, radius above which the gesture resolves to null (cancel)
export const STEP_DEG = 36; // 360 / 10 targets
export const START_DEG = 0; // target k=0 (digit 1) sits straight up, at 12 o'clock

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

// Given the finger's offset from the ring centre (screen coords, y down), return
// which target the finger is over, or null for cancel.
export function resolveTarget(dx: number, dy: number): RadialTarget | null {
  const r = Math.hypot(dx, dy);
  if (r < DEAD_ZONE || r > OUTER_CANCEL) return null;
  const deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
  const k = ((Math.round(deg / STEP_DEG) % 10) + 10) % 10;
  return k === 9 ? 'remove' : k + 1;
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
