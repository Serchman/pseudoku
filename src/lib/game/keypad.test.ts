import { describe, it, expect } from 'vitest';
import {
  anchorPopup,
  keyAt,
  KEY,
  GAP,
  PAD,
  GRID,
  ERASE_H,
  TOUCH_GAP,
  SAFE,
  POPUP_W,
  POPUP_H,
} from './keypad';

// Centre of digit key d (1..9) for a popup whose top-left is (left, top).
function keyCentre(d: number, left: number, top: number): { x: number; y: number } {
  const col = (d - 1) % 3;
  const row = Math.floor((d - 1) / 3);
  return {
    x: left + PAD + col * (KEY + GAP) + KEY / 2,
    y: top + PAD + row * (KEY + GAP) + KEY / 2,
  };
}

describe('anchorPopup', () => {
  it('opens above and centred for a touch in open space', () => {
    const tx = 500;
    const ty = 600;
    const a = anchorPopup(tx, ty, 1000, 1000);
    expect(a.left).toBeCloseTo(tx - POPUP_W / 2);
    expect(a.top).toBeCloseTo(ty - TOUCH_GAP - POPUP_H);
    expect(a.origin).toBe('center bottom');
  });

  it('flips below when there is no room above', () => {
    const ty = 20; // popup cannot fit above this touch
    const a = anchorPopup(200, ty, 390, 844);
    expect(a.top).toBeCloseTo(ty + TOUCH_GAP);
    expect(a.origin.endsWith('bottom')).toBe(false);
    expect(a.origin.endsWith('top')).toBe(true);
  });

  it('a left-edge touch clamps inward and grows from its left', () => {
    const a = anchorPopup(0, 600, 390, 844);
    expect(a.left).toBe(SAFE);
    expect(a.origin.startsWith('left')).toBe(true);
  });

  it('a right-edge touch clamps inward and grows from its right', () => {
    const vw = 390;
    const a = anchorPopup(vw, 600, vw, 844);
    expect(a.left).toBe(vw - POPUP_W - SAFE);
    expect(a.origin.startsWith('right')).toBe(true);
  });

  it('never lets the popup clip off any edge of a phone viewport', () => {
    const vw = 390;
    const vh = 844;
    for (const [tx, ty] of [
      [0, 0],
      [vw, 0],
      [0, vh],
      [vw, vh],
      [vw / 2, vh / 2],
    ]) {
      const a = anchorPopup(tx, ty, vw, vh);
      expect(a.left).toBeGreaterThanOrEqual(SAFE);
      expect(a.top).toBeGreaterThanOrEqual(SAFE);
      expect(a.left + POPUP_W).toBeLessThanOrEqual(vw - SAFE);
      expect(a.top + POPUP_H).toBeLessThanOrEqual(vh - SAFE);
    }
  });
});

describe('keyAt', () => {
  const left = 100;
  const top = 100;

  it('resolves each digit from the centre of its key', () => {
    for (let d = 1; d <= 9; d++) {
      const { x, y } = keyCentre(d, left, top);
      expect(keyAt(x, y, left, top)).toBe(d);
    }
  });

  it('resolves the erase bar', () => {
    const x = left + PAD + GRID / 2;
    const y = top + PAD + GRID + GAP + ERASE_H / 2;
    expect(keyAt(x, y, left, top)).toBe('remove');
  });

  it('returns null in the gap between two keys', () => {
    const y = keyCentre(1, left, top).y;
    const x = left + PAD + KEY + GAP / 2; // between column 0 and column 1
    expect(keyAt(x, y, left, top)).toBeNull();
  });

  it('returns null on the popup padding', () => {
    expect(keyAt(left + PAD / 2, top + PAD / 2, left, top)).toBeNull();
  });

  it('returns null outside the popup', () => {
    expect(keyAt(left - 20, top - 20, left, top)).toBeNull();
    expect(keyAt(left + POPUP_W + 20, top + POPUP_H + 20, left, top)).toBeNull();
  });
});
