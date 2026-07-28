# Time-Anchored Payout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Anchor base payout to each tier's reference solve time so bigger/harder boards are strictly more profitable (points/min) for every skill profile, per `docs/superpowers/specs/2026-07-25-time-anchored-payout-design.md`.

**Architecture:** Reference solve times move from `simulate.ts`'s private table into tier config (`refSolveSec`), a `timeFactor = refSolveSec / REF_SOLVE_SEC` factor multiplies into `computeScore`'s base and `gateCost`, and the simulator verifies the resulting strict rate ladder. One interlocked "economy flip" task changes payouts, costs, and pinned tables atomically.

**Tech Stack:** Svelte 5 (runes) + TypeScript + Vite; Vitest for tests; `vite-node` for the balance report.

## Global Constraints

- All work happens in the existing worktree on branch `feat/balance-simulator`; never touch the primary checkout.
- A change is done only when all three pass: `npm run check`, `npm test`, `npm run build`.
- Game logic is unit-tested; components are NOT (no component-render harness — do not add one).
- `docs/` is gitignored: commit doc changes with `git add -f`.
- Commit messages end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Spec deviation (flagged at plan review): `board6x3:medium`'s PROGRESSION anchor changes from `default:hard` to `board6x3:easy` (see Task 3 Step 6 rationale).

---

### Task 1: Reference solve time lives in tier config

Pure refactor — no payout or behavior change. The sim's `BASE_SOLVE_SEC` table becomes tier data so game and simulator share one source of truth.

**Files:**
- Modify: `src/lib/game/config.ts` (`DifficultyTier` interface ~line 15, `TIER_BLANKS` ~line 65)
- Modify: `src/lib/game/simulate.ts` (delete `BASE_SOLVE_SEC` ~line 27, `solveTimeMs` ~line 32)
- Test: `src/lib/game/simulate.test.ts`, `src/lib/game/simulate.crosscheck.test.ts`

**Interfaces:**
- Produces: `DifficultyTier.refSolveSec: number`; `solveTimeMs(profile: SkillProfile, tier: DifficultyTier): number` (the `boardId` parameter is REMOVED — later tasks and both test files use the 2-arg form).

- [ ] **Step 1: Write the failing test**

In `simulate.test.ts`, inside `describe('solve model', ...)`, add:

```ts
  it('every tier carries its reference solve time (config is the single source)', () => {
    expect(BOARDS.default.tiers.map((t) => t.refSolveSec)).toEqual([1.5, 2, 2]);
    expect(BOARDS.board6x3.tiers.map((t) => t.refSolveSec)).toEqual([7, 10, 12]);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/game/simulate.test.ts`
Expected: FAIL — `[undefined, undefined, undefined]` does not equal `[1.5, 2, 2]`.

- [ ] **Step 3: Add `refSolveSec` to tier config**

In `config.ts`, add the field to `DifficultyTier`:

```ts
export interface DifficultyTier {
  id: string
  label: string
  emptyCells: number // blank cells the player must fill
  refSolveSec: number // skilled-play reference solve time (s) — scoring/sim anchor
  cost: number       // pointokus to unlock (0 = free starter tier)
}
```

Replace `TIER_BLANKS` with (the explanatory comment moves here from `simulate.ts`):

```ts
// Reference solve time is a property of the board+tier, not a linear function of
// blank count: the 3×3 is pianoable (flat, no deduction — you just type the missing
// digits); the 6×3 needs scanning and gets *faster per blank* on harder tiers (more
// constraints locked in). Calibrated to observed play.
const TIER_BLANKS: Record<string, DifficultyTier[]> = {
  default: [
    { id: 'easy', label: 'Easy', emptyCells: 3, refSolveSec: 1.5, cost: 0 },
    { id: 'medium', label: 'Medium', emptyCells: 5, refSolveSec: 2, cost: 0 },
    { id: 'hard', label: 'Hard', emptyCells: 7, refSolveSec: 2, cost: 0 },
  ],
  board6x3: [
    { id: 'easy', label: 'Easy', emptyCells: 6, refSolveSec: 7, cost: 0 },
    { id: 'medium', label: 'Medium', emptyCells: 10, refSolveSec: 10, cost: 0 },
    { id: 'hard', label: 'Hard', emptyCells: 14, refSolveSec: 12, cost: 0 },
  ],
}
```

- [ ] **Step 4: Make the simulator read tier config**

In `simulate.ts`, delete the `BASE_SOLVE_SEC` table and its comment block (lines ~22–30) and change `solveTimeMs`:

```ts
export function solveTimeMs(profile: SkillProfile, tier: DifficultyTier): number {
  return tier.refSolveSec * profile.skillMult * 1000;
}
```

Update its three internal call sites to drop `boardId`:
- `solvePoints`: `computeScore(solveTimeMs(profile, tier), b.brackets, { ... })`
- `pointsPerSec`: `solveTimeMs(profile, tier)` (both occurrences in the expression)
- `simulateSection`: `const timeMs = solveTimeMs(profile, tier);`

Also update the comment on `PROFILES` that references "scales the reference solve table" if it names `BASE_SOLVE_SEC` (keep the calibration note, it still holds).

Update external call sites:
- `simulate.test.ts` line ~16: `expect(solveTimeMs(ENGAGED, easy3x3)).toBe(3000);`
- `simulate.crosscheck.test.ts` line ~40: `const ENGAGED_EASY_MS = solveTimeMs(ENGAGED, easy3x3); // 3000 ms`

- [ ] **Step 5: Verify everything passes**

Run: `npm run check && npx vitest run`
Expected: 0 errors, all tests pass (no behavior changed — same times, same payouts).

- [ ] **Step 6: Commit**

```bash
git add src/lib/game/config.ts src/lib/game/simulate.ts src/lib/game/simulate.test.ts src/lib/game/simulate.crosscheck.test.ts
git commit -m "refactor: reference solve time lives in tier config

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: `timeFactor` anchor in formula.ts

Adds the factor and its reference constant. Not yet wired into payouts — green in isolation.

**Files:**
- Modify: `src/lib/game/formula.ts` (constants block ~line 5)
- Modify: `src/lib/game/config.ts` line 2 (re-export), `src/lib/game/scoring.ts` line 6 (re-export)
- Test: `src/lib/game/formula.test.ts`

**Interfaces:**
- Produces: `REF_SOLVE_SEC = 1.5` (exported const); `timeFactor(refSolveSec: number): number`. Re-exported from `./config` (constant) and `./scoring` (function), matching the existing `boardWorth`/`difficultyFactor` pattern.

- [ ] **Step 1: Write the failing test**

In `formula.test.ts`, change the import to `import { gateCost, timeFactor } from './formula';` and add:

```ts
describe('timeFactor', () => {
  it('is 1 at the 3×3 Easy reference solve time', () => {
    expect(timeFactor(1.5)).toBe(1);
  });

  it('scales linearly with the reference solve time', () => {
    expect(timeFactor(12)).toBe(8); // 6×3 Hard
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/game/formula.test.ts`
Expected: FAIL — `timeFactor` is not exported / not a function.

- [ ] **Step 3: Implement**

In `formula.ts`, below `REF_DENSITY`:

```ts
export const REF_SOLVE_SEC = 1.5;    // reference solve time (3×3 Easy): timeFactor = 1 here
```

Below `difficultyFactor`:

```ts
// Payout time anchor: a tier pays proportionally to its reference solve time,
// normalized so 3×3 Easy = 1.0. boardWorth × difficultyFactor then act as pure
// profit-rate escalators, so bigger/harder boards out-earn by construction.
export function timeFactor(refSolveSec: number): number {
  return refSolveSec / REF_SOLVE_SEC;
}
```

Re-exports:
- `config.ts` line 2: add `REF_SOLVE_SEC` to the export list.
- `scoring.ts` line 6: `export { boardWorth, difficultyFactor, timeFactor } from './formula';`

- [ ] **Step 4: Verify**

Run: `npm run check && npx vitest run src/lib/game/formula.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/game/formula.ts src/lib/game/formula.test.ts src/lib/game/config.ts src/lib/game/scoring.ts
git commit -m "feat: timeFactor payout anchor (unused until the economy flip)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: The economy flip (payouts, gate costs, pinned tables, badge)

One atomic task/commit: payouts, costs, and the pinned approval tables are interlocked — any partial flip leaves tests red. Contains a **user-approval checkpoint** before re-pinning pacing bands.

**Files:**
- Modify: `src/lib/game/scoring.ts` (`computeScore` opts + base, ~lines 47–52)
- Modify: `src/lib/game/formula.ts` (`gateCost`, ~line 36)
- Modify: `src/lib/game/config.ts` (`anchorDims`, `GATE_COSTS`, one `PROGRESSION` anchor)
- Modify: `src/lib/game/state.svelte.ts` (imports line 3, `scoreOpts()` ~line 82, `get tiers` ~line 352)
- Test: `src/lib/game/scoring.test.ts`, `formula.test.ts`, `progression.test.ts`, `simulate.test.ts`, `state.test.ts`, `tiers.test.ts`
- Modify: `docs/superpowers/specs/2026-07-25-time-anchored-payout-design.md` (§3 cost table amendment)

**Interfaces:**
- Consumes: `timeFactor(refSolveSec)` (Task 2), `tier.refSolveSec` (Task 1).
- Produces: `computeScore(timeMs, brackets, opts)` where opts is `{ speedBonusOwned; globalMultiplier; boardWorth; difficultyFactor; timeFactor }` (all required); `gateCost(n, anchorCols, anchorRows, anchorEmptyCells, anchorRefSolveSec, withSpeed)`.

**New derived cost table** (verify against sim output in Step 10):

| gate | anchor | cost |
|---|---|---|
| speed-bonus | default:easy | 30 |
| default:medium | default:easy | 125 |
| board6x3 | default:medium | 575 |
| default:hard | board6x3:easy | 3735 |
| board6x3:medium | **board6x3:easy** (re-anchored) | 5170 |
| board6x3:hard | board6x3:medium | 17660 |
| records | board6x3:hard | 22820 |

- [ ] **Step 1: Write the failing strict-ladder test (the point of this change)**

In `simulate.test.ts`, add a new top-level describe:

```ts
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
      // cross-board: the 6×3 floor clears the 3×3 ceiling
      expect(rates['board6x3:easy'], p.id).toBeGreaterThan(rates['default:hard']);
    }
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/game/simulate.test.ts`
Expected: FAIL — today `board6x3:easy` (568/min engaged) < `default:hard` (917/min).

- [ ] **Step 3: Update scoring tests for `timeFactor` in opts**

In `scoring.test.ts`:
- Line ~8: `const ref = { boardWorth: 1, difficultyFactor: 1, timeFactor: 1 };`
- The three inline opts objects that don't spread `ref` (lines ~83, ~90, ~97) become spreads with one override:
  - `{ speedBonusOwned: true, globalMultiplier: 1, ...ref, boardWorth: 2 }`
  - `{ speedBonusOwned: false, globalMultiplier: 1, ...ref, difficultyFactor: 2 }`
  - `{ speedBonusOwned: true, globalMultiplier: 1, ...ref, difficultyFactor: 3.5 }`
- Add, next to the existing boardWorth proportionality test:

```ts
  it('scales the base payout by timeFactor (±1 for rounding)', () => {
    const base = computeScore(3000, brackets, { speedBonusOwned: true, globalMultiplier: 1, ...ref });
    const anchored = computeScore(3000, brackets, { speedBonusOwned: true, globalMultiplier: 1, ...ref, timeFactor: 8 });
    expect(Math.abs(anchored.points - 8 * base.points)).toBeLessThanOrEqual(1);
  });
```

Run: `npx vitest run src/lib/game/scoring.test.ts` — Expected: the new test FAILS (timeFactor ignored ⇒ `anchored.points === base.points`).

- [ ] **Step 4: Implement `computeScore` timeFactor**

In `scoring.ts`:

```ts
export function computeScore(
  timeMs: number,
  brackets: Bracket[],
  opts: { speedBonusOwned: boolean; globalMultiplier: number; boardWorth: number; difficultyFactor: number; timeFactor: number },
): ScoreResult {
  const base = POINT_SCALE * opts.timeFactor * opts.boardWorth * opts.difficultyFactor;
```

(rest of the function unchanged). Run: `npx vitest run src/lib/game/scoring.test.ts` — Expected: PASS.

- [ ] **Step 5: Update `gateCost` tests, then implementation**

Replace the `gateCost` describe in `formula.test.ts`:

```ts
describe('gateCost', () => {
  it('is N × POINT_SCALE at the reference tier with no speed', () => {
    // anchor 3×3 Easy: timeFactor 1, worth 1, difficulty 1, withSpeed false → 3 × 10 = 30
    expect(gateCost(3, 3, 3, 3, 1.5, false)).toBe(30);
  });

  it('folds in REF_SPEED_MULT when withSpeed is true', () => {
    // 5 × 10 × 1 × 1 × 1 × 2.5 = 125
    expect(gateCost(5, 3, 3, 3, 1.5, true)).toBe(125);
  });

  it('scales with the anchor time factor, board worth, and difficulty', () => {
    // anchor 6×3 Easy (ref 7 s → tf 4.6667, worth 2.4623, diff 1):
    // 13 × 10 × 4.6667 × 2.4623 × 1 × 2.5 ≈ 3734 → 3735
    expect(gateCost(13, 6, 3, 6, 7, true)).toBe(3735);
  });

  it('rounds to the nearest 5', () => {
    // anchor 6×3 Medium (ref 10 s → tf 6.6667, worth 2.4623, diff 2.1517):
    // 30 × 10 × 6.6667 × 2.4623 × 2.1517 × 2.5 ≈ 26490.2 → 26490
    expect(gateCost(30, 6, 3, 10, 10, true)).toBe(26490);
  });
});
```

Run to see them fail (wrong arity), then implement in `formula.ts`:

```ts
export function gateCost(
  n: number,
  anchorCols: number,
  anchorRows: number,
  anchorEmptyCells: number,
  anchorRefSolveSec: number,
  withSpeed: boolean,
): number {
  const cells = anchorCols * anchorRows;
  const worth = sizeWorth(cells);
  const diff = difficultyFactor(anchorEmptyCells, cells);
  const speed = withSpeed ? REF_SPEED_MULT : 1;
  return round5(n * POINT_SCALE * timeFactor(anchorRefSolveSec) * worth * diff * speed);
}
```

Run: `npx vitest run src/lib/game/formula.test.ts` — Expected: PASS.

- [ ] **Step 6: Wire config — anchor refSolveSec + the board6x3:medium re-anchor**

In `config.ts`:

```ts
function anchorDims(anchorId: string): { cols: number; rows: number; emptyCells: number; refSolveSec: number } {
  const [boardId, tierId] = anchorId.split(':')
  const { cols, rows } = BOARD_DIMS[boardId]
  const t = TIER_BLANKS[boardId].find((tier) => tier.id === tierId)!
  return { cols, rows, emptyCells: t.emptyCells, refSolveSec: t.refSolveSec }
}
```

and in `GATE_COSTS`: `gateCost(p.n, a.cols, a.rows, a.emptyCells, a.refSolveSec, p.withSpeed)`.

In `PROGRESSION`, change one line:

```ts
  { gate: 'board6x3:medium', n: 18, anchor: 'board6x3:easy', withSpeed: true, requires: ['board6x3:easy'] },
```

**Rationale (spec deviation):** under the new economy `default:hard` is a side-grade (1221/min) — the tier a player actually grinds while saving for `board6x3:medium` is `board6x3:easy` (2656/min). Anchoring to the real grind tier keeps the cost meaning "18 solves' worth" AND preserves `progression.test.ts`'s monotonic-cost invariant, which the spec's original table (default:hard 3735 followed by board6x3:medium 2140) would break. All other anchors already point at the best grind tier of their era.

- [ ] **Step 7: Update the pinned cost tables in `progression.test.ts`**

Per that file's own comment ("If you retune … update these numbers"):

```ts
const EXPECTED: Record<string, number> = {
  'speed-bonus': 30,
  'default:medium': 125,
  'board6x3': 575,
  'default:hard': 3735,
  'board6x3:medium': 5170,
  'board6x3:hard': 17660,
  'records': 22820,
};
```

and in the wiring test: medium `125`, hard `3735`, `BOARDS.board6x3.cost` `575`, 6×3 medium `5170`, 6×3 hard `17660`.

- [ ] **Step 8: Update production callers + tier badge**

`state.svelte.ts`:
- Line 3: add `timeFactor` to the `./scoring` import list.
- `scoreOpts()` gains: `timeFactor: timeFactor(selectedTier().refSolveSec),`
- `get tiers` badge (line ~352): `mult: timeFactor(t.refSolveSec) * difficultyFactor(t.emptyCells, totalCells),`

`simulate.ts` `solvePoints` opts gain: `timeFactor: timeFactor(tier.refSolveSec),` (import `timeFactor` from `./scoring` alongside the existing imports).

- [ ] **Step 9: Update cost-hardcoding tests**

`state.test.ts` (board 430→575, tier 1605→5170, records 2850→22820):
- `buyBoard with ≥430 points` test (~line 71): title `≥575`, keep seed 600, expect `25` with comment `// 600 - 575` (both places).
- `buyBoard with <430 points` test (~line 84): title `<575`, seed `'574'`, expect `574`.
- Second-buy no-op test (~line 105): seed 1200, comments/expect: `// -575 → 625`, expect `625`.
- `selectBoard swaps…` test (~line 115): comment `board6x3 costs 575, its medium tier costs 5170`, seed `'5745'`, comments `// -575 → 5170` and `// -5170 → 0`.
- Records test (~line 396): seed `'22820'`, comment at buy `// 22820 → 0`.

`tiers.test.ts` line 5 comment: `// easy (0), medium (125), hard (3735)`.

`simulate.test.ts` `bestTier` comment (~line 48): Medium now pays 86 pts (base 10 × 4/3 × 2.1517 ≈ 28.69, ×3 bracket) → `86 pts / 7 s = 12.3/s`; assertion unchanged.

- [ ] **Step 10: Run everything except pacing bands and confirm the flip**

Run: `npx vitest run`
Expected: ONLY the `pacing bands` test fails (economy moved — that's the approval gate). The strict-ladder test from Step 1 now PASSES. If anything else fails, fix it before proceeding.

- [ ] **Step 11: Generate the balance report and CHECKPOINT with the user**

Run: `npm run balance` and capture the full output.
Present to the user: the four rate tables (strict ladder visible) and the engaged pacing table (new section/total wall-clock).
**PAUSE. Do not proceed to Step 12 until the user approves the pacing.** If the user wants different pacing, retune `n` values in `PROGRESSION` (the designated lever), update `progression.test.ts` costs to match, and re-present.

- [ ] **Step 12: Re-pin the engaged pacing bands**

Get exact values — write a throwaway script `scripts/print-pacing.ts`:

```ts
import { PROFILES, runLadder } from '../src/lib/game/simulate';
const engaged = PROFILES.find((p) => p.id === 'engaged')!;
for (const s of runLadder(engaged)) console.log(`  '${s.gate}': ${s.cumulativeSec},`);
```

Run: `npx vite-node scripts/print-pacing.ts`, paste the values into `EXPECTED_ENGAGED_CUMULATIVE_SEC` in `simulate.test.ts`, update its comment to reference this design doc, then delete `scripts/print-pacing.ts`.

- [ ] **Step 13: Amend the spec's §3 cost table**

In `docs/superpowers/specs/2026-07-25-time-anchored-payout-design.md`, update §3: `board6x3:medium` anchor → `board6x3:easy`, cost 5170; records 22820 (not ~22,815); add one sentence noting the re-anchor preserves cost monotonicity and prices against the tier actually ground.

- [ ] **Step 14: Full verification**

Run: `npm run check && npm test && npm run build`
Expected: all three pass, zero errors.

- [ ] **Step 15: Commit**

```bash
git add src/lib/game/scoring.ts src/lib/game/formula.ts src/lib/game/config.ts src/lib/game/state.svelte.ts src/lib/game/simulate.ts src/lib/game/scoring.test.ts src/lib/game/formula.test.ts src/lib/game/progression.test.ts src/lib/game/simulate.test.ts src/lib/game/state.test.ts src/lib/game/tiers.test.ts
git add -f docs/superpowers/specs/2026-07-25-time-anchored-payout-design.md
git commit -m "feat: time-anchored payout — bigger/harder boards strictly out-earn

Base payout gains timeFactor (refSolveSec / REF_SOLVE_SEC), making
boardWorth × difficultyFactor pure profit escalators. Gate costs re-derive;
board6x3:medium re-anchors to board6x3:easy (the real grind tier) to keep
cost monotonicity. Pacing bands re-pinned from the approved balance report.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```
