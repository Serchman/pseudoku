import type { Bracket } from './config';
import { EXP_BASE, POINT_SCALE } from './config';

// boardWorth / difficultyFactor now live in formula.ts; re-export so existing
// importers (state.svelte.ts, scoring.test.ts) keep importing them from here.
export { boardWorth, difficultyFactor } from './formula';

export interface ScoreResult {
  points: number;
  bracketMult: number;
  expFactor: number;
  speedApplied: boolean;
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
