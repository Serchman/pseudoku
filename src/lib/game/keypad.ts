// Pure geometry for the offset 3×3 keypad number picker. No DOM, no Svelte, no game state.
// The popup is a 3×3 grid of digit keys (phone-keypad order) plus a full-width erase bar,
// and it opens offset above the touch point so the finger never covers it.

export const KEY = 64; // px, side of a digit key (>= 44px min hit target)
export const GAP = 9; // px, gap between keys
export const PAD = 12; // px, popup inner padding
export const ERASE_H = 40; // px, height of the erase bar below the grid
export const TOUCH_GAP = 16; // px, clearance between the touch point and the popup
export const SAFE = 8; // px, min clearance from the viewport edge
export const MOVE_THRESHOLD = 10; // px the finger must travel to count as a drag, not a tap

// The grid spans 3 keys + 2 gaps; the popup wraps the grid and the erase bar in PAD.
export const GRID = KEY * 3 + GAP * 2;
export const POPUP_W = GRID + PAD * 2;
export const POPUP_H = PAD + GRID + GAP + ERASE_H + PAD;

export type KeypadTarget = number | 'remove';

// Where the popup's top-left corner sits, plus the transform-origin corner the entrance
// animation grows from — all derived from the touch point so the popup clears the finger
// and stays fully on screen.
export interface Anchor {
  left: number;
  top: number;
  origin: string; // CSS transform-origin, e.g. "left bottom"
}

// Compute the popup anchor from the touch point (tx, ty) and viewport size.
export function anchorPopup(tx: number, ty: number, vw: number, vh: number): Anchor {
  // Vertical: prefer opening above the finger; fall back to below only when there is no room.
  const aboveTop = ty - TOUCH_GAP - POPUP_H;
  const openAbove = aboveTop >= SAFE;
  const originY = openAbove ? 'bottom' : 'top';
  let top = openAbove ? aboveTop : ty + TOUCH_GAP;

  // Horizontal: centre on the finger, then clamp. The clamp is what biases an edge press
  // inward — a left-edge touch opens up-right, a right-edge touch opens up-left.
  let left = clamp(tx - POPUP_W / 2, SAFE, vw - POPUP_W - SAFE);
  top = clamp(top, SAFE, vh - POPUP_H - SAFE);

  // transform-origin corner: whichever side of the popup the finger sits nearest.
  const originX =
    tx <= left + POPUP_W / 3 ? 'left' : tx >= left + (POPUP_W * 2) / 3 ? 'right' : 'center';

  return { left, top, origin: `${originX} ${originY}` };
}

function clamp(v: number, lo: number, hi: number): number {
  if (lo > hi) return lo; // popup larger than the safe area on this axis: pin to the near edge
  return Math.min(Math.max(v, lo), hi);
}

// Which key the pointer is over, given the popup's top-left corner. Returns a digit 1..9,
// 'remove' for the erase bar, or null when the pointer is on padding, a gap, or off the popup.
export function keyAt(px: number, py: number, left: number, top: number): KeypadTarget | null {
  const x = px - left - PAD;
  const y = py - top - PAD;
  if (x < 0 || x > GRID) return null;

  // Digit grid.
  if (y >= 0 && y <= GRID) {
    const col = Math.floor(x / (KEY + GAP));
    const row = Math.floor(y / (KEY + GAP));
    if (col > 2 || row > 2) return null;
    // Reject the gaps between keys: the offset inside a key-plus-gap slot must land on the key.
    if (x - col * (KEY + GAP) > KEY || y - row * (KEY + GAP) > KEY) return null;
    return row * 3 + col + 1;
  }

  // Erase bar, a full-grid-width strip below the digits.
  const eraseTop = GRID + GAP;
  if (y >= eraseTop && y <= eraseTop + ERASE_H) return 'remove';

  return null;
}
