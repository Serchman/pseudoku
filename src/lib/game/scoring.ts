import type { Bracket, BoardConfig } from './config';
import { EXP_BASE, POINT_SCALE, SIZE_EXP, DIFF_EXP, REF_CELLS, REF_DENSITY } from './config';

export interface ScoreResult {
  points: number;
  bracketMult: number;
  expFactor: number;
  speedApplied: boolean;
}

// Board worth scales with total cells, normalized so the 3×3 reference board = 1.0.
export function boardWorth(board: BoardConfig): number {
  const totalCells = board.cols * board.rows;
  return (totalCells / REF_CELLS) ** SIZE_EXP;
}

// Difficulty scales with blank density (emptyCells / totalCells), normalized so the
// Easy reference density (1/3) = 1.0. Board-size-independent by construction.
export function difficultyFactor(emptyCells: number, totalCells: number): number {
  const density = emptyCells / totalCells;
  return (density / REF_DENSITY) ** DIFF_EXP;
}

export function computeScore(
  timeMs: number,
  brackets: Bracket[],
  opts: { speedBonusOwned: boolean; globalMultiplier: number; boardWorth: number; difficultyFactor: number },
): ScoreResult {
  const base = POINT_SCALE * opts.boardWorth * opts.difficultyFactor;

  if (!opts.speedBonusOwned) {
    return {
      points: Math.round(base),
      bracketMult: 1,
      expFactor: 1,
      speedApplied: false,
    };
  }

  const t = timeMs / 1000;

  let lo = 0;
  let selected = brackets[brackets.length - 1];
  for (const bracket of brackets) {
    if (t <= bracket.maxSec) {
      selected = bracket;
      break;
    }
    lo = bracket.maxSec;
  }

  const hi = selected.maxSec;
  let expFactor: number;
  if (!Number.isFinite(hi)) {
    expFactor = 1;
  } else {
    const f = Math.min(1, Math.max(0, (hi - t) / (hi - lo)));
    expFactor = EXP_BASE ** f;
  }

  const bracketMult = selected.mult;
  const points = Math.round(base * bracketMult * expFactor * opts.globalMultiplier);

  return { points, bracketMult, expFactor, speedApplied: true };
}
