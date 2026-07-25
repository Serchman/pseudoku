# Balance Simulator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A deterministic pacing simulator (per-section strategy tournament over the unlock ladder) with an `npm run balance` report and CI band tests, per `docs/superpowers/specs/2026-07-25-balance-simulator-design.md`.

**Architecture:** One pure module `src/lib/game/simulate.ts` reusing the real economy functions (`computeScore`, `boardWorth`, `difficultyFactor`, `recordTerm`, `globalRecordMultiplier`, `GATE_COSTS`, `PROGRESSION`, `BOARDS`). Only new logic: skill profiles, strategy grind policies, bank/buy accounting, and the tournament loop. A `vite-node` script prints the report; vitest pins the engaged-profile pacing curve.

**Tech Stack:** TypeScript, Vitest (node env for sim tests, jsdom for the cross-check), vite-node (already installed transitively via vitest — no new dependency).

## Global Constraints

- Work in the `feat/balance-simulator` worktree: `D:\Development\Personal Apps\games\sudokuincremental\.claude\worktrees\balance-simulator`. Never write to the primary checkout (CLAUDE.md §5; a PreToolUse hook enforces this).
- `node_modules` in the worktree is a junction to the primary checkout's — already created. If missing: `New-Item -ItemType Junction -Path node_modules -Target '..\..\..\node_modules'`.
- Done = `npm run check` + `npm test` + `npm run build` all pass (CLAUDE.md).
- `docs/` is gitignored — commit plan/spec docs with `git add -f`; source files stage normally.
- No randomness, no `Date.now()` — the sim is fully deterministic.
- Follow existing style: 2-space indent, semicolons, `//` comments explaining constraints only.

---

### Task 1: Solve model and payout helpers

**Files:**
- Create: `src/lib/game/simulate.ts`
- Test: `src/lib/game/simulate.test.ts`

**Interfaces:**
- Consumes: `computeScore`, `boardWorth`, `difficultyFactor` from `./scoring`; `BOARDS`, `GLOBAL_MULTIPLIER`, `DifficultyTier` from `./config`.
- Produces (used by Tasks 2–6): `SkillProfile { id, secPerBlank, overheadSec }`, `PROFILES: SkillProfile[]` (ids `'speedy' | 'engaged' | 'casual' | 'mobile'`), `solveTimeMs(profile, tier): number`, `solvePoints(profile, boardId, tier, speedBonusOwned): number`, `pointsPerSec(profile, boardId, tier, speedBonusOwned): number`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/game/simulate.test.ts
import { describe, it, expect } from 'vitest';
import { BOARDS } from './config';
import { PROFILES, solveTimeMs, solvePoints, pointsPerSec } from './simulate';

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
```

- [ ] **Step 2: Run test to verify it fails**

Run (from the worktree root): `npx vitest run src/lib/game/simulate.test.ts`
Expected: FAIL — `Failed to resolve import "./simulate"`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/game/simulate.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/game/simulate.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/game/simulate.ts src/lib/game/simulate.test.ts
git commit -m "feat: balance-sim solve model and payout helpers"
```

---

### Task 2: Ownership helpers and strategy picks

**Files:**
- Modify: `src/lib/game/simulate.ts` (append)
- Test: `src/lib/game/simulate.test.ts` (append)

**Interfaces:**
- Consumes: Task 1's `SkillProfile`, `pointsPerSec`; `BOARDS`, `BOARD_ORDER` from `./config`.
- Produces (used by Tasks 3–5): `StrategyId = 'optimalRate' | 'singleBoard' | 'allBoards' | 'naive'`, `STRATEGIES: StrategyId[]` (in that order — it is the tournament tie-break order), `ownedBoards(owned): string[]`, `ownedTiers(boardId, owned): DifficultyTier[]`, `bestTier(profile, boardId, owned): DifficultyTier`, `strategyPicks(strategy, profile, owned): { boardId: string; tier: DifficultyTier }[]`.

- [ ] **Step 1: Write the failing test** (append to `simulate.test.ts`)

```ts
import { ownedBoards, ownedTiers, bestTier, strategyPicks } from './simulate';

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/game/simulate.test.ts`
Expected: FAIL — `ownedBoards` is not exported.

- [ ] **Step 3: Write minimal implementation** (append to `simulate.ts`; add `BOARD_ORDER` to the `./config` import)

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/game/simulate.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/game/simulate.ts src/lib/game/simulate.test.ts
git commit -m "feat: balance-sim ownership helpers and strategy picks"
```

---

### Task 3: Section simulation (grind → bank → buy)

**Files:**
- Modify: `src/lib/game/simulate.ts` (append)
- Test: `src/lib/game/simulate.test.ts` (append)

**Interfaces:**
- Consumes: Tasks 1–2; `GATE_COSTS` from `./config`; `recordTerm`, `globalRecordMultiplier` from `./scoring`.
- Produces (used by Task 4): `SimState { pointokus, pending, owned: Set<string>, records: Record<string, number> }`, `initialState(): SimState`, `SectionResult { wallClockSec, solves, endState }`, `simulateSection(start, gate, strategy, profile): SectionResult`.

- [ ] **Step 1: Write the failing test** (append to `simulate.test.ts`)

```ts
import { initialState, simulateSection } from './simulate';

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/game/simulate.test.ts`
Expected: FAIL — `initialState` is not exported.

- [ ] **Step 3: Write minimal implementation** (append to `simulate.ts`; add `GATE_COSTS` to the `./config` import and `recordTerm`, `globalRecordMultiplier` to the `./scoring` import)

```ts
export interface SimState {
  pointokus: number;               // banked, spendable
  pending: number;                 // earned since last bank (resetAll)
  owned: Set<string>;              // bought gate ids (PROGRESSION granularity)
  records: Record<string, number>; // boardId -> best solve ms
}

export function initialState(): SimState {
  return { pointokus: 0, pending: 0, owned: new Set(), records: {} };
}

function cloneState(s: SimState): SimState {
  return { pointokus: s.pointokus, pending: s.pending, owned: new Set(s.owned), records: { ...s.records } };
}

// Mirrors state.svelte.ts's recordMultiplier $derived.
function currentRecordMultiplier(state: SimState): number {
  const terms = ownedBoards(state.owned).map((id) => recordTerm(state.records[id] ?? null, BOARDS[id]));
  return globalRecordMultiplier(terms, state.owned.has('records'));
}

export interface SectionResult {
  wallClockSec: number;
  solves: number;
  endState: SimState;
}

// Grind with `strategy` from `start` until `gate` is bought. Mirrors the real game:
// solves accrue pending; banking (the resetAll prestige) converts pending × record
// multiplier into pointokus; bank-and-buy happens the moment the gate is affordable.
export function simulateSection(
  start: SimState,
  gate: string,
  strategy: StrategyId,
  profile: SkillProfile,
): SectionResult {
  const state = cloneState(start);
  const cost = GATE_COSTS[gate];
  let wallClockSec = 0;
  let solves = 0;

  const banked = () => state.pointokus + Math.round(state.pending * currentRecordMultiplier(state));

  grind: while (banked() < cost) {
    for (const { boardId, tier } of strategyPicks(strategy, profile, state.owned)) {
      const timeMs = solveTimeMs(profile, tier);
      state.pending += solvePoints(profile, boardId, tier, state.owned.has('speed-bonus'));
      const prev = state.records[boardId];
      if (prev === undefined || timeMs < prev) state.records[boardId] = timeMs;
      wallClockSec += timeMs / 1000 + profile.overheadSec;
      solves++;
      // Guard: a balance bug that zeroes income must fail tests, not hang them.
      if (solves > 100_000) throw new Error(`section '${gate}' (${strategy}) did not converge`);
      if (banked() >= cost) break grind;
    }
  }

  state.pointokus = banked() - cost;
  state.pending = 0;
  state.owned.add(gate);

  return { wallClockSec, solves, endState: state };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/game/simulate.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/game/simulate.ts src/lib/game/simulate.test.ts
git commit -m "feat: balance-sim section simulation with bank-and-buy accounting"
```

---

### Task 4: Ladder tournament

**Files:**
- Modify: `src/lib/game/simulate.ts` (append)
- Test: `src/lib/game/simulate.test.ts` (append)

**Interfaces:**
- Consumes: Tasks 1–3; `PROGRESSION` from `./config`.
- Produces (used by Task 5 and the band test): `LadderSection { gate, cost, results: Record<StrategyId, { wallClockSec, solves }>, winner: StrategyId, cumulativeSec }`, `runLadder(profile): LadderSection[]`.

- [ ] **Step 1: Write the failing test** (append to `simulate.test.ts`)

```ts
import { runLadder, STRATEGIES } from './simulate';
import { PROGRESSION } from './config';

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/game/simulate.test.ts`
Expected: FAIL — `runLadder` is not exported.

- [ ] **Step 3: Write minimal implementation** (append to `simulate.ts`; add `PROGRESSION` to the `./config` import)

```ts
export interface LadderSection {
  gate: string;
  cost: number;
  results: Record<StrategyId, { wallClockSec: number; solves: number }>;
  winner: StrategyId;
  cumulativeSec: number;
}

// Per-section tournament: every strategy runs each section from the same start
// state; the fastest wins (ties: STRATEGIES order) and its end state seeds the
// next section. The chained winners are the pacing curve the tests pin.
export function runLadder(profile: SkillProfile): LadderSection[] {
  let state = initialState();
  let cumulativeSec = 0;
  return PROGRESSION.map((p) => {
    const results = {} as LadderSection['results'];
    let winner = STRATEGIES[0];
    let winnerResult: SectionResult | undefined;
    for (const strategy of STRATEGIES) {
      const r = simulateSection(state, p.gate, strategy, profile);
      results[strategy] = { wallClockSec: r.wallClockSec, solves: r.solves };
      if (winnerResult === undefined || r.wallClockSec < winnerResult.wallClockSec) {
        winner = strategy;
        winnerResult = r;
      }
    }
    state = winnerResult!.endState;
    cumulativeSec += winnerResult!.wallClockSec;
    return { gate: p.gate, cost: GATE_COSTS[p.gate], results, winner, cumulativeSec };
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/game/simulate.test.ts`
Expected: PASS (12 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/game/simulate.ts src/lib/game/simulate.test.ts
git commit -m "feat: balance-sim per-section strategy tournament"
```

---

### Task 5: Rate table, report script, npm run balance

**Files:**
- Modify: `src/lib/game/simulate.ts` (append), `package.json` (scripts)
- Create: `scripts/balance-report.ts`
- Test: `src/lib/game/simulate.test.ts` (append)

**Interfaces:**
- Consumes: Tasks 1–4; `formatClock` from `../src/lib/game/meter` (script only).
- Produces: `RateRow { boardId, tierId, pointsPerMin }`, `rateTable(profile): RateRow[]`; `npm run balance` prints the three report tables.

- [ ] **Step 1: Write the failing test** (append to `simulate.test.ts`)

```ts
import { rateTable } from './simulate';

describe('rateTable', () => {
  it('covers every board × tier with speed-boosted rates', () => {
    const ENGAGED = PROFILES.find((p) => p.id === 'engaged')!;
    const rows = rateTable(ENGAGED);
    expect(rows.map((r) => `${r.boardId}:${r.tierId}`)).toEqual([
      'default:easy', 'default:medium', 'default:hard',
      'board6x3:easy', 'board6x3:medium', 'board6x3:hard',
    ]);
    // engaged 3×3 Easy: 20 pts / 9 s wall-clock → ×60
    expect(rows[0].pointsPerMin).toBeCloseTo((20 / 9) * 60);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/game/simulate.test.ts`
Expected: FAIL — `rateTable` is not exported.

- [ ] **Step 3: Implement `rateTable`** (append to `simulate.ts`)

```ts
export interface RateRow {
  boardId: string;
  tierId: string;
  pointsPerMin: number;
}

// Points/min for every board × tier (speed bonus assumed owned — true for all
// but the first gate). Surfaces rate traps regardless of ownership.
export function rateTable(profile: SkillProfile): RateRow[] {
  return BOARD_ORDER.flatMap((boardId) =>
    BOARDS[boardId].tiers.map((tier) => ({
      boardId,
      tierId: tier.id,
      pointsPerMin: pointsPerSec(profile, boardId, tier, true) * 60,
    })),
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/game/simulate.test.ts`
Expected: PASS (13 tests).

- [ ] **Step 5: Write the report script**

```ts
// scripts/balance-report.ts — pacing/strategy/rate report. Run: npm run balance
import { PROFILES, STRATEGIES, runLadder, rateTable } from '../src/lib/game/simulate';
import { formatClock } from '../src/lib/game/meter';

const fmt = (sec: number) => formatClock(sec * 1000);

for (const profile of PROFILES) {
  console.log(`\n=== ${profile.id} (${profile.secPerBlank} s/blank, +${profile.overheadSec} s overhead) ===`);
  const ladder = runLadder(profile);

  console.log('\nPacing (chained winners):');
  console.log('gate'.padEnd(18) + 'cost'.padStart(6) + 'solves'.padStart(8) + 'section'.padStart(9) + 'total'.padStart(9));
  for (const s of ladder) {
    const w = s.results[s.winner];
    console.log(
      s.gate.padEnd(18) + String(s.cost).padStart(6) + String(w.solves).padStart(8) +
      fmt(w.wallClockSec).padStart(9) + fmt(s.cumulativeSec).padStart(9),
    );
  }

  console.log('\nStrategy map (section wall-clock, * = winner):');
  console.log('gate'.padEnd(18) + STRATEGIES.map((id) => id.padStart(13)).join(''));
  for (const s of ladder) {
    const cells = STRATEGIES.map((id) =>
      (fmt(s.results[id].wallClockSec) + (id === s.winner ? '*' : ' ')).padStart(13),
    );
    console.log(s.gate.padEnd(18) + cells.join(''));
  }

  console.log('\nRate table (points/min, speed bonus owned):');
  for (const r of rateTable(profile)) {
    console.log(`${r.boardId}:${r.tierId}`.padEnd(18) + r.pointsPerMin.toFixed(1).padStart(8));
  }
}
```

- [ ] **Step 6: Add the npm script**

In `package.json` `"scripts"`, after `"check"`:

```json
    "check": "svelte-check --tsconfig ./tsconfig.json",
    "balance": "vite-node scripts/balance-report.ts"
```

- [ ] **Step 7: Run the report**

Run: `npm run balance`
Expected: four profile blocks, each with the three tables; no NaN/undefined anywhere; every pacing `total` column strictly increasing.

- [ ] **Step 8: Commit**

```bash
git add src/lib/game/simulate.ts src/lib/game/simulate.test.ts scripts/balance-report.ts package.json
git commit -m "feat: balance-sim rate table and npm run balance report"
```

---

### Task 6: Real-game cross-check (drift alarm)

**Files:**
- Create: `src/lib/game/simulate.crosscheck.test.ts`

**Interfaces:**
- Consumes: `createGame` from `./state.svelte`; `PROFILES`, `solvePoints` from `./simulate`; `BOARDS` from `./config`.
- Produces: nothing — this test exists to fail when `state.svelte.ts` banking/scoring wiring changes without the sim being updated.

- [ ] **Step 1: Write the test** (it should pass immediately — it validates agreement, not new code)

```ts
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createGame } from './state.svelte';
import { BOARDS } from './config';
import { PROFILES, solvePoints } from './simulate';

const ENGAGED = PROFILES.find((p) => p.id === 'engaged')!;
const easy3x3 = BOARDS.default.tiers[0];

// Same approach as state.test.ts's solveDefault: the 3×3 board is a permutation
// of 1..9, so blanks take exactly the missing values.
function solveDefault(game: ReturnType<typeof createGame>): void {
  const b = game.board!;
  const present = new Set(b.filter((c) => c.value !== null).map((c) => c.value));
  const missing: number[] = [];
  for (let v = 1; v <= 9; v++) if (!present.has(v)) missing.push(v);
  const emptyIdx = b.map((c, i) => (c.value === null ? i : -1)).filter((i) => i >= 0);
  emptyIdx.forEach((idx, k) => {
    game.select(idx);
    game.place(missing[k]);
  });
}

// Solve the active board with the wall clock pinned so timeMs === solveMs exactly.
function solveAt(game: ReturnType<typeof createGame>, solveMs: number): void {
  const nowSpy = vi.spyOn(performance, 'now');
  nowSpy.mockReturnValue(0);
  game.start();
  nowSpy.mockReturnValue(solveMs);
  solveDefault(game);
  expect(game.status).toBe('complete');
}

describe('simulator agrees with the real game', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('per-solve payout and banking match, without speed bonus', () => {
    const game = createGame();
    solveAt(game, 6000); // engaged-profile easy solve: 2 s/blank × 3 blanks
    solveAt(game, 6000);
    game.resetAll(); // bank

    const simPoints = 2 * solvePoints(ENGAGED, 'default', easy3x3, false);
    expect(game.pointokus).toBe(simPoints); // 20
  });

  it('per-solve payout and banking match, with speed bonus owned', () => {
    localStorage.setItem('sudoku-incremental:pointokus', '30');
    const game = createGame();
    game.buyUnlock('speed-bonus');
    expect(game.speedBonusOwned).toBe(true);

    solveAt(game, 6000);
    game.resetAll();

    const simPoints = solvePoints(ENGAGED, 'default', easy3x3, true);
    expect(game.pointokus).toBe(simPoints); // 20: banked pending, 0 left from the buy
  });
});
```

- [ ] **Step 2: Run it**

Run: `npx vitest run src/lib/game/simulate.crosscheck.test.ts`
Expected: PASS (2 tests). If it fails, the sim's accounting disagrees with `state.svelte.ts` — fix the sim, not the game.

- [ ] **Step 3: Run the whole suite**

Run: `npm test`
Expected: all files pass (146 pre-existing + the new simulate tests).

- [ ] **Step 4: Commit**

```bash
git add src/lib/game/simulate.crosscheck.test.ts
git commit -m "test: cross-check balance sim accounting against the real game"
```

---

### Task 7: Baseline bands (user approval gate) + full verification

**Files:**
- Modify: `src/lib/game/simulate.test.ts` (append)

**Interfaces:**
- Consumes: Task 4's `runLadder`; Task 5's report.

- [ ] **Step 1: Generate the baseline**

Run: `npm run balance`
Copy the engaged profile's pacing table (gate → cumulative `total` seconds).

- [ ] **Step 2: STOP — present the numbers to the user**

Show the user the full report (all four profiles' pacing + strategy map + rate table) and ask them to approve the engaged-profile cumulative numbers as the pinned baseline. **Do not proceed until they approve.** They may retune constants first — if so, re-run the report and re-present.

- [ ] **Step 3: Write the band test with the approved numbers** (append to `simulate.test.ts`)

```ts
// Approved pacing baseline (engaged profile, chained winners), pinned per the
// balance-simulator spec. If a change moves pacing outside ±25%, either fix the
// change or consciously re-approve and update this table (like progression.test.ts).
const EXPECTED_ENGAGED_CUMULATIVE_SEC: Record<string, number> = {
  // filled from the approved npm run balance output, e.g.:
  // 'speed-bonus': 27,
  // 'default:medium': 90,
  // ... one entry per PROGRESSION gate ...
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
```

Replace the placeholder entries with the real approved values — the test must fail on an empty table (`toBeDefined` guard), so it cannot be silently skipped.

- [ ] **Step 4: Run the full verification**

Run: `npm run check && npm test && npm run build`
Expected: all three pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/game/simulate.test.ts
git commit -m "test: pin approved engaged-profile pacing bands"
```

---

## Self-review notes

- Spec coverage: profiles (T1), strategies + rate-picked tiers (T2), bank/buy + records-from-play (T3), tournament + chaining + termination (T4), report's three tables + npm script (T5), cross-check (T6), bands + approval gate (T7). Future extensions are documentation only — no task, per spec.
- The known-value tests (27 s / 90 s) double as the worked examples from the design discussion; if profile constants are retuned during implementation, Tasks 1–3's expected literals must be recomputed with the same arithmetic shown in the comments.
- `simulate.test.ts` accumulates imports across tasks; vitest allows multiple `import` statements from `./simulate` — engineers may merge them.
