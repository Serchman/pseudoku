import type { Bracket, BoardConfig } from './config';
import { EXP_BASE, POINT_SCALE, RECORD_WEIGHT } from './config';

// boardWorth / difficultyFactor now live in formula.ts; re-export so existing
// importers (state.svelte.ts, scoring.test.ts) keep importing them from here.
export { boardWorth, difficultyFactor } from './formula';

export interface ScoreResult {
  points: number;
  bracketMult: number;
  expFactor: number;
  speedApplied: boolean;
}

// Bracket mult and intra-bracket exponential factor for a solve time. Extracted from
// computeScore so the record term reuses the exact same speed curve (single source of truth).
export function speedComponents(
  timeMs: number,
  brackets: Bracket[],
): { bracketMult: number; expFactor: number } {
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
  const expFactor = !Number.isFinite(hi)
    ? 1
    : EXP_BASE ** Math.min(1, Math.max(0, (hi - t) / (hi - lo)));

  return { bracketMult: selected.mult, expFactor };
}

// The combined speed multiple (bracketMult × expFactor) for a solve time.
export function speedFactor(timeMs: number, brackets: Bracket[]): number {
  const { bracketMult, expFactor } = speedComponents(timeMs, brackets);
  return bracketMult * expFactor;
}

export function computeScore(
  timeMs: number,
  brackets: Bracket[],
  opts: { speedBonusOwned: boolean; globalMultiplier: number; boardWorth: number; difficultyFactor: number },
): ScoreResult {
  const base = POINT_SCALE * opts.boardWorth * opts.difficultyFactor;

  if (!opts.speedBonusOwned) {
    return { points: Math.round(base), bracketMult: 1, expFactor: 1, speedApplied: false };
  }

  const { bracketMult, expFactor } = speedComponents(timeMs, brackets);
  const points = Math.round(base * bracketMult * expFactor * opts.globalMultiplier);

  return { points, bracketMult, expFactor, speedApplied: true };
}

// A board's theoretical-max speed factor: fastest bracket's mult × the max intra-bracket
// exp factor (EXP_BASE, reached as t → the fast end of that bracket). Used to normalize
// the record term into a 0..1 fraction of "best possible".
function speedFactorMax(board: BoardConfig): number {
  const maxMult = Math.max(...board.brackets.map((b) => b.mult));
  return maxMult * EXP_BASE;
}

// A board's record contribution: 1 + a small bonus scaled by how close its best-ever solve
// is to the board's theoretical-best speed. RECORD_WEIGHT is the cap (best time → +12.5%);
// a slow record → +0%. No record → 1 (neutral).
export function recordTerm(bestMs: number | null, board: BoardConfig): number {
  if (bestMs === null) return 1;
  const max = speedFactorMax(board);
  return 1 + RECORD_WEIGHT * (speedFactor(bestMs, board.brackets) - 1) / (max - 1);
}

// Aggregate per-board record terms into one multiplier. Sum form: 1 + Σ(term − 1).
// Not owned → 1 (the feature is inert until the unlock is bought).
export function globalRecordMultiplier(terms: number[], recordsOwned: boolean): number {
  if (!recordsOwned) return 1;
  return 1 + terms.reduce((sum, t) => sum + (t - 1), 0);
}
