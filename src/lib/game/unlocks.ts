import { GATE_COSTS } from './config';

export interface Unlock {
  id: string;
  title: string;
  description: string;
  cost: number;
}

// Ordered, data-driven (future tree nodes slot in). Phase 1 seed:
export const UNLOCKS: Unlock[] = [
  { id: 'speed-bonus', title: 'Speed Bonus', description: 'Solve time now boosts points.', cost: GATE_COSTS['speed-bonus'] },
  { id: 'records', title: 'Records', description: 'Your fastest time on each board grants a permanent multiplier to banked points.', cost: GATE_COSTS['records'] },
];

// "Next unlock" = first unowned entry (or undefined when all owned).
export function getNextUnlock(ownedIds: ReadonlySet<string>): Unlock | undefined {
  return UNLOCKS.find((u) => !ownedIds.has(u.id));
}

// Affordability/eligibility decision for buying an unlock (pure; used by game state's buyUnlock).
export function canBuy(id: string, pointokus: number, ownedIds: ReadonlySet<string>): boolean {
  const u = UNLOCKS.find((x) => x.id === id);
  if (u === undefined) return false;      // unknown id
  if (ownedIds.has(u.id)) return false;   // already owned
  return pointokus >= u.cost;             // affordable
}
