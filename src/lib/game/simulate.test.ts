import { describe, it, expect } from 'vitest';
import { BOARDS } from './config';
import { PROFILES, solveTimeMs, solvePoints, pointsPerSec } from './simulate';
import { ownedBoards, ownedTiers, bestTier, strategyPicks } from './simulate';
import { initialState, simulateSection } from './simulate';

const ENGAGED = PROFILES.find((p) => p.id === 'engaged')!;
const easy3x3 = BOARDS.default.tiers[0];

describe('solve model', () => {
  it('solve time is secPerBlank × emptyCells', () => {
    // engaged = 2 s/blank; 3×3 Easy has 3 blanks
    expect(solveTimeMs(ENGAGED, easy3x3)).toBe(6000);
  });

  it('payout matches the real scoring formula', () => {
    // 6 s lands the ≤6 s bracket (mult 2) exactly at its edge (expFactor 1):
    // base 10 × 2 = 20 with Speed Bonus, flat 10 without.
    expect(solvePoints(ENGAGED, 'default', easy3x3, false)).toBe(10);
    expect(solvePoints(ENGAGED, 'default', easy3x3, true)).toBe(20);
  });

  it('rate divides payout by solve time plus overhead', () => {
    // engaged overhead 3 s → 20 pts / (6 s + 3 s)
    expect(pointsPerSec(ENGAGED, 'default', easy3x3, true)).toBeCloseTo(20 / 9);
  });
});

describe('ownership and strategy picks', () => {
  // Gate ids follow PROGRESSION: unlocks ('speed-bonus'), boards ('board6x3'),
  // tiers ('default:medium'). Free content (default board, every Easy) needs no gate.
  const START = new Set<string>();
  const MID = new Set(['speed-bonus', 'default:medium', 'board6x3']);

  it('free content is owned from the start; gates add boards and tiers', () => {
    expect(ownedBoards(START)).toEqual(['default']);
    expect(ownedTiers('default', START).map((t) => t.id)).toEqual(['easy']);
    expect(ownedBoards(MID)).toEqual(['default', 'board6x3']);
    expect(ownedTiers('default', MID).map((t) => t.id)).toEqual(['easy', 'medium']);
    expect(ownedTiers('board6x3', MID).map((t) => t.id)).toEqual(['easy']);
  });

  it('bestTier picks by rate, not by difficulty', () => {
    // engaged on 3×3: Medium takes 10 s (past every bracket, ×1) → 22 pts at
    // 22/13 ≈ 1.7/s, worse than Easy's 20/9 ≈ 2.2/s. Rate-picking keeps Easy.
    const ENGAGED = PROFILES.find((p) => p.id === 'engaged')!;
    expect(bestTier(ENGAGED, 'default', MID).id).toBe('easy');
  });

  it('each strategy grinds the boards the spec says', () => {
    const ENGAGED = PROFILES.find((p) => p.id === 'engaged')!;
    expect(strategyPicks('singleBoard', ENGAGED, MID).map((p) => p.boardId)).toEqual(['default']);
    expect(strategyPicks('allBoards', ENGAGED, MID).map((p) => p.boardId)).toEqual(['default', 'board6x3']);
    const naive = strategyPicks('naive', ENGAGED, MID);
    expect(naive).toHaveLength(1);
    expect(naive[0].boardId).toBe('board6x3'); // highest board...
    expect(naive[0].tier.id).toBe('easy');     // ...at its highest OWNED tier
    expect(strategyPicks('optimalRate', ENGAGED, MID)).toHaveLength(1);
  });
});

describe('simulateSection', () => {
  const ENGAGED = PROFILES.find((p) => p.id === 'engaged')!;

  it('section 1: 3 easy solves at 10 pts buy Speed Bonus (cost 30)', () => {
    const r = simulateSection(initialState(), 'speed-bonus', 'optimalRate', ENGAGED);
    expect(r.solves).toBe(3);
    expect(r.wallClockSec).toBe(27); // 3 × (6 s solve + 3 s overhead)
    expect(r.endState.owned.has('speed-bonus')).toBe(true);
    expect(r.endState.pointokus).toBe(0); // banked 30, spent 30
    expect(r.endState.pending).toBe(0);
    expect(r.endState.records.default).toBe(6000); // record set by play
  });

  it('section 2: speed-boosted easy solves buy default:medium (cost 125)', () => {
    const afterOne = simulateSection(initialState(), 'speed-bonus', 'optimalRate', ENGAGED);
    const r = simulateSection(afterOne.endState, 'default:medium', 'optimalRate', ENGAGED);
    expect(r.solves).toBe(7); // ceil(125 / 20)
    expect(r.wallClockSec).toBe(63);
    expect(r.endState.pointokus).toBe(15); // banked 140, spent 125
  });

  it('a section can be bought instantly from leftovers (0 solves)', () => {
    const rich = initialState();
    rich.pointokus = 1000;
    const r = simulateSection(rich, 'speed-bonus', 'singleBoard', ENGAGED);
    expect(r.solves).toBe(0);
    expect(r.wallClockSec).toBe(0);
    expect(r.endState.pointokus).toBe(970);
  });
});
