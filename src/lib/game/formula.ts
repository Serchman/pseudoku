import type { BoardConfig } from './config';

// Scoring/economy tuning constants. This is their single home; config.ts re-exports
// them so existing importers keep importing from './config'.
export const POINT_SCALE = 10;       // base payout for the reference board+tier
export const SIZE_EXP = 1.3;         // board-worth steepness in total cells
export const DIFF_EXP = 1.5;         // difficulty steepness in blank density
export const REF_CELLS = 9;          // reference board size (3×3): boardWorth = 1 here
export const REF_DENSITY = 1 / 3;    // reference blank density (Easy): difficultyFactor = 1 here
export const REF_SPEED_MULT = 2.5;   // typical engaged-play speed multiplier folded into gate
                                     // costs bought after Speed Bonus (retune knob for automation etc.)

function sizeWorth(totalCells: number): number {
  return (totalCells / REF_CELLS) ** SIZE_EXP;
}

// Board worth scales with total cells, normalized so the 3×3 reference board = 1.0.
export function boardWorth(board: BoardConfig): number {
  return sizeWorth(board.cols * board.rows);
}

// Difficulty scales with blank density (emptyCells / totalCells), normalized so the
// Easy reference density (1/3) = 1.0. Board-size-independent by construction.
export function difficultyFactor(emptyCells: number, totalCells: number): number {
  const density = emptyCells / totalCells;
  return (density / REF_DENSITY) ** DIFF_EXP;
}

// Round to the nearest 5 so derived costs read clean.
function round5(x: number): number {
  return Math.round(x / 5) * 5;
}

// Derived unlock cost = N solves' worth of income at the anchor tier, optionally folding
// in the typical speed multiplier. See docs/superpowers/specs/2026-07-09-unlock-cost-rebalance-design.md.
export function gateCost(
  n: number,
  anchorCols: number,
  anchorRows: number,
  anchorEmptyCells: number,
  withSpeed: boolean,
): number {
  const cells = anchorCols * anchorRows;
  const worth = sizeWorth(cells);
  const diff = difficultyFactor(anchorEmptyCells, cells);
  const speed = withSpeed ? REF_SPEED_MULT : 1;
  return round5(n * POINT_SCALE * worth * diff * speed);
}
