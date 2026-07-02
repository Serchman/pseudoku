import type { DifficultyTier } from './config';

// "Next tier" = first unowned entry (the only buyable one under sequential unlock).
export function getNextTier(
  tiers: DifficultyTier[],
  ownedIds: ReadonlySet<string>,
): DifficultyTier | undefined {
  return tiers.find((t) => !ownedIds.has(t.id));
}

export function getTierById(tiers: DifficultyTier[], id: string): DifficultyTier | undefined {
  return tiers.find((t) => t.id === id);
}

// Affordability/eligibility for buying a tier: must be the next tier, unowned, and affordable.
export function canBuyTier(
  id: string,
  pointokus: number,
  ownedIds: ReadonlySet<string>,
  tiers: DifficultyTier[],
): boolean {
  const next = getNextTier(tiers, ownedIds);
  if (next === undefined) return false;   // all owned
  if (next.id !== id) return false;       // not the sequentially-next tier
  return pointokus >= next.cost;          // affordable
}
