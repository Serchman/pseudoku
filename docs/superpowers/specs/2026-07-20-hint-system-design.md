# Hint System — Corner Candidate Hints (foundation phase)

**Date:** 2026-07-20
**Status:** Design approved, pending implementation plan

## Context

This is the first phase of a larger vision: an eventual **automation skill tree** where the
player composes partial, specialized automators (*"fill all the 7s," "fill odd numbers,"*
etc.) to clear boards fast. Scoring never changes — speed still governs everything, and the
partial nature of each automator is what keeps automation from trivializing the game. The
meta-puzzle becomes "which combination of automators clears *this* board's geometry fastest."

That full tree is too big for one spec. This phase ships only its **foundation**: the pure
**candidate engine** (legal digits per empty cell) plus a first player-facing consumer of it —
a **hint system**. Every later automator will reuse the same candidate engine.

Out of scope for this phase (all later, all built on this engine): automation, choosing *which*
cell to hint, answer-reveal, and the skill-tree UI.

## Feature summary

A two-layer, purchasable hint feature:

- **Layer A — master "Hints" unlock** in the Unlocks tree (like Speed Bonus). Buying it makes
  the HINTS section appear in the Sidebar. Before that, hints don't exist in the UI.
- **Layer B — per-board hint count** bought in the Sidebar's "board upgrade panel." Each
  purchase raises the board's hint count by one, at an escalating cost.

When playing a board, `N` random empty cells (`N` = the board's hint count, capped by the
number of empty cells) each display **their candidate digits, small, in a corner** — dimmed
pencil marks that narrow live as the board fills. More hints → less scanning → faster solves →
higher speed bracket → more points.

## Decisions locked during brainstorming

- Hint content is **candidate digits** (legal-by-peer-elimination), **not** the answer. No need
  to retain the generated solution.
- Candidates render in a **corner** of the hinted cell (not a centered mini-grid).
- Hint count is tracked **per board** (like difficulty tiers), not global.
- Hints are **buyable only between solves** (when `status !== 'playing'`), like difficulty
  tiers — not mid-solve.
- Master unlock is **always-on when owned** (no toggle).

## Architecture

### 1. Candidate engine (pure, `board.ts`)

The shared substrate. A new pure function:

```ts
// Legal digits per cell: for each EMPTY cell, the symbols 1..config.symbols that no peer
// (same row/col/block, per config.constraints) already uses. Filled/prefilled cells → null.
export function candidates(board: Board, config: BoardConfig): (number[] | null)[]
```

- Reuses the existing peer relation. `arePeers` is currently a private helper in `board.ts`;
  this function uses the same logic (no duplicated peer math). `findConflicts` already relies on
  `arePeers`, so keep it the single source of truth.
- Complexity is irrelevant at these sizes (≤18 cells) — a straightforward per-cell scan over
  peers is fine. No memo/caching cleverness.
- **Unit-tested** in `board.test.ts` (logic is tested; components are not, per CLAUDE.md).

### 2. Random hinted-cell selection (`state.svelte.ts`)

- On `start()`, after generating the puzzle, pick `N = min(hintCount(activeBoard), #emptyCells)`
  **random empty cells** → `hintedCells: number[]`. Reuse the existing shuffle approach used by
  `generatePuzzle` (shuffle empty indices, take `N`).
- `hintedCells` is part of per-board **play state**: added to the `PlayState` type and to the
  `boardStates` snapshot/restore in `selectBoard`, so switching boards mid-solve and returning
  keeps the same cells hinted. Re-rolled on every fresh `start()`. Cleared by `resetAll`.
- A `$derived` `hintedCandidates` maps each hinted index → its candidate digits, computed from
  `candidates(board, config)`. It depends on `board` and the hint count — **not** `elapsed` — so
  it recomputes when the board changes but **never on the 50ms timer tick** (per-tick-minimalism).
  Mirrors the existing `conflicts` `$derived`.

### 3. Economy & state

**Master unlock.** Add a `hints` entry to `UNLOCKS` (`unlocks.ts`) and a corresponding
`PROGRESSION` entry (`config.ts`) so its cost derives from the existing `gateCost` machinery —
no hardcoded number. Placed after `speed-bonus` in the progression (hints only pay off once
solve *time* affects score):

```ts
{ gate: 'hints', n: 4, anchor: 'default:easy', withSpeed: true, requires: ['speed-bonus'] }
```

→ `4 × POINT_SCALE(10) × worth(1) × diff(1) × REF_SPEED_MULT(2.5)` = **100 P** (seed, tunable).
Gating stays sequential (`getNextUnlock` = first unowned), consistent with today's `unlocks.ts`.
The existing `progression.test.ts` cost-ladder assertion must be updated to include `hints`.

**Per-board hint count.** New state mirroring the difficulty-tier pattern:

- `storage.ts`: `loadHintCount(boardId): number` (default `0`) and `saveHintCount(boardId, n)`,
  keyed `sudoku-incremental:hints:${boardId}`.
- `state.svelte.ts`: `hintCount` `$state`, loaded on init for the active board and reloaded in
  `selectBoard` (like `ownedTiers`/`selectedTierId`). Persisted on purchase. **Persistent across
  `resetAll`**, like difficulty tiers — `resetAll` does not touch per-board storage today, and
  the hint count is a per-board investment in the same spirit as tiers. (See Assumptions.)
- **Purchase cap:** you cannot buy more hints than the currently selected tier has empty cells
  (`hintCount < selectedTier().emptyCells`). A hint that couldn't show on the tier you're about
  to play isn't purchasable. Because the count persists per board across tiers, selecting a
  harder tier unlocks buying more; selecting an easier tier just shows fewer (render uses
  `min(hintCount, #empties)`).

**Cost of the next hint.** A derived helper in `formula.ts` (seed values, tunable):

```ts
// Cost of the `level`-th hint (1-indexed) on a board. Anchored to the board's worth (easy-tier
// density = 1.0), escalating geometrically per level, folding in REF_SPEED_MULT like other gates.
export function hintCost(level: number, board: BoardConfig): number
// = round5( POINT_SCALE × boardWorth(board) × HINT_BASE_N × HINT_GROWTH^(level-1) × REF_SPEED_MULT )
```

Seed constants: `HINT_BASE_N = 2`, `HINT_GROWTH = 2`. Resulting ladders:

| Board (base) | hint 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|
| 3×3 (worth 1 → base 10) | 50 | 100 | 200 | 400 | 800 | 1600 | 3200 |
| 6×3 (worth 2.46 → base 24.6) | 125 | 245 | 490 | 985 | 1970 | — | — |

(3×3 caps at 7 empties on Hard, 6×3 at 14 on Hard — table truncated for space.) These are
**tunable seeds**; the plan may adjust `HINT_BASE_N`/`HINT_GROWTH` or the master `n`.

**Action.** `buyHint()` on the game object: guarded by `status !== 'playing'`, the `hints`
unlock being owned, affordability, and the purchase cap. Increments the active board's
`hintCount`, deducts points, persists both.

### 4. Rendering

- **`Cell.svelte`**: new optional prop `hintCandidates?: number[]`. When the cell is empty
  (`cell.value == null`, not prefilled) and `hintCandidates` is present and non-empty, render the
  digits **small and dimmed in a corner** (e.g. top-left), visually distinct from a centered
  player value. Uses existing muted/dim design tokens (`--dim`, `--muted-*`) — no hardcoded hex.
  If a fade-in animation is added, include the `@media (prefers-reduced-motion: reduce)` guard
  per convention; a static render needs none.
- **`Board.svelte`**: pass `hintCandidates={game.hintedCandidates[index]}` (undefined for
  non-hinted cells).
- **`Sidebar.svelte`**: a new **HINTS section**, styled like the existing DIFFICULTY block,
  rendered only when the `hints` unlock is owned (`game.isOwned('hints')`). Shows the current
  count, and a buy button labeled with `hintCost(nextLevel, board)` P — or a MAX/disabled state
  when at the tier cap. Buy button disabled while `status === 'playing'` (matches tier buttons).

### 5. Game-object surface (getters/actions)

New on the object returned by `createGame()`:

- `get hintedCandidates(): Record<number, number[]>` — hinted index → candidate digits (empty
  when the `hints` unlock isn't owned or not playing).
- `get hintCount(): number` — active board's count.
- `get nextHintCost(): number | null` — cost of the next hint, or `null` at cap.
- `get hintUnlocked(): boolean` (or reuse `isOwned('hints')`).
- `buyHint(): void`.

## Testing

Unit tests (Vitest, logic only):

- `candidates()` in `board.test.ts`: an empty cell on the single-block 3×3 lists the right
  legal digits; a partially-filled block narrows correctly; a filled/prefilled cell → `null`;
  the 6×3 row constraint further narrows candidates across the block boundary.
- Hint economy in `state.test.ts` (jsdom + `createGame()` + `localStorage`, `beforeEach`
  clears): buying `hints` unlock reveals the count control; `buyHint` respects affordability and
  the tier-empty-cell cap; per-board `hintCount` round-trips through `localStorage` and is
  isolated per board; `hintCount` survives `resetAll` (like difficulty tiers).
- Hinted-cell selection: after `start()`, `hintedCells` count equals `min(hintCount, #empties)`
  and every entry is an empty (non-prefilled) index. (Assert invariants, not exact cells —
  selection uses `Math.random`.)
- `hintCost` ladder assertion in `formula.test.ts` (guards against silent drift, like the
  gate-cost table test).
- Update `progression.test.ts` to include the new `hints` gate in the cost ladder.

Components are **not** unit-tested (no render harness; out of scope per CLAUDE.md).

## Verification

`npm run check`, `npm test`, `npm run build` all pass (per CLAUDE.md).

## Assumptions

- **Per-board hint count is persistent**, surviving `resetAll` like difficulty tiers and the
  master unlock. Rationale: it's a per-board investment in the same spirit as tiers, and
  `resetAll` touches no per-board storage today, so this is both the consistent and the simpler
  choice. If a future prestige/reset economy should re-buy hints per run, that behavior changes
  then (and is out of scope now, matching the unlock-cost-rebalance spec's stance on resets).
- **All current boards have `symbols === 9`**, so candidate corner marks never exceed 9 digits.
  A future board with a different symbol count would want the corner layout revisited.
- The candidate engine computes **peer-legal** digits only (standard pencil-mark semantics); it
  does not cross-reference globally-exhausted symbols beyond what peer elimination already covers.
