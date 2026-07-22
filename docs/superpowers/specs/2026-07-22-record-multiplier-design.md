# Record Multiplier — persistent mastery multiplier from best solve times

**Date:** 2026-07-22
**Status:** Design approved, pending implementation plan
**Branch:** `feat/record-multiplier` (off `main`; supersedes the shelved `feat/hint-system`)

## Context

The phase-3 unlock question started as "hints don't impact my gameplay — what do I unlock at
this stage instead?" Brainstorming diagnosed the root cause: the early boards are **input-bound,
not cognition-bound**. On the 3×3 (single block, no row/col constraint) *any* arrangement of the
missing digits completes the board — correctness is constraint-based (`isComplete`), never
compared against the generated solution — so "piano the 1–9 keys" is optimal and a wrong entry
costs nothing. Hints attack thinking time, which barely exists; that's why they felt worthless.

The chosen endgame for the game is **automation / idle**. The unlock that fits both this stage
*and* that endgame is a **persistent multiplier earned from your best-ever solve time on each
board**. It doubles down on the speed-chase the player already enjoys, gives every board a
"beat your record" mini-game, and — crucially — a record is a **permanent investment**: when
automation later clears boards slowly, income is still lifted by the records set during active
play. Active play invests into idle income.

Hints are deferred indefinitely ("later, if ever"). The pure candidate engine from the hint
branch is **not** part of this feature; it stays parked on `feat/hint-system` for the future
automation tree.

## Feature summary

A purchasable **master unlock** (`records`, in the Unlocks tree, gated after Speed Bonus). Once
owned:

- Each board's **fastest-ever solve time** yields a **record term** — the same speed multiple the
  scoring already computes (`bracketMult × expFactor`), evaluated at the best time instead of the
  current solve's time.
- All boards' terms aggregate into one **global record multiplier**.
- The multiplier is applied at the **bank step** (`resetAll` / the Prestige confirm modal): banked
  points = `pendingPoints × globalRecordMultiplier`.
- Surfaced in three places: a **board-panel Stats section** (active board's fastest time), a new
  **Statistics tab** (global multiplier + per-board breakdown), and the **Prestige modal** (the
  multiplier line applied to the total). A **"NEW RECORD!"** celebration fires when a solve beats
  the stored best.

Best times are **tracked unconditionally** (even before the unlock is bought), so purchasing
`records` retroactively rewards mastery the player already demonstrated.

## Why this shape (decisions locked during brainstorming)

- **Reuse the brackets, don't invent a "par" time.** The board brackets are already a normalized
  speed scale (every board tops out at 8× at its fastest bracket, 1× when slow), so "how close to
  the fastest time" *is* "which bracket does the best time land in" — auto-comparable across
  boards, and it's math the game already ships in `computeScore`.
- **Record term = the existing speed multiple at the best time.** No new curve, no new tuning
  constants. It also keeps rewarding sub-fastest-bracket times smoothly (up to ~12× as time → 0),
  exactly like a live solve.
- **Global aggregation, built from per-board terms.** Improving *any* board moves the one number,
  so the player is motivated to shave *all* boards; old boards never go dead because their term
  stays in the aggregate forever. Robust to the still-undecided automation architecture
  (portfolio vs. single best board) — a global multiplier assembled from all records boosts income
  either way.
- **Applied at the bank step, not per-solve.** Matches the game's existing "points bank only on
  reset" architecture and makes the Prestige modal the natural, legible place to reveal the bonus.
- **Tier-agnostic best time.** Best times are naturally fastest on the easy tier; tracking per
  board (not per tier) keeps the clean split the economy already has — *difficulty* pays out
  through the per-solve base (`difficultyFactor`), *speed/mastery* pays out through
  brackets/records. This yields the intended loop: sharpen the multiplier cheaply on easy, then
  harvest on harder tiers whose bigger per-run points are amplified by it.
- **Leans the economy hard into speed** (speed now rewarded per-solve *and* as a persistent
  global multiplier). Accepted and on-vision, given the speed-chase is the fun. Board-worth and
  difficulty become relatively smaller levers.

## Architecture

### 1. Pure speed factor (`scoring.ts`)

`computeScore` currently inlines the bracket selection + `expFactor` math. Extract it so records
and scoring share one source of truth for the speed curve:

```ts
// The speed multiple for a solve time under a board's brackets: selected bracket's mult, times
// the intra-bracket exponential factor. This is exactly the (bracketMult × expFactor) product
// computeScore applies when Speed Bonus is owned — extracted so the record term reuses it.
export function speedFactor(timeMs: number, brackets: Bracket[]): number
```

- Body is the existing selection loop + `expFactor` from `computeScore` (lines that compute
  `lo`, `selected`, `hi`, `expFactor`, `bracketMult`), returning `bracketMult * expFactor`.
- `computeScore` is refactored to call it (behavior unchanged; the speed-bonus-off early return
  and `POINT_SCALE × worth × diff × global` base are untouched). Existing `scoring.test.ts`
  assertions must still pass — this is a pure extraction.

### 2. Record term & global multiplier (pure, `formula.ts`)

```ts
// A board's record term: the speed multiple at its best-ever time. No record yet → 1 (neutral).
export function recordTerm(bestMs: number | null, board: BoardConfig): number
// = bestMs === null ? 1 : speedFactor(bestMs, board.brackets)

// Global multiplier from every owned board's record term. Sum form keeps it legible and tame;
// product is the steeper alternative knob (see Tunable knobs). recordsOwned false → 1.
export function globalRecordMultiplier(
  terms: number[],       // recordTerm per owned board
  recordsOwned: boolean,
): number
// = recordsOwned ? 1 + terms.reduce((s, t) => s + (t - 1), 0) : 1
```

`recordTerm` needs `speedFactor`; import it from `scoring.ts` (formula.ts already imports the
`BoardConfig` type). Example ladder on the real 3×3 brackets `[2→8, 3→5, 4→3, 6→2, ∞→1]`:

| Best 3×3 time | term |
|---|---|
| 5.0 s | ~2.45 |
| 2.5 s | ~6.12 |
| 1.9 s | ~8.16 |
| 1.0 s | ~9.80 |
| → 0 s | 12.0 (cap) |

Two boards both at ~8.16 → global `1 + 7.16 + 7.16 ≈ 15.3×` (sum form).

### 3. Economy — master unlock (`config.ts`, `unlocks.ts`)

Add a `records` gate to `PROGRESSION` right after `speed-bonus` so its cost derives from the
existing `gateCost` machinery (no hardcoded number):

```ts
{ gate: 'records', n: 4, anchor: 'default:easy', withSpeed: true, requires: ['speed-bonus'] }
```

→ `4 × POINT_SCALE(10) × worth(1) × diff(1) × REF_SPEED_MULT(2.5)` = **100 P** (seed, tunable).
This sits between Speed Bonus (30 P) and the medium tier (125 P) — a meaningful buy right after
Speed Bonus. Add the matching `UNLOCKS` entry (order `[speed-bonus, records]`, so `getNextUnlock`
offers it second):

```ts
{ id: 'records', title: 'Records',
  description: 'Your fastest time on each board grants a permanent multiplier to banked points.',
  cost: GATE_COSTS['records'] }
```

`progression.test.ts`'s cost-ladder assertion must be updated to include `records`.

### 4. Best-time persistence (`storage.ts`)

Mirror the per-board tier storage pattern, keyed `sudoku-incremental:record:${boardId}`:

```ts
export function loadRecord(boardId: string): number | null   // ms, null when unset
export function saveRecord(boardId: string, ms: number): void
```

`null` (never solved) is distinct from any real time. Records are **persistent across
`resetAll`**, like difficulty tiers — they are the permanent mastery investment the whole feature
is about.

### 5. State (`state.svelte.ts`)

- `records` `$state<Record<string, number>>` — best ms per board, initialized from `loadRecord`
  for every id in `BOARD_ORDER` (all owned boards contribute to the global multiplier, not just
  the active one). Entries absent when no record yet.
- **`checkWin()`**: after computing `timeMs`, **unconditionally** update the record when beaten
  (`records[activeBoardId] === undefined || timeMs < records[activeBoardId]`) → set, `saveRecord`,
  and flag a "new record" for the completion UI. Tracking is unconditional so buying `records`
  later is retroactively rewarding. `pendingPoints` still accumulates **raw** `result.points`
  (the multiplier is *not* applied here).
- **`recordMultiplier`** `$derived`: `globalRecordMultiplier(BOARD_ORDER-owned terms, owned.has('records'))`.
  Depends on `records` and `ownedBoards` and `owned` — **not** on `elapsed`, so it never
  recomputes on the 50 ms timer tick (per the per-tick-minimalism note).
- **`bankPreview`** `$derived`/getter: `Math.round(pendingPoints * recordMultiplier)` — the amount
  the modal previews and `resetAll` banks.
- **`resetAll()`**: bank `bankPreview` instead of raw `pendingPoints`
  (`pointokus += Math.round(pendingPoints * recordMultiplier)`). Everything else unchanged;
  `records` is **not** cleared.
- New getters on the game object: `recordMultiplier`, `bankPreview`,
  `bestTime(boardId): number | null`, and a per-board breakdown for the Statistics tab
  (`recordStats: { id; name; bestMs; term }[]` over `BOARD_ORDER`). A `justSetRecord` flag (reset
  on `start()`) drives the celebration.

### 6. Scoring wiring

The global multiplier is applied **only** at the bank step (§5 `resetAll`/`bankPreview`).
`computeScore` and `scoreOpts()` are **not** changed to fold it in — `GLOBAL_MULTIPLIER` stays 1.
This keeps per-solve payouts raw and the multiplier a single, legible bank-time reveal.

### 7. UI

- **`ViewId`** gains `'statistics'`. New **`StatisticsView.svelte`** rendered when
  `activeView === 'statistics'`; a **Statistics tab** button in `App.svelte`'s tab strip
  (alongside Board / Unlocks / Settings). The view lists each board's fastest time and record
  term, then the aggregated **global multiplier** headline, with the calculation shown. It is the
  future home for more global stats. Fastest times display even before `records` is owned; the
  multiplier is shown as inactive (`1.00×`) until then.
- **`Sidebar.svelte`** (board panel): a new **Stats section**, shown when `records` is owned,
  styled like the existing DIFFICULTY block. First stat is the **active board's fastest time**
  (with its term); structured to hold more stats later. Uses `app.css` tokens (`--muted-*`,
  `--dim`), no hardcoded hex.
- **`PrestigeModal.svelte`**: between the breakdown subtotal and TOTAL GAIN, a new
  `× RECORD  {recordMultiplier}×` line; TOTAL GAIN becomes `bankPreview`
  (`pending × multiplier`). Props extend with `multiplier` and `total`. Shown only when the
  multiplier ≠ 1 (i.e. `records` owned with at least one record). The header reset button keeps
  showing raw `pendingPoints` — the boosted total is the modal's reveal.
- **"NEW RECORD!"** celebration in the completion readout when `justSetRecord`. Any animation gets
  the `@media (prefers-reduced-motion: reduce) { animation: none; }` guard, per convention.

Per CLAUDE.md, components are **not** unit-tested (no render harness; out of scope).

## Testing (Vitest, logic only)

- **`scoring.test.ts`**: existing assertions still pass after the `speedFactor` extraction
  (regression guard on the refactor). Optionally a direct `speedFactor` case per bracket edge.
- **`formula.test.ts`**: `recordTerm` — `null` → 1; the 3×3 ladder above (guards against silent
  drift, like the gate-cost table test). `globalRecordMultiplier` — `recordsOwned=false` → 1;
  sum aggregation over multiple terms; empty/neutral terms contribute 0.
- **`state.test.ts`** (jsdom + `createGame()` + `localStorage`, `beforeEach` clears): a faster
  solve updates the record and persists; a slower solve does **not**; best time round-trips per
  board and is isolated per board; records **survive `resetAll`**; `resetAll` banks
  `pending × recordMultiplier` into `pointokus`; `recordMultiplier` is 1 until the `records` unlock
  is owned, then reflects tracked times. Reuse the existing `solveDefault(game)` helper to reach
  `complete`; to force a known time, drive/stub the elapsed/`timeMs` path as the existing timing
  tests do (assert invariants, not brittle exact multipliers where `performance.now` is involved).
- **`progression.test.ts`**: cost ladder updated to include the `records` gate.

## Verification

`npm run check`, `npm test`, `npm run build` all pass (per CLAUDE.md).

## Tunable knobs (for the implementation plan)

- **Aggregation:** sum (`1 + Σ(term−1)`, default) vs. product (`Π term`, steeper — two maxed
  boards ≈ 64× instead of ~15×). Start with sum; steepen if it feels flat.
- **Unlock cost:** `records` `n` (seed 4 → 100 P).
- **Term cap:** the ~12× ceiling falls out of the fastest bracket + `EXP_BASE`; no separate cap
  needed, but the plan may clamp if product aggregation makes numbers explode.

## Assumptions

- **Records persist across `resetAll`** (like tiers). If a future prestige economy should reset
  them for a fresh climb, that changes then and is out of scope now.
- **Best times are tracked unconditionally** (before the unlock is bought) so purchase is
  retroactively rewarding; only the *multiplier's effect* and most UI are gated on the unlock.
- **All boards keep `symbols === 9`** and the existing bracket shape; the record term relies only
  on each board's `brackets`, so new boards slot in automatically.
- The multiplier applies to the **whole run's pending bank at the current global multiplier**, so
  a record set mid-run boosts everything cashed out that run (simplest, most generous reading).
