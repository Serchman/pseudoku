import type { Bracket } from './config';
import { FLAT_POINTS, EXP_BASE } from './config';

export interface ScoreResult {
  points: number;
  bracketMult: number;
  expFactor: number;
  speedApplied: boolean;
}

export function computeScore(
  timeMs: number,
  brackets: Bracket[],
  opts: { speedBonusOwned: boolean; globalMultiplier: number; difficultyMult: number },
): ScoreResult {
  if (!opts.speedBonusOwned) {
    return {
      points: Math.round(FLAT_POINTS * opts.difficultyMult),
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
  const points = Math.round(
    FLAT_POINTS * bracketMult * expFactor * opts.globalMultiplier * opts.difficultyMult,
  );

  return { points, bracketMult, expFactor, speedApplied: true };
}
