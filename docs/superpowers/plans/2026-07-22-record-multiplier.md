# Record Multiplier Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent global "record multiplier" earned from each board's best-ever solve time, applied to points at the prestige/bank step, surfaced in a new Statistics tab, the board-panel, and the prestige modal.

**Architecture:** A pure speed-curve helper (`speedFactor`) is extracted from `computeScore` and reused to turn a board's best time into a "record term"; the terms aggregate into one global multiplier (`globalRecordMultiplier`). Best times are tracked per board in game state (unconditionally, persisted, surviving `resetAll`); the multiplier is applied only when banking `pendingPoints` in `resetAll`. UI reads new game-object getters — nothing is folded into per-solve `computeScore`.

**Tech Stack:** Svelte 5 (runes), TypeScript, Vite, Vitest.

## Global Constraints

- Verify gates (all must pass before a task is done): `npm run check`, `npm test`, `npm run build`.
- Game logic is unit-tested with Vitest; **components are NOT** unit-tested (no render harness).
- State tests use `// @vitest-environment jsdom`, `createGame()` + `localStorage`, and `beforeEach(() => localStorage.clear())`. Reuse the existing `solveDefault(game)` helper in `state.test.ts`.
- Every clickable element is a `<button>`. Scoped `<style>` per component; reference `app.css` tokens (`--accent`, `--muted-2`, `--dim`, `--border`, `--panel-3`, `--accent-border`, `--points`, …) rather than hardcoding hex where a token lines up.
- Any animation gets a `@media (prefers-reduced-motion: reduce) { animation: none; }` guard.
- Callbacks are passed as `on*` props; props typed inline via `$props()`.
- Keep per-tick work lean: the record multiplier must depend on records/owned state, **never** on `elapsed` (it must not recompute on the 50 ms timer tick).
- Commit after every task with the exact message shown.

**Reference spec:** `docs/superpowers/specs/2026-07-22-record-multiplier-design.md`

---

### Task 1: Extract the pure speed-curve helper from `computeScore`

Extract the bracket-selection + exponential math so the record term can reuse it. Pure refactor — `computeScore`'s observable behavior must not change.

**Files:**
- Modify: `src/lib/game/scoring.ts`
- Test: `src/lib/game/scoring.test.ts`

**Interfaces:**
- Produces:
  - `speedComponents(timeMs: number, brackets: Bracket[]): { bracketMult: number; expFactor: number }`
  - `speedFactor(timeMs: number, brackets: Bracket[]): number` (= `bracketMult * expFactor`)

- [ ] **Step 1: Write the failing test**

Add to `src/lib/game/scoring.test.ts` (import updated on the first line):

```ts
import { computeScore, speedFactor, speedComponents, boardWorth, difficultyFactor } from './scoring';
```

```ts
describe('speedFactor', () => {
  it('equals the bracket mult exactly at a bracket boundary (expFactor = 1)', () => {
    // 2.0s is the 3×3 fastest-bracket boundary → mult 8, expFactor 1
    expect(speedFactor(2000, brackets)).toBeCloseTo(8, 5);
    // 3.0s boundary → mult 5, expFactor 1
    expect(speedFactor(3000, brackets)).toBeCloseTo(5, 5);
  });

  it('exceeds the bracket mult inside a bracket (expFactor > 1)', () => {
    // 2.5s: mult 5, f = (3-2.5)/(3-2) = 0.5 → 5 × 1.5^0.5 ≈ 6.12
    expect(speedFactor(2500, brackets)).toBeCloseTo(6.1237, 3);
  });

  it('is the plain mult in the open catch-all bracket', () => {
    expect(speedFactor(50000, brackets)).toBeCloseTo(1, 5);
  });

  it('speedComponents returns the same product computeScore applies', () => {
    const { bracketMult, expFactor } = speedComponents(2500, brackets);
    expect(bracketMult * expFactor).toBeCloseTo(speedFactor(2500, brackets), 10);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/game/scoring.test.ts`
Expected: FAIL — `speedFactor`/`speedComponents` are not exported.

- [ ] **Step 3: Refactor `scoring.ts`**

Replace the body of `computeScore` and add the two helpers. The full new file section (keep the existing header comment and `boardWorth`/`difficultyFactor` re-export lines unchanged):

```ts
import type { Bracket } from './config';
import { EXP_BASE, POINT_SCALE } from './config';

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
```

- [ ] **Step 4: Run tests to verify they pass (new + regression)**

Run: `npx vitest run src/lib/game/scoring.test.ts`
Expected: PASS — the new `speedFactor` cases and all pre-existing `computeScore` cases pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/game/scoring.ts src/lib/game/scoring.test.ts
git commit -m "refactor: extract speedFactor/speedComponents from computeScore"
```

---

### Task 2: Record term and global multiplier (pure)

**Files:**
- Modify: `src/lib/game/scoring.ts`
- Test: `src/lib/game/scoring.test.ts`

**Interfaces:**
- Consumes: `speedFactor` (Task 1); `BoardConfig` type from `./config`.
- Produces:
  - `recordTerm(bestMs: number | null, board: BoardConfig): number`
  - `globalRecordMultiplier(terms: number[], recordsOwned: boolean): number`

- [ ] **Step 1: Write the failing test**

Add to `src/lib/game/scoring.test.ts`:

```ts
import { recordTerm, globalRecordMultiplier } from './scoring';

describe('recordTerm', () => {
  it('is 1 (neutral) when there is no record', () => {
    expect(recordTerm(null, BOARDS.default)).toBe(1);
  });

  it('equals the speed factor at the best time', () => {
    expect(recordTerm(2000, BOARDS.default)).toBeCloseTo(8, 5);
    expect(recordTerm(3000, BOARDS.default)).toBeCloseTo(5, 5);
    expect(recordTerm(2500, BOARDS.default)).toBeCloseTo(6.1237, 3);
  });
});

describe('globalRecordMultiplier', () => {
  it('is 1 when the records unlock is not owned, regardless of terms', () => {
    expect(globalRecordMultiplier([8, 5], false)).toBe(1);
  });

  it('is 1 when owned but there are no terms', () => {
    expect(globalRecordMultiplier([], true)).toBe(1);
  });

  it('sums 1 + Σ(term − 1) over the terms when owned', () => {
    expect(globalRecordMultiplier([8], true)).toBeCloseTo(8, 5);
    expect(globalRecordMultiplier([8, 5], true)).toBeCloseTo(12, 5); // 1 + 7 + 4
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/game/scoring.test.ts`
Expected: FAIL — `recordTerm`/`globalRecordMultiplier` not exported.

- [ ] **Step 3: Implement in `scoring.ts`**

Change the `Bracket` import to also bring in `BoardConfig`, and append the two functions at the end of the file:

```ts
import type { Bracket, BoardConfig } from './config';
```

```ts
// A board's record term: the speed multiple at its best-ever solve time. No record → 1.
export function recordTerm(bestMs: number | null, board: BoardConfig): number {
  return bestMs === null ? 1 : speedFactor(bestMs, board.brackets);
}

// Aggregate per-board record terms into one multiplier. Sum form: 1 + Σ(term − 1).
// Not owned → 1 (the feature is inert until the unlock is bought).
export function globalRecordMultiplier(terms: number[], recordsOwned: boolean): number {
  if (!recordsOwned) return 1;
  return 1 + terms.reduce((sum, t) => sum + (t - 1), 0);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/game/scoring.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/game/scoring.ts src/lib/game/scoring.test.ts
git commit -m "feat: recordTerm and globalRecordMultiplier scoring helpers"
```

---

### Task 3: `records` master unlock in the economy

Add the unlock to the progression (for a derived cost) and to the unlock tree, right after Speed Bonus.

**Files:**
- Modify: `src/lib/game/config.ts:48-55` (the `PROGRESSION` array)
- Modify: `src/lib/game/unlocks.ts:11-13` (the `UNLOCKS` array)
- Test: `src/lib/game/progression.test.ts`, `src/lib/game/unlocks.test.ts`

**Interfaces:**
- Produces: `GATE_COSTS['records'] === 100`; `UNLOCKS` contains `{ id: 'records', … }` at index 1.

- [ ] **Step 1: Update the failing tests**

In `src/lib/game/progression.test.ts`, add `records` to the `EXPECTED` table:

```ts
const EXPECTED: Record<string, number> = {
  'speed-bonus': 30,
  'records': 100,
  'default:medium': 125,
  'board6x3': 430,
  'default:hard': 800,
  'board6x3:medium': 1605,
  'board6x3:hard': 2650,
};
```

In `src/lib/game/unlocks.test.ts`, replace the two `getNextUnlock` cases with:

```ts
  it('returns the records unlock when only speed-bonus is owned', () => {
    expect(getNextUnlock(new Set(['speed-bonus']))).toBe(UNLOCKS[1]);
  });

  it('returns undefined when all unlocks are owned', () => {
    expect(getNextUnlock(new Set(['speed-bonus', 'records']))).toBeUndefined();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/game/progression.test.ts src/lib/game/unlocks.test.ts`
Expected: FAIL — `GATE_COSTS` lacks `records`; `UNLOCKS[1]` is undefined.

- [ ] **Step 3: Add the progression entry**

In `src/lib/game/config.ts`, insert into `PROGRESSION` immediately after the `speed-bonus` line:

```ts
  { gate: 'speed-bonus', n: 3, anchor: 'default:easy', withSpeed: false, requires: [] },
  { gate: 'records', n: 4, anchor: 'default:easy', withSpeed: true, requires: ['speed-bonus'] },
  { gate: 'default:medium', n: 5, anchor: 'default:easy', withSpeed: true, requires: ['default:easy'] },
```

- [ ] **Step 4: Add the unlock entry**

In `src/lib/game/unlocks.ts`, extend `UNLOCKS`:

```ts
export const UNLOCKS: Unlock[] = [
  { id: 'speed-bonus', title: 'Speed Bonus', description: 'Solve time now boosts points.', cost: GATE_COSTS['speed-bonus'] },
  { id: 'records', title: 'Records', description: 'Your fastest time on each board grants a permanent multiplier to banked points.', cost: GATE_COSTS['records'] },
];
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/lib/game/progression.test.ts src/lib/game/unlocks.test.ts`
Expected: PASS. (The `rises monotonically` case holds: 30 < 100 < 125 < 430 < …)

- [ ] **Step 6: Commit**

```bash
git add src/lib/game/config.ts src/lib/game/unlocks.ts src/lib/game/progression.test.ts src/lib/game/unlocks.test.ts
git commit -m "feat: add records master unlock (100 P) to the economy"
```

---

### Task 4: Best-time persistence

**Files:**
- Modify: `src/lib/game/storage.ts` (append at end)
- Test: `src/lib/game/storage.test.ts`

**Interfaces:**
- Produces:
  - `loadRecord(boardId: string): number | null`
  - `saveRecord(boardId: string, ms: number): void`
  - Storage key: `sudoku-incremental:record:${boardId}`

- [ ] **Step 1: Write the failing test**

Add to `src/lib/game/storage.test.ts` (extend the import from `./storage` with `loadRecord, saveRecord`):

```ts
describe('record (best time) persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when nothing is saved', () => {
    expect(loadRecord('default')).toBe(null);
  });

  it('round-trips a saved value, keyed per board', () => {
    saveRecord('default', 2500);
    expect(loadRecord('default')).toBe(2500);
    expect(loadRecord('board6x3')).toBe(null); // isolated per board
  });

  it('returns null when the stored value is not a number', () => {
    localStorage.setItem('sudoku-incremental:record:default', 'not-a-number');
    expect(loadRecord('default')).toBe(null);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/game/storage.test.ts`
Expected: FAIL — `loadRecord`/`saveRecord` not exported.

- [ ] **Step 3: Implement in `storage.ts`**

Append:

```ts
// Per-board best solve time in ms. null = no record yet (distinct from any real time).
function recordKey(boardId: string): string {
  return `sudoku-incremental:record:${boardId}`;
}

export function loadRecord(boardId: string): number | null {
  const raw = localStorage.getItem(recordKey(boardId));
  if (raw === null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function saveRecord(boardId: string, ms: number): void {
  localStorage.setItem(recordKey(boardId), String(ms));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/game/storage.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/game/storage.ts src/lib/game/storage.test.ts
git commit -m "feat: persist per-board best solve time"
```

---

### Task 5: Track best times in game state

Track and persist each board's best time on solve; expose `bestTime`. Tracking is **unconditional** (independent of the `records` unlock) and **survives `resetAll`**.

**Files:**
- Modify: `src/lib/game/state.svelte.ts`
- Test: `src/lib/game/state.test.ts`

**Interfaces:**
- Consumes: `loadRecord`, `saveRecord` (Task 4).
- Produces: `bestTime(boardId: string): number | null` on the game object; `checkWin()` updates the record.

- [ ] **Step 1: Write the failing test**

Add to `src/lib/game/state.test.ts` (extend the vitest import to include `vi`):

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
```

```ts
describe('best-time tracking', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('records the best time, only improves on a faster solve, and survives resetAll', () => {
    // performance.now() is called once in start() and once in the completing checkWin().
    // Script pairs so each solve has a known duration: 2000ms, 5000ms (slower), 1500ms (faster).
    const times = [1000, 3000, 1000, 6000, 1000, 2500];
    let i = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => times[Math.min(i++, times.length - 1)]);

    const game = createGame();

    game.start();
    solveDefault(game);
    expect(game.bestTime('default')).toBe(2000);

    game.resetAll(); // record must persist across this
    game.start();
    solveDefault(game);
    expect(game.bestTime('default')).toBe(2000); // 5000ms is slower → unchanged

    game.resetAll();
    game.start();
    solveDefault(game);
    expect(game.bestTime('default')).toBe(1500); // 1500ms is faster → improved

    expect(Number(localStorage.getItem('sudoku-incremental:record:default'))).toBe(1500);

    game.resetAll();
    vi.restoreAllMocks();
  });

  it('returns null for a board with no record', () => {
    const game = createGame();
    expect(game.bestTime('board6x3')).toBe(null);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/game/state.test.ts`
Expected: FAIL — `game.bestTime` is not a function.

- [ ] **Step 3: Wire records into state**

In `src/lib/game/state.svelte.ts`:

(a) Extend the storage import with the record helpers:

```ts
import {
  loadPointokus,
  savePointokus,
  loadUnlocks,
  saveUnlocks,
  loadOwnedTiers,
  saveOwnedTiers,
  loadSelectedTier,
  saveSelectedTier,
  loadActiveBoard,
  saveActiveBoard,
  loadOwnedBoards,
  saveOwnedBoards,
  loadRecord,
  saveRecord,
} from './storage';
```

(b) Add the `records` state near the other `$state` declarations (e.g. after `ownedBoards`):

```ts
  const initialRecords: Record<string, number> = {};
  for (const id of BOARD_ORDER) {
    const r = loadRecord(id);
    if (r !== null) initialRecords[id] = r;
  }
  let records = $state<Record<string, number>>(initialRecords);
```

(c) In `checkWin()`, after `pendingPoints += result.points;`, add the record update:

```ts
    pendingPoints += result.points;

    const prevBest = records[activeBoardId];
    if (prevBest === undefined || timeMs < prevBest) {
      records = { ...records, [activeBoardId]: timeMs }; // reassign so $derived recomputes
      saveRecord(activeBoardId, timeMs);
    }
```

(d) Add a getter to the returned object (place it near `pointokus`/`pendingPoints`):

```ts
    bestTime(boardId: string): number | null {
      return records[boardId] ?? null;
    },
```

Note: `resetAll()` is intentionally left untouched here — `records` must survive prestige.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/game/state.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/game/state.svelte.ts src/lib/game/state.test.ts
git commit -m "feat: track and persist per-board best solve times in game state"
```

---

### Task 6: Record multiplier + bank application in state

Derive the global multiplier, apply it when banking in `resetAll`, and expose the getters the UI needs.

**Files:**
- Modify: `src/lib/game/state.svelte.ts`
- Test: `src/lib/game/state.test.ts`

**Interfaces:**
- Consumes: `recordTerm`, `globalRecordMultiplier` (Task 2); `records`, `bestTime` (Task 5).
- Produces on the game object:
  - `get recordMultiplier(): number`
  - `get bankPreview(): number` (`Math.round(pendingPoints * recordMultiplier)`)
  - `get recordStats(): { id: string; name: string; bestMs: number | null; term: number }[]`
  - `get lastWasRecord(): boolean`
  - `resetAll()` banks `pendingPoints * recordMultiplier`.

- [ ] **Step 1: Write the failing test**

Add to `src/lib/game/state.test.ts`:

```ts
describe('record multiplier and banking', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to 1 with no records and no unlock', () => {
    const game = createGame();
    expect(game.recordMultiplier).toBe(1);
  });

  it('stays 1 until the records unlock is owned, then reflects best times retroactively; resetAll banks pending × multiplier', () => {
    localStorage.setItem('sudoku-incremental:pointokus', '100');
    const times = [1000, 3000]; // one 2000ms solve
    let i = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => times[Math.min(i++, times.length - 1)]);

    const game = createGame();

    game.start();
    solveDefault(game); // sets record 2000ms unconditionally; pending = 10 (speed bonus not owned → base)
    expect(game.bestTime('default')).toBe(2000);
    expect(game.pendingPoints).toBe(10);
    expect(game.recordMultiplier).toBe(1); // unlock not owned yet
    expect(game.lastWasRecord).toBe(true);

    game.buyUnlock('records'); // 100 → 0
    expect(game.recordMultiplier).toBeCloseTo(8, 5); // retroactive: term at 2000ms = 8

    game.resetAll(); // banks round(10 × 8) = 80
    expect(game.pointokus).toBe(80);
    expect(game.pendingPoints).toBe(0);
    expect(game.bestTime('default')).toBe(2000); // records survive resetAll

    vi.restoreAllMocks();
  });

  it('recordStats lists owned boards with their best time and term', () => {
    const game = createGame();
    const stats = game.recordStats;
    expect(stats).toHaveLength(1); // only the free default board is owned
    expect(stats[0]).toMatchObject({ id: 'default', bestMs: null, term: 1 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/game/state.test.ts`
Expected: FAIL — `game.recordMultiplier` is undefined.

- [ ] **Step 3: Implement in `state.svelte.ts`**

(a) Extend the scoring import:

```ts
import { computeScore, boardWorth, difficultyFactor, recordTerm, globalRecordMultiplier } from './scoring';
```

(b) Add the derived multiplier near the other `$derived` declarations (after `conflicts`):

```ts
  // Global record multiplier: aggregate of each owned board's record term. Depends on records,
  // owned boards, and the records unlock — NOT on `elapsed`, so it never recomputes on the tick.
  const recordMultiplier = $derived.by(() => {
    const terms = BOARD_ORDER
      .filter((id) => ownedBoards.has(id))
      .map((id) => recordTerm(records[id] ?? null, BOARDS[id]));
    return globalRecordMultiplier(terms, owned.has('records'));
  });
```

(c) In `resetAll()`, change the bank line:

```ts
  function resetAll() {
    stopTimer();
    pointokus += Math.round(pendingPoints * recordMultiplier);
    savePointokus(pointokus);
    pendingPoints = 0;
```

(d) Add getters to the returned object (near `bestTime`):

```ts
    get recordMultiplier() {
      return recordMultiplier;
    },
    get bankPreview() {
      return Math.round(pendingPoints * recordMultiplier);
    },
    get recordStats(): { id: string; name: string; bestMs: number | null; term: number }[] {
      return BOARD_ORDER.filter((id) => ownedBoards.has(id)).map((id) => ({
        id,
        name: BOARDS[id].name,
        bestMs: records[id] ?? null,
        term: recordTerm(records[id] ?? null, BOARDS[id]),
      }));
    },
    get lastWasRecord(): boolean {
      return (
        status === 'complete' &&
        lastResult !== null &&
        records[activeBoardId] !== undefined &&
        lastResult.timeMs === records[activeBoardId]
      );
    },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/game/state.test.ts`
Expected: PASS.

- [ ] **Step 5: Full logic suite + types**

Run: `npm test && npm run check`
Expected: PASS — all game-logic tests and svelte-check green.

- [ ] **Step 6: Commit**

```bash
git add src/lib/game/state.svelte.ts src/lib/game/state.test.ts
git commit -m "feat: derive record multiplier and apply it when banking"
```

---

### Task 7: Statistics tab + view

Add a `statistics` view and a tab that shows the global multiplier and the per-board record breakdown.

**Files:**
- Modify: `src/lib/game/state.svelte.ts` (the `ViewId` type)
- Create: `src/lib/components/StatisticsView.svelte`
- Modify: `src/App.svelte`

**Interfaces:**
- Consumes: `game.setView('statistics')`, `game.activeView`, `game.recordMultiplier`, `game.recordStats`, `game.isOwned('records')`.

- [ ] **Step 1: Widen `ViewId`**

In `src/lib/game/state.svelte.ts`:

```ts
type ViewId = 'board' | 'unlocks' | 'settings' | 'statistics';
```

- [ ] **Step 2: Create `StatisticsView.svelte`**

Create `src/lib/components/StatisticsView.svelte`:

```svelte
<script lang="ts">
  import { game } from '../game/state.svelte';

  function fmt(ms: number | null): string {
    return ms === null ? '—' : `${(ms / 1000).toFixed(2)}s`;
  }
</script>

<div class="stats-view">
  <div class="stats-panel">
    <div class="stats-head">STATISTICS</div>

    <div class="mult-box" class:inactive={!game.isOwned('records')}>
      <span class="mult-label">RECORD MULTIPLIER</span>
      <span class="mult-value">×{game.recordMultiplier.toFixed(2)}</span>
      {#if !game.isOwned('records')}
        <span class="mult-note">Unlock Records to apply this to banked points.</span>
      {/if}
    </div>

    <div class="breakdown-head">PER-BOARD RECORDS</div>
    <div class="breakdown">
      {#each game.recordStats as s (s.id)}
        <div class="stat-row">
          <span class="stat-name">{s.name}</span>
          <span class="stat-best">{fmt(s.bestMs)}</span>
          <span class="stat-term">×{s.term.toFixed(2)}</span>
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .stats-view {
    flex: 1;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 28px 16px;
  }

  .stats-panel {
    width: 100%;
    max-width: 460px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .stats-head,
  .breakdown-head {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    letter-spacing: 2px;
    color: var(--muted-2);
  }

  .mult-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    background: var(--accent-fill);
    border: 1px solid var(--accent-border);
    border-radius: 12px;
    padding: 18px;
  }

  .mult-box.inactive {
    background: var(--panel-3);
    border-color: var(--border);
  }

  .mult-label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    letter-spacing: 2.5px;
    color: var(--muted-2);
  }

  .mult-value {
    font-family: 'JetBrains Mono', monospace;
    font-size: 34px;
    font-weight: 700;
    color: var(--accent);
    line-height: 1;
  }

  .mult-box.inactive .mult-value {
    color: var(--dim);
  }

  .mult-note {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 11px;
    color: var(--muted-2);
  }

  .breakdown {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .stat-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    background: var(--panel-3);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 11px 12px;
    font-family: 'JetBrains Mono', monospace;
  }

  .stat-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
  }

  .stat-best {
    margin-left: auto;
    font-size: 12px;
    color: var(--dim);
  }

  .stat-term {
    font-size: 12px;
    color: var(--accent);
  }
</style>
```

- [ ] **Step 3: Wire the tab and view into `App.svelte`**

Add the import beside the other component imports:

```ts
  import StatisticsView from './lib/components/StatisticsView.svelte';
```

Add the tab button after the Unlocks tab button (before the Settings tab button):

```svelte
    <button class="tab" class:active={game.activeView === 'statistics'} onclick={() => game.setView('statistics')}>Statistics</button>
```

Add the view branch — change the trailing `{:else}` (settings) block so statistics has its own branch:

```svelte
    {:else if game.activeView === 'unlocks'}
      <UnlocksView />
    {:else if game.activeView === 'statistics'}
      <StatisticsView />
    {:else}
      <SettingsView />
    {/if}
```

- [ ] **Step 4: Verify types + build**

Run: `npm run check && npm run build`
Expected: PASS — no type errors; build succeeds.

- [ ] **Step 5: Manual check**

Run `npm run dev`, open the app, click the **Statistics** tab. Expect the RECORD MULTIPLIER box (×1.00, marked inactive with the unlock note) and one PER-BOARD row (`3×3 · — · ×1.00`).

- [ ] **Step 6: Commit**

```bash
git add src/lib/game/state.svelte.ts src/lib/components/StatisticsView.svelte src/App.svelte
git commit -m "feat: add Statistics tab showing the record multiplier breakdown"
```

---

### Task 8: Board-panel Stats section

Show the active board's fastest time in the sidebar once `records` is owned. Structured to hold more stats later.

**Files:**
- Modify: `src/lib/components/Sidebar.svelte`

**Interfaces:**
- Consumes: `game.isOwned('records')`, `game.bestTime(game.activeBoard.id)`, `game.activeBoard`.

- [ ] **Step 1: Add the Stats section markup**

In `src/lib/components/Sidebar.svelte`, add a `fmtTime` helper to the `<script>`:

```svelte
<script lang="ts">
  import { game } from '../game/state.svelte';

  function fmtTime(ms: number | null): string {
    return ms === null ? '—' : `${(ms / 1000).toFixed(2)}s`;
  }
</script>
```

Insert this block after the DIFFICULTY `.unlocks` block and before the `.key-hint` block:

```svelte
  {#if game.isOwned('records')}
    <div class="divider"></div>

    <div class="stats">
      <div class="unlocks-head"><span>STATS</span></div>
      <div class="stat-line">
        <span class="stat-key">Fastest time</span>
        <span class="stat-val">{fmtTime(game.bestTime(game.activeBoard.id))}</span>
      </div>
    </div>
  {/if}
```

- [ ] **Step 2: Add scoped styles**

Add to the Sidebar `<style>`:

```css
  .stats {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .stat-line {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--panel-3);
    border: 1px solid #181e27;
    border-radius: 8px;
    padding: 11px 12px;
  }

  .stat-key {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 13px;
    color: var(--text);
  }

  .stat-val {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    color: var(--accent);
  }
```

- [ ] **Step 3: Verify types + build**

Run: `npm run check && npm run build`
Expected: PASS.

- [ ] **Step 4: Manual check**

With `npm run dev`: the STATS section is hidden until `records` is owned. Grant it (buy it in Unlocks, or `localStorage.setItem('sudoku-incremental:unlocks', '["speed-bonus","records"]')` then reload). Solve the 3×3 once → the Stats section shows `Fastest time · N.NNs`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/Sidebar.svelte
git commit -m "feat: board-panel Stats section showing the board's fastest time"
```

---

### Task 9: Prestige modal shows the multiplier applied

**Files:**
- Modify: `src/lib/components/PrestigeModal.svelte`
- Modify: `src/App.svelte` (the `<PrestigeModal … />` invocation)

**Interfaces:**
- Consumes: `game.recordMultiplier`, `game.bankPreview` (Task 6).
- PrestigeModal props extend to `{ pending, breakdown, multiplier, total, onconfirm, oncancel }`.

- [ ] **Step 1: Extend the modal props and total**

In `src/lib/components/PrestigeModal.svelte`, update the props type:

```ts
  let {
    pending,
    breakdown,
    multiplier,
    total,
    onconfirm,
    oncancel,
  }: {
    pending: number;
    breakdown: { id: string; name: string; points: number }[];
    multiplier: number;
    total: number;
    onconfirm: () => void;
    oncancel: () => void;
  } = $props();
```

- [ ] **Step 2: Render the multiplier line**

Replace the existing `<div class="divider"></div>` + `.total-row` block (the one after `.breakdown`) with:

```svelte
      <div class="divider"></div>

      {#if multiplier !== 1}
        <div class="mult-row">
          <span class="mult-label">SUBTOTAL</span>
          <span class="mult-value">+{pending}</span>
        </div>
        <div class="mult-row">
          <span class="mult-label">× RECORD</span>
          <span class="mult-value accent">×{multiplier.toFixed(2)}</span>
        </div>
      {/if}

      <div class="total-row">
        <span class="total-label">TOTAL GAIN</span>
        <span class="total-value">+{total}</span>
      </div>
```

Add to the modal `<style>`:

```css
  .mult-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-family: 'JetBrains Mono', monospace;
  }

  .mult-label {
    font-size: 11px;
    letter-spacing: 1.5px;
    color: var(--muted-2);
  }

  .mult-value {
    font-size: 13px;
    color: #c7d2df;
  }

  .mult-value.accent {
    color: var(--accent);
  }
```

- [ ] **Step 3: Pass the new props from `App.svelte`**

Update the `<PrestigeModal … />` invocation:

```svelte
  {#if showPrestige}
    <PrestigeModal
      pending={game.pendingPoints}
      breakdown={game.prestigeBreakdown}
      multiplier={game.recordMultiplier}
      total={game.bankPreview}
      onconfirm={() => { game.resetAll(); showPrestige = false; }}
      oncancel={() => (showPrestige = false)}
    />
  {/if}
```

- [ ] **Step 4: Verify types + build**

Run: `npm run check && npm run build`
Expected: PASS.

- [ ] **Step 5: Manual check**

With `records` owned and at least one solve banked: open the Prestige modal. With multiplier > 1 it shows SUBTOTAL `+pending`, `× RECORD ×N.NN`, and TOTAL GAIN `+total` (= pending × multiplier). With multiplier = 1 it shows only TOTAL GAIN `+pending`. Confirm banks the shown total into POINTS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/PrestigeModal.svelte src/App.svelte
git commit -m "feat: show the record multiplier applied in the prestige modal"
```

---

### Task 10: "NEW RECORD!" badge on completion

**Files:**
- Modify: `src/App.svelte`

**Interfaces:**
- Consumes: `game.lastWasRecord` (Task 6).

- [ ] **Step 1: Add the badge to the completion readout**

In `src/App.svelte`, extend the completion block:

```svelte
          {#if game.status === 'complete' && game.lastResult}
            <div class="completion">
              <span class="completion-points">+{game.lastResult.points} P</span>
              <span class="completion-time">{(game.lastResult.timeMs / 1000).toFixed(1)}s</span>
              {#if game.lastResult.speedApplied}<span class="completion-speed">SPEED ×{game.lastResult.bracketMult}</span>{/if}
              {#if game.lastWasRecord}<span class="completion-record">★ NEW RECORD!</span>{/if}
            </div>
          {/if}
```

- [ ] **Step 2: Add the badge style with a reduced-motion guard**

Add to the `App.svelte` `<style>`:

```css
  .completion-record {
    color: var(--points);
    background: rgba(240, 200, 100, 0.1);
    border: 1px solid var(--points);
    border-radius: 5px;
    padding: 2px 8px;
    font-size: 11px;
    letter-spacing: 0.5px;
    animation: recordpop 0.4s ease-out;
  }

  @keyframes recordpop {
    0% { transform: scale(0.8); opacity: 0; }
    100% { transform: scale(1); opacity: 1; }
  }

  @media (prefers-reduced-motion: reduce) {
    .completion-record { animation: none; }
  }
```

- [ ] **Step 3: Verify types + build**

Run: `npm run check && npm run build`
Expected: PASS.

- [ ] **Step 4: Manual check**

With `npm run dev`: solve the 3×3. The first solve (a record) shows `★ NEW RECORD!`. Prestige, solve again slower → no badge; solve again faster → badge returns.

- [ ] **Step 5: Commit**

```bash
git add src/App.svelte
git commit -m "feat: show a NEW RECORD badge when a solve beats the board's best"
```

---

## Final verification

- [ ] Run the full gate: `npm run check && npm test && npm run build` — all green.
- [ ] Manual smoke: buy Speed Bonus → buy Records (100 P) → solve the 3×3 fast → Statistics tab shows ×>1 → Prestige modal multiplies the bank → banked POINTS reflect it.
