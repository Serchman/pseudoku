import { describe, it, expect } from 'vitest';
import { BOARDS } from './config';
import { PROFILES, solveTimeMs, solvePoints, pointsPerSec } from './simulate';
import { ownedBoards, ownedTiers, bestTier, strategyPicks } from './simulate';
import { initialState, simulateSection } from './simulate';
import { runLadder, STRATEGIES } from './simulate';
import { rateTable } from './simulate';
import { PROGRESSION } from './config';

const ENGAGED = PROFILES.find((p) => p.id === 'engaged')!;
const easy3x3 = BOARDS.default.tiers[0];

describe('solve model', () => {
  it('solve time is the board/tier reference time × skill multiplier', () => {
    // engaged skillMult 2; 3×3 Easy reference is 1.5 s → 3.0 s
    expect(solveTimeMs(ENGAGED, easy3x3)).toBe(3000);
  });

  it('every tier carries its reference solve time (config is the single source)', () => {
    expect(BOARDS.default.tiers.map((t) => t.refSolveSec)).toEqual([1.5, 2, 2]);
    expect(BOARDS.board6x3.tiers.map((t) => t.refSolveSec)).toEqual([7, 10, 12]);
  });

  it('payout matches the real scoring formula', () => {
    // no Speed Bonus → flat base 10 (time-independent).
    // with Speed Bonus: engaged pianos 3×3 Easy in 3 s → ≤3 s bracket (mult 5),
    // expFactor 1 at the edge → 10 × 5 = 50.
    expect(solvePoints(ENGAGED, 'default', easy3x3, false)).toBe(10);
    expect(solvePoints(ENGAGED, 'default', easy3x3, true)).toBe(50);
  });

  it('rate divides payout by solve time plus overhead', () => {
    // engaged overhead 3 s → 50 pts / (3 s + 3 s)
    expect(pointsPerSec(ENGAGED, 'default', easy3x3, true)).toBeCloseTo(50 / 6);
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
    // engaged on 3×3 with Speed Bonus: Easy solves in 3 s → 50 pts / 6 s = 8.3/s;
    // Medium in 4 s → ≤4 s bracket (mult 3) → 86 pts / 7 s = 12.3/s (base 10 × 4/3 ×
    // 2.1517 ≈ 28.69, ×3 bracket). With realistic piano solve times Medium now
    // out-rates Easy — the old rate trap is gone.
    const ENGAGED = PROFILES.find((p) => p.id === 'engaged')!;
    expect(bestTier(ENGAGED, 'default', MID).id).toBe('medium');
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
    expect(r.wallClockSec).toBe(18); // 3 × (3 s solve + 3 s overhead)
    expect(r.endState.owned.has('speed-bonus')).toBe(true);
    expect(r.endState.pointokus).toBe(0); // banked 30, spent 30
    expect(r.endState.pending).toBe(0);
    expect(r.endState.records.default).toBe(3000); // record set by play
  });

  it('section 2: speed-boosted easy solves buy default:medium (cost 125)', () => {
    const afterOne = simulateSection(initialState(), 'speed-bonus', 'optimalRate', ENGAGED);
    const r = simulateSection(afterOne.endState, 'default:medium', 'optimalRate', ENGAGED);
    expect(r.solves).toBe(3); // ceil(125 / 50): easy pays 50 with Speed Bonus now
    expect(r.wallClockSec).toBe(18);
    expect(r.endState.pointokus).toBe(25); // banked 150, spent 125
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

describe('runLadder', () => {
  const ENGAGED = PROFILES.find((p) => p.id === 'engaged')!;

  it('reaches every gate in PROGRESSION order with strictly increasing wall-clock', () => {
    const ladder = runLadder(ENGAGED);
    expect(ladder.map((s) => s.gate)).toEqual(PROGRESSION.map((p) => p.gate));
    for (let i = 1; i < ladder.length; i++) {
      expect(ladder[i].cumulativeSec).toBeGreaterThan(ladder[i - 1].cumulativeSec);
    }
  });

  it('every section has a result for every strategy and a listed winner', () => {
    for (const s of runLadder(ENGAGED)) {
      expect(Object.keys(s.results).sort()).toEqual([...STRATEGIES].sort());
      expect(STRATEGIES).toContain(s.winner);
      const w = s.results[s.winner];
      for (const id of STRATEGIES) {
        expect(w.wallClockSec).toBeLessThanOrEqual(s.results[id].wallClockSec);
      }
    }
  });

  it('terminates for every profile', () => {
    for (const p of PROFILES) {
      expect(runLadder(p)).toHaveLength(PROGRESSION.length);
    }
  });
});

describe('rateTable', () => {
  it('covers every board × tier with speed-boosted rates', () => {
    const ENGAGED = PROFILES.find((p) => p.id === 'engaged')!;
    const rows = rateTable(ENGAGED);
    expect(rows.map((r) => `${r.boardId}:${r.tierId}`)).toEqual([
      'default:easy', 'default:medium', 'default:hard',
      'board6x3:easy', 'board6x3:medium', 'board6x3:hard',
      'board3x9:easy', 'board3x9:medium', 'board3x9:hard',
    ]);
    // engaged 3×3 Easy: 50 pts / 6 s wall-clock → ×60
    expect(rows[0].pointsPerMin).toBeCloseTo((50 / 6) * 60);
  });
});

describe('rate ladder', () => {
  it('bigger boards and harder tiers are strictly more profitable, for every profile', () => {
    for (const p of PROFILES) {
      const rates = Object.fromEntries(
        rateTable(p).map((r) => [`${r.boardId}:${r.tierId}`, r.pointsPerMin]),
      );
      // within-board: harder out-earns easier
      expect(rates['default:medium'], p.id).toBeGreaterThan(rates['default:easy']);
      expect(rates['default:hard'], p.id).toBeGreaterThan(rates['default:medium']);
      expect(rates['board6x3:medium'], p.id).toBeGreaterThan(rates['board6x3:easy']);
      expect(rates['board6x3:hard'], p.id).toBeGreaterThan(rates['board6x3:medium']);
      expect(rates['board3x9:medium'], p.id).toBeGreaterThan(rates['board3x9:easy']);
      expect(rates['board3x9:hard'], p.id).toBeGreaterThan(rates['board3x9:medium']);
      // cross-board: the 6×3 floor clears the 3×3 ceiling
      expect(rates['board6x3:easy'], p.id).toBeGreaterThan(rates['default:hard']);
      // cross-board: the 3×9 floor clears the 6×3 ceiling
      expect(rates['board3x9:easy'], p.id).toBeGreaterThan(rates['board6x3:hard']);
    }
  });
});

// Approved pacing baseline (engaged profile, chained winners), pinned per the
// balance-simulator spec after the per-board solve-time model. If a change moves
// pacing outside ±25%, either fix the change or consciously re-approve and update
// this table (like progression.test.ts).
const EXPECTED_ENGAGED_CUMULATIVE_SEC: Record<string, number> = {
  'speed-bonus': 18,
  'default:medium': 36,
  'board6x3': 85,
  'default:hard': 170,
  'board6x3:medium': 289,
  'board6x3:hard': 588,
  'records': 858,
  'board3x9': 1155,
  'board3x9:medium': 1353,
  'board3x9:hard': 1588,
};
const BAND = 0.25;

describe('pacing bands', () => {
  it('engaged-profile pacing stays within the approved bands', () => {
    const ENGAGED = PROFILES.find((p) => p.id === 'engaged')!;
    for (const s of runLadder(ENGAGED)) {
      const expected = EXPECTED_ENGAGED_CUMULATIVE_SEC[s.gate];
      expect(expected, `no approved baseline for gate '${s.gate}'`).toBeDefined();
      expect(s.cumulativeSec).toBeGreaterThanOrEqual(expected * (1 - BAND));
      expect(s.cumulativeSec).toBeLessThanOrEqual(expected * (1 + BAND));
    }
  });
});
