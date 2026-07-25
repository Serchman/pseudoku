import type { DifficultyTier } from './config';
import { BOARDS, GLOBAL_MULTIPLIER } from './config';
import { computeScore, boardWorth, difficultyFactor } from './scoring';

export interface SkillProfile {
  id: string;
  secPerBlank: number; // seconds of solve time per blank cell
  overheadSec: number; // between-solve overhead (start click, menus, banking)
}

// Deterministic player archetypes. The engaged profile's typical speed multiple
// should sit near REF_SPEED_MULT (2.5) — checked in simulate.test.ts.
export const PROFILES: SkillProfile[] = [
  { id: 'speedy', secPerBlank: 1, overheadSec: 2 },
  { id: 'engaged', secPerBlank: 2, overheadSec: 3 },
  { id: 'casual', secPerBlank: 4, overheadSec: 5 },
  { id: 'mobile', secPerBlank: 5, overheadSec: 8 },
];

export function solveTimeMs(profile: SkillProfile, tier: DifficultyTier): number {
  return profile.secPerBlank * tier.emptyCells * 1000;
}

// Payout of one solve, via the real scoring pipeline (no duplicated math).
export function solvePoints(
  profile: SkillProfile,
  boardId: string,
  tier: DifficultyTier,
  speedBonusOwned: boolean,
): number {
  const b = BOARDS[boardId];
  return computeScore(solveTimeMs(profile, tier), b.brackets, {
    speedBonusOwned,
    globalMultiplier: GLOBAL_MULTIPLIER,
    boardWorth: boardWorth(b),
    difficultyFactor: difficultyFactor(tier.emptyCells, b.cols * b.rows),
  }).points;
}

// Points per second of wall-clock (solve + overhead) — the grind metric.
export function pointsPerSec(
  profile: SkillProfile,
  boardId: string,
  tier: DifficultyTier,
  speedBonusOwned: boolean,
): number {
  return (
    solvePoints(profile, boardId, tier, speedBonusOwned) /
    (solveTimeMs(profile, tier) / 1000 + profile.overheadSec)
  );
}
