import type { DifficultyTier } from './config';
import { BOARDS, BOARD_ORDER, GLOBAL_MULTIPLIER } from './config';
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

export type StrategyId = 'optimalRate' | 'singleBoard' | 'allBoards' | 'naive';
// Order matters: it is the tournament's tie-break order (first wins ties).
export const STRATEGIES: StrategyId[] = ['optimalRate', 'singleBoard', 'allBoards', 'naive'];

// Boards the player owns: free boards plus bought board gates.
export function ownedBoards(owned: ReadonlySet<string>): string[] {
  return BOARD_ORDER.filter((id) => BOARDS[id].cost === 0 || owned.has(id));
}

// Tiers of a board the player owns: the free starter plus bought `board:tier` gates.
export function ownedTiers(boardId: string, owned: ReadonlySet<string>): DifficultyTier[] {
  return BOARDS[boardId].tiers.filter((t) => t.cost === 0 || owned.has(`${boardId}:${t.id}`));
}

// Owned tier of a board with the best points/sec (ties keep the earlier tier).
export function bestTier(
  profile: SkillProfile,
  boardId: string,
  owned: ReadonlySet<string>,
): DifficultyTier {
  const speed = owned.has('speed-bonus');
  return ownedTiers(boardId, owned).reduce((best, t) =>
    pointsPerSec(profile, boardId, t, speed) > pointsPerSec(profile, boardId, best, speed) ? t : best,
  );
}

// One round of (board, tier) picks. Strategies choose boards; the tier within a
// board is always rate-picked — except `naive`, which models trusting the
// progression (highest board, highest owned tier).
export function strategyPicks(
  strategy: StrategyId,
  profile: SkillProfile,
  owned: ReadonlySet<string>,
): { boardId: string; tier: DifficultyTier }[] {
  const boards = ownedBoards(owned);
  switch (strategy) {
    case 'singleBoard':
      return [{ boardId: boards[0], tier: bestTier(profile, boards[0], owned) }];
    case 'allBoards':
      return boards.map((boardId) => ({ boardId, tier: bestTier(profile, boardId, owned) }));
    case 'naive': {
      const boardId = boards[boards.length - 1];
      const tiers = ownedTiers(boardId, owned);
      return [{ boardId, tier: tiers[tiers.length - 1] }];
    }
    case 'optimalRate': {
      const speed = owned.has('speed-bonus');
      const picks = boards.map((boardId) => ({ boardId, tier: bestTier(profile, boardId, owned) }));
      return [
        picks.reduce((best, p) =>
          pointsPerSec(profile, p.boardId, p.tier, speed) >
          pointsPerSec(profile, best.boardId, best.tier, speed)
            ? p
            : best,
        ),
      ];
    }
  }
}
