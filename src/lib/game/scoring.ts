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
