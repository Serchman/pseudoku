# Hint System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a two-layer hint system — a master "Hints" unlock plus a per-board, escalating hint count that reveals candidate digits in the corner of random empty cells.

**Architecture:** A pure `candidates()` engine in `board.ts` computes legal digits per empty cell (peer-elimination, no solution retained). Game state picks `min(hintCount, #empties)` random empty cells on `start()` and exposes their candidates via a `$derived`. The Sidebar gets a HINTS section to buy more hints per board; `Cell.svelte` renders the corner marks. The master unlock reuses the existing `UNLOCKS`/`buyUnlock` machinery, so its card appears in the Unlocks tree automatically.

**Tech Stack:** Svelte 5 (runes), TypeScript, Vite, Vitest.

## Global Constraints

- Svelte 5 runes only (`$state`, `$derived`, `$props`) — no legacy stores/dispatchers.
- Every clickable element is a `<button>` (never `<div onclick>`).
- Any animation gets a `@media (prefers-reduced-motion: reduce) { animation: none; }` guard. (This feature adds no animation, so none is required — do not add one.)
- Reference `app.css` design tokens (`--dim`, `--muted-2`, `--accent`, …) rather than hardcoding hex where a token lines up.
- Game logic is unit-tested; components are **not** (no render harness — out of scope).
- State tests: `// @vitest-environment jsdom`, `createGame()` + `localStorage`, `beforeEach(() => localStorage.clear())`.
- Cost seeds are tunable but fixed for this plan: master unlock `n = 4` → **100 P**; `HINT_BASE_N = 2`, `HINT_GROWTH = 2`.
- Verify before any task is "done": `npm run check` && `npm test` && `npm run build` all green.

---

## File Structure

**Modified:**
- `src/lib/game/board.ts` — add `candidates()` and `pickHintCells()` (pure).
- `src/lib/game/board.test.ts` — tests for the two new functions.
- `src/lib/game/formula.ts` — add `HINT_BASE_N`, `HINT_GROWTH`, `hintCost()`.
- `src/lib/game/formula.test.ts` — tests for `hintCost()`.
- `src/lib/game/config.ts` — add the `hints` `PROGRESSION` entry.
- `src/lib/game/unlocks.ts` — add the `hints` `UNLOCKS` entry.
- `src/lib/game/progression.test.ts` — extend the expected cost ladder.
- `src/lib/game/storage.ts` — add `loadHintCount()` / `saveHintCount()`.
- `src/lib/game/storage.test.ts` — round-trip test.
- `src/lib/game/state.svelte.ts` — hint count state, `buyHint`, hinted-cell selection, `hintedCandidates` derived, getters.
- `src/lib/game/state.test.ts` — hint economy + selection tests.
- `src/lib/components/Cell.svelte` — render corner candidate marks.
- `src/lib/components/Board.svelte` — pass `hintCandidates` per cell.
- `src/lib/components/Sidebar.svelte` — HINTS section.

---

## Task 1: Candidate engine + hint-cell selection (`board.ts`)

**Files:**
- Modify: `src/lib/game/board.ts`
- Test: `src/lib/game/board.test.ts`

**Interfaces:**
- Consumes: existing private `arePeers(a, b, config)` and `shuffle(items)` in `board.ts`; `Board`, `Cell` types; `BoardConfig` from `config.ts`.
- Produces:
  - `candidates(board: Board, config: BoardConfig): (number[] | null)[]` — per index: ascending legal digits `1..config.symbols` with no peer conflict for empty cells; `null` for any cell with a value (filled or prefilled).
  - `pickHintCells(board: Board, n: number): number[]` — up to `min(n, #empties)` distinct random indices of empty (`value === null`) cells.

- [ ] **Step 1: Write the failing tests**

Add to the imports at the top of `src/lib/game/board.test.ts` (extend the existing `from './board'` import list):

```ts
import {
  generatePuzzle,
  isComplete,
  toBlocks,
  findConflicts,
  firstEmptyIndex,
  nextEmptyIndex,
  exhaustedSymbols,
  candidates,
  pickHintCells,
  type Board,
} from './board';
```

Append these describe blocks to the end of `src/lib/game/board.test.ts`:

```ts
describe('candidates', () => {
  // Build a single-block 3×3 board from an explicit value list (null = empty).
  function board3(values: (number | null)[]): Board {
    return values.map((v) => ({ value: v, prefilled: v !== null }));
  }

  it('lists ascending legal digits for empty cells in the single 3×3 block', () => {
    const b = board3([1, 2, 3, 4, 5, 6, null, null, null]);
    const c = candidates(b, BOARDS.default);
    expect(c[6]).toEqual([7, 8, 9]);
    expect(c[7]).toEqual([7, 8, 9]);
    expect(c[8]).toEqual([7, 8, 9]);
  });

  it('returns null for filled and prefilled cells', () => {
    const b = board3([1, 2, 3, 4, 5, 6, null, null, null]);
    const c = candidates(b, BOARDS.default);
    expect(c[0]).toBeNull();
  });

  it('excludes same-row values across a block boundary on the 6×3 (row constraint)', () => {
    // 6×3: 18 cells, all empty except cell 0 (row 0, block 0) = 5.
    const values: (number | null)[] = Array(18).fill(null);
    values[0] = 5;
    const b: Board = values.map((v) => ({ value: v, prefilled: v !== null }));
    const c = candidates(b, BOARDS.board6x3);
    // cell 3 is row 0, block 1 — shares the row with cell 0, so 5 is excluded.
    expect(c[3]).toEqual([1, 2, 3, 4, 6, 7, 8, 9]);
    // cell 15 is row 2, block 1 — no shared row/col/block, so all digits are legal.
    expect(c[15]).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
});

describe('pickHintCells', () => {
  it('picks n distinct empty indices when enough empties exist', () => {
    const b = generatePuzzle(BOARDS.default, 3);
    const picked = pickHintCells(b, 2);
    expect(picked).toHaveLength(2);
    expect(new Set(picked).size).toBe(2);
    for (const i of picked) expect(b[i].value).toBeNull();
  });

  it('clamps to the number of empty cells', () => {
    const b = generatePuzzle(BOARDS.default, 3);
    expect(pickHintCells(b, 5)).toHaveLength(3);
  });

  it('returns an empty array for n = 0', () => {
    const b = generatePuzzle(BOARDS.default, 3);
    expect(pickHintCells(b, 0)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- board.test.ts`
Expected: FAIL — `candidates is not a function` / `pickHintCells is not a function`.

- [ ] **Step 3: Implement the two functions**

Append to `src/lib/game/board.ts` (after `findConflicts`, at end of file). Both reuse the existing private `arePeers` and `shuffle` already defined in this file:

```ts
// Legal digits per cell: for each EMPTY cell, the symbols 1..config.symbols that no peer
// (same row/col/block) already uses — the same peer relation findConflicts checks against,
// so a listed candidate is exactly a digit that would not create a conflict. Cells that
// already hold a value (filled or prefilled) return null. Pure; no solution retained.
export function candidates(board: Board, config: BoardConfig): (number[] | null)[] {
  const result: (number[] | null)[] = [];
  for (let i = 0; i < board.length; i++) {
    if (board[i].value !== null) {
      result.push(null);
      continue;
    }
    const used = new Set<number>();
    for (let j = 0; j < board.length; j++) {
      const v = board[j].value;
      if (v !== null && j !== i && arePeers(i, j, config)) used.add(v);
    }
    const legal: number[] = [];
    for (let s = 1; s <= config.symbols; s++) if (!used.has(s)) legal.push(s);
    result.push(legal);
  }
  return result;
}

// Up to `n` distinct random indices of empty (value === null) cells. Reuses the same
// shuffle as puzzle generation; clamps to the number of empties (so n larger than the
// board's blanks, or n = 0, is safe).
export function pickHintCells(board: Board, n: number): number[] {
  const empties: number[] = [];
  for (let i = 0; i < board.length; i++) if (board[i].value === null) empties.push(i);
  return shuffle(empties).slice(0, Math.min(n, empties.length));
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- board.test.ts`
Expected: PASS (all board tests, including the 3 new describe blocks).

- [ ] **Step 5: Commit**

```bash
git add src/lib/game/board.ts src/lib/game/board.test.ts
git commit -m "feat: add candidate engine and hint-cell selection to board.ts"
```

---

## Task 2: Hint cost formula + economy wiring (`formula.ts`, `config.ts`, `unlocks.ts`)

**Files:**
- Modify: `src/lib/game/formula.ts`
- Modify: `src/lib/game/config.ts:48-55` (the `PROGRESSION` array)
- Modify: `src/lib/game/unlocks.ts:11-13` (the `UNLOCKS` array)
- Test: `src/lib/game/formula.test.ts`, `src/lib/game/progression.test.ts`

**Interfaces:**
- Consumes: `POINT_SCALE`, `REF_SPEED_MULT`, `boardWorth`, private `round5` (all in `formula.ts`); `BoardConfig`; `GATE_COSTS` from `config.ts`.
- Produces:
  - `hintCost(level: number, board: BoardConfig): number` — cost of the `level`-th hint (1-indexed) on `board`.
  - `HINT_BASE_N = 2`, `HINT_GROWTH = 2` (exported constants).
  - `GATE_COSTS['hints'] === 100` and a `hints` entry in `UNLOCKS` with `cost: 100`.

- [ ] **Step 1: Write the failing `hintCost` tests**

Append to `src/lib/game/formula.test.ts` (extend the top import to `import { gateCost, hintCost } from './formula';`, then add):

```ts
import { BOARDS } from './config';

describe('hintCost', () => {
  it('follows a geometric ladder on the 3×3 (worth 1)', () => {
    // round5( 10 × 1 × 2 × 2^(level-1) × 2.5 )
    expect(hintCost(1, BOARDS.default)).toBe(50);
    expect(hintCost(2, BOARDS.default)).toBe(100);
    expect(hintCost(3, BOARDS.default)).toBe(200);
    expect(hintCost(4, BOARDS.default)).toBe(400);
  });

  it('scales with board worth on the 6×3', () => {
    // worth(6×3) = (18/9)^1.3 ≈ 2.4623 → hint 1 ≈ 123 → 125; hint 2 ≈ 246 → 245
    expect(hintCost(1, BOARDS.board6x3)).toBe(125);
    expect(hintCost(2, BOARDS.board6x3)).toBe(245);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- formula.test.ts`
Expected: FAIL — `hintCost is not a function`.

- [ ] **Step 3: Implement `hintCost` in `formula.ts`**

Add to `src/lib/game/formula.ts` (after the `REF_SPEED_MULT` constant near the top for the constants, and after `gateCost` at the end for the function):

Constants (place right after the `REF_SPEED_MULT` declaration, ~line 11):

```ts
export const HINT_BASE_N = 2;        // first hint ≈ this many easy-tier solves' worth
export const HINT_GROWTH = 2;        // each successive hint multiplies the cost by this
```

Function (append at end of file, after `gateCost`):

```ts
// Cost of the `level`-th hint (1-indexed) on a board. Anchored to the board's worth (the
// easy-tier density is the reference, so difficulty is folded out), escalating geometrically
// per level and folding in REF_SPEED_MULT like the other derived gate costs.
export function hintCost(level: number, board: BoardConfig): number {
  return round5(
    POINT_SCALE * boardWorth(board) * HINT_BASE_N * HINT_GROWTH ** (level - 1) * REF_SPEED_MULT,
  );
}
```

- [ ] **Step 4: Run to verify `hintCost` passes**

Run: `npm test -- formula.test.ts`
Expected: PASS.

- [ ] **Step 5: Wire the master unlock into `PROGRESSION` and `UNLOCKS`**

In `src/lib/game/config.ts`, insert **one** new line into `PROGRESSION` immediately **after** the `speed-bonus` line — leave every other line exactly as it already is. The single line to add:

```ts
  { gate: 'hints', n: 4, anchor: 'default:easy', withSpeed: true, requires: ['speed-bonus'] },
```

For reference, the full array afterward reads (ascending cost 30 → 100 → 125 → 430 → 800 → 1605 → 2650, so the monotonic test still holds):

```ts
export const PROGRESSION: ProgressionEntry[] = [
  { gate: 'speed-bonus', n: 3, anchor: 'default:easy', withSpeed: false, requires: [] },
  { gate: 'hints', n: 4, anchor: 'default:easy', withSpeed: true, requires: ['speed-bonus'] },
  { gate: 'default:medium', n: 5, anchor: 'default:easy', withSpeed: true, requires: ['default:easy'] },
  { gate: 'board6x3', n: 8, anchor: 'default:medium', withSpeed: true, requires: ['default:medium'] },
  { gate: 'default:hard', n: 13, anchor: 'board6x3:easy', withSpeed: true, requires: ['default:medium'] },
  { gate: 'board6x3:medium', n: 18, anchor: 'default:hard', withSpeed: true, requires: ['board6x3:easy'] },
  { gate: 'board6x3:hard', n: 20, anchor: 'board6x3:medium', withSpeed: true, requires: ['board6x3:medium'] },
];
```

In `src/lib/game/unlocks.ts`, add the `hints` entry to `UNLOCKS` (after `speed-bonus`):

```ts
export const UNLOCKS: Unlock[] = [
  { id: 'speed-bonus', title: 'Speed Bonus', description: 'Solve time now boosts points.', cost: GATE_COSTS['speed-bonus'] },
  { id: 'hints', title: 'Hints', description: 'Reveal candidate digits in random cells — buy more per board.', cost: GATE_COSTS['hints'] },
];
```

- [ ] **Step 6: Update the progression ladder test**

In `src/lib/game/progression.test.ts`, add `hints` to `EXPECTED` and assert the wired cost:

```ts
const EXPECTED: Record<string, number> = {
  'speed-bonus': 30,
  'hints': 100,
  'default:medium': 125,
  'board6x3': 430,
  'default:hard': 800,
  'board6x3:medium': 1605,
  'board6x3:hard': 2650,
};
```

And add one assertion inside the `'wires derived costs into UNLOCKS, board, and tier configs'` test:

```ts
    expect(UNLOCKS.find((u) => u.id === 'hints')!.cost).toBe(100);
```

- [ ] **Step 7: Run the full economy test suite**

Run: `npm test -- formula.test.ts progression.test.ts`
Expected: PASS (ladder equals the extended `EXPECTED`, monotonic check still holds, `hints` cost = 100).

- [ ] **Step 8: Commit**

```bash
git add src/lib/game/formula.ts src/lib/game/formula.test.ts src/lib/game/config.ts src/lib/game/unlocks.ts src/lib/game/progression.test.ts
git commit -m "feat: add hint master unlock and hintCost formula to the economy"
```

---

## Task 3: Per-board hint-count persistence (`storage.ts`)

**Files:**
- Modify: `src/lib/game/storage.ts`
- Test: `src/lib/game/storage.test.ts`

**Interfaces:**
- Produces:
  - `loadHintCount(boardId: string): number` — persisted count for a board, default `0`, clamped to a non-negative integer.
  - `saveHintCount(boardId: string, n: number): void` — key `sudoku-incremental:hints:${boardId}`.

- [ ] **Step 1: Write the failing test**

Append to `src/lib/game/storage.test.ts` (extend its `from './storage'` import to include `loadHintCount, saveHintCount`):

```ts
describe('hint count persistence', () => {
  it('defaults to 0 when unset', () => {
    expect(loadHintCount('default')).toBe(0);
  });

  it('round-trips per board and stays isolated', () => {
    saveHintCount('default', 3);
    saveHintCount('board6x3', 1);
    expect(loadHintCount('default')).toBe(3);
    expect(loadHintCount('board6x3')).toBe(1);
  });

  it('treats corrupt values as 0', () => {
    localStorage.setItem('sudoku-incremental:hints:default', 'not-a-number');
    expect(loadHintCount('default')).toBe(0);
  });
});
```

> If `storage.test.ts` has no `beforeEach(() => localStorage.clear())`, add one inside this describe block (match the pattern already in the file).

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- storage.test.ts`
Expected: FAIL — `loadHintCount is not a function`.

- [ ] **Step 3: Implement in `storage.ts`**

Append to `src/lib/game/storage.ts`:

```ts
// Per-board hint count — how many random cells reveal candidate marks. Persistent
// (survives resetAll, like difficulty tiers). Defaults to 0.
function hintCountKey(boardId: string): string {
  return `sudoku-incremental:hints:${boardId}`;
}

export function loadHintCount(boardId: string): number {
  const raw = localStorage.getItem(hintCountKey(boardId));
  if (raw === null) return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

export function saveHintCount(boardId: string, n: number): void {
  localStorage.setItem(hintCountKey(boardId), String(n));
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- storage.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/game/storage.ts src/lib/game/storage.test.ts
git commit -m "feat: persist per-board hint count"
```

---

## Task 4: Hint state, purchase, and derived candidates (`state.svelte.ts`)

**Files:**
- Modify: `src/lib/game/state.svelte.ts`
- Test: `src/lib/game/state.test.ts`

**Interfaces:**
- Consumes: `candidates`, `pickHintCells` (Task 1); `hintCost` (Task 2); `loadHintCount`, `saveHintCount` (Task 3); existing `owned` set, `selectedTier()`, `activeBoard()`, `activeBoardId`, `board`, `status`, `pointokus`.
- Produces (new members on the object returned by `createGame()`):
  - `get hintUnlocked(): boolean`
  - `get hintCount(): number`
  - `get nextHintCost(): number | null` — cost of the next hint, or `null` at the tier cap.
  - `get hintedCandidates(): Record<number, number[]>` — hinted cell index → its candidate digits.
  - `buyHint(): void`

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/game/state.test.ts`:

```ts
describe('hint system in game state', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  function withHintsOwned(points: number) {
    localStorage.setItem('sudoku-incremental:pointokus', String(points));
    localStorage.setItem('sudoku-incremental:unlocks', JSON.stringify(['speed-bonus', 'hints']));
    return createGame();
  }

  it('buyHint does nothing until the hints unlock is owned', () => {
    localStorage.setItem('sudoku-incremental:pointokus', '1000');
    const game = createGame();

    game.buyHint();

    expect(game.hintCount).toBe(0);
    expect(game.pointokus).toBe(1000);
  });

  it('buyHint deducts the escalating cost, increments the count, and persists', () => {
    const game = withHintsOwned(1000);

    game.buyHint(); // hint 1: 50
    game.buyHint(); // hint 2: 100

    expect(game.hintCount).toBe(2);
    expect(game.pointokus).toBe(850); // 1000 - 50 - 100
    expect(loadHintCount('default')).toBe(2);
  });

  it('buyHint caps at the selected tier empty-cell count (easy = 3)', () => {
    const game = withHintsOwned(5000);

    game.buyHint(); // 50
    game.buyHint(); // 100
    game.buyHint(); // 200 → count 3 (= easy empties)
    const afterThree = game.pointokus;
    game.buyHint(); // blocked

    expect(game.hintCount).toBe(3);
    expect(game.nextHintCost).toBeNull();
    expect(game.pointokus).toBe(afterThree);
  });

  it('buyHint is blocked while a solve is in progress', () => {
    const game = withHintsOwned(1000);

    game.start();
    game.buyHint();

    expect(game.hintCount).toBe(0);
    game.resetAll(); // stop the timer
  });

  it('hint count is per board and survives resetAll', () => {
    const game = withHintsOwned(1000);
    game.buyHint();
    expect(game.hintCount).toBe(1);

    game.resetAll();
    expect(game.hintCount).toBe(1); // persistent, like tiers
    expect(loadHintCount('default')).toBe(1);
  });

  it('start() reveals candidates for min(hintCount, empties) empty cells', () => {
    localStorage.setItem('sudoku-incremental:unlocks', JSON.stringify(['speed-bonus', 'hints']));
    localStorage.setItem('sudoku-incremental:hints:default', '2');
    const game = createGame();

    game.start();

    const hinted = game.hintedCandidates;
    const keys = Object.keys(hinted).map(Number);
    expect(keys).toHaveLength(2); // easy = 3 empties, capped by count 2
    for (const i of keys) {
      expect(game.board![i].value).toBeNull();
      expect(game.board![i].prefilled).toBe(false);
      expect(hinted[i].length).toBeGreaterThan(0);
      expect(hinted[i].every((d) => d >= 1 && d <= 9)).toBe(true);
    }
    game.resetAll();
  });

  it('exposes no hinted candidates when the unlock is not owned', () => {
    localStorage.setItem('sudoku-incremental:hints:default', '2');
    const game = createGame(); // no hints unlock

    game.start();

    expect(Object.keys(game.hintedCandidates)).toHaveLength(0);
    game.resetAll();
  });
});
```

> The test file already imports `createGame`. Add `loadHintCount` to the imports: at the top add `import { loadHintCount } from './storage';` if not already present.

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- state.test.ts`
Expected: FAIL — `game.buyHint is not a function` (and related).

- [ ] **Step 3: Wire imports and state fields**

In `src/lib/game/state.svelte.ts`:

Extend the `./board` import to include the new helpers:

```ts
import { generatePuzzle, isComplete, findConflicts, firstEmptyIndex, nextEmptyIndex, candidates, pickHintCells, type Board } from './board';
```

Extend the `./scoring` import line by adding a `hintCost` import from `./formula` right below it:

```ts
import { hintCost } from './formula';
```

Extend the storage import block to include the two new functions:

```ts
  loadHintCount,
  saveHintCount,
```

Add `hintedCells` to the `PlayState` type (so it is snapshotted per board):

```ts
type PlayState = {
  board: Board | null;
  status: Status;
  selected: number | null;
  elapsed: number;
  lastResult: LastResult | null;
  startTime: number;
  lastEntered: number | null;
  hintedCells: number[];
};
```

Add the reactive state near the other per-board `$state` declarations (just after `selectedTierId`, ~line 56):

```ts
  let hintCount = $state(loadHintCount(initialActiveBoardId));
  let hintedCells = $state<number[]>([]);
```

- [ ] **Step 4: Add the `hintedCandidates` derived**

Add just after the existing `conflicts` `$derived` (~line 88):

```ts
  // Hinted cell index -> its current candidate digits. Recomputes when the board or the
  // hinted set changes (as the player fills cells the candidates narrow); it does NOT depend
  // on `elapsed`, so it never recomputes on the 50ms timer tick.
  const hintedCandidates = $derived.by((): Record<number, number[]> => {
    if (board === null || status !== 'playing' || hintedCells.length === 0) return {};
    const all = candidates(board, activeBoard());
    const map: Record<number, number[]> = {};
    for (const i of hintedCells) {
      const c = all[i];
      if (c !== null) map[i] = c;
    }
    return map;
  });
```

- [ ] **Step 5: Populate `hintedCells` on `start()`**

In `start()`, after `selected = firstEmptyIndex(board);` add:

```ts
    hintedCells = owned.has('hints') ? pickHintCells(board, hintCount) : [];
```

- [ ] **Step 6: Add the `buyHint` action**

Add near `buyTier` (~line 166):

```ts
  function buyHint() {
    if (status === 'playing') return;          // only between solves
    if (!owned.has('hints')) return;           // master unlock required
    if (hintCount >= selectedTier().emptyCells) return; // can't hint more cells than can be empty
    const cost = hintCost(hintCount + 1, activeBoard());
    if (pointokus < cost) return;              // affordable
    pointokus -= cost;
    hintCount += 1;
    savePointokus(pointokus);
    saveHintCount(activeBoardId, hintCount);
  }
```

- [ ] **Step 7: Snapshot/restore `hintedCells` and reload `hintCount` in `selectBoard`**

In `selectBoard`, add `hintedCells` to the outgoing snapshot object:

```ts
    boardStates[activeBoardId] = {
      board,
      status,
      selected,
      elapsed,
      lastResult,
      startTime,
      lastEntered,
      hintedCells,
    };
```

After `selectedTierId = loadSelectedTier(id);` add:

```ts
    hintCount = loadHintCount(id);
```

In the restore block, add:

```ts
    hintedCells = saved?.hintedCells ?? [];
```

- [ ] **Step 8: Clear `hintedCells` in `resetAll`**

In `resetAll`, alongside the other in-memory resets (after `lastEntered = null;`), add:

```ts
    hintedCells = [];
```

(Do **not** touch `hintCount` — it is persistent, like tiers.)

- [ ] **Step 9: Add the getters and action to the returned object**

Add to the returned object (near the other getters, e.g. after `speedBonusOwned`):

```ts
    get hintUnlocked() {
      return owned.has('hints');
    },
    get hintCount() {
      return hintCount;
    },
    get nextHintCost(): number | null {
      if (hintCount >= selectedTier().emptyCells) return null;
      return hintCost(hintCount + 1, activeBoard());
    },
    get hintedCandidates(): Record<number, number[]> {
      return hintedCandidates;
    },
```

And add `buyHint` to the action list at the bottom (next to `buyTier`):

```ts
    buyHint,
```

- [ ] **Step 10: Run the state tests**

Run: `npm test -- state.test.ts`
Expected: PASS (all new hint tests plus the existing suite).

- [ ] **Step 11: Run the whole suite + type check**

Run: `npm test && npm run check`
Expected: PASS / no errors.

- [ ] **Step 12: Commit**

```bash
git add src/lib/game/state.svelte.ts src/lib/game/state.test.ts
git commit -m "feat: hint count purchase and derived hinted candidates in game state"
```

---

## Task 5: Rendering — corner marks + Sidebar HINTS section

**Files:**
- Modify: `src/lib/components/Cell.svelte`
- Modify: `src/lib/components/Board.svelte`
- Modify: `src/lib/components/Sidebar.svelte`

**Interfaces:**
- Consumes: `game.hintedCandidates`, `game.hintUnlocked`, `game.hintCount`, `game.nextHintCost`, `game.buyHint`, `game.status`, `game.pointokus` (Task 4).
- No unit tests (components have no render harness — verified via `check`/`build` + manual smoke test).

- [ ] **Step 1: Add the `hintCandidates` prop and corner render to `Cell.svelte`**

In the `$props()` type, add the optional prop:

```ts
  let {
    cell,
    selected,
    error = false,
    conflict = false,
    hintCandidates,
    onSelect,
    onPress,
  }: {
    cell: Cell;
    selected: boolean;
    error?: boolean;
    conflict?: boolean;
    hintCandidates?: number[];
    onSelect: () => void;
    onPress?: (e: PointerEvent) => void;
  } = $props();
```

Inside the `<button>`, add the marks after the `{cell.value ?? ''}` / caret block (before `</button>`):

```svelte
  {#if cell.value == null && hintCandidates && hintCandidates.length > 0}
    <span class="hint-marks">
      {#each hintCandidates as d}<span>{d}</span>{/each}
    </span>
  {/if}
```

Add `position: relative;` to the existing `.cell` rule (needed so the absolutely-positioned marks anchor to the cell), and add the `.hint-marks` style (uses the `--dim` token, no animation → no reduced-motion guard needed):

```css
  .cell {
    /* ...existing properties... */
    position: relative;
  }

  .hint-marks {
    position: absolute;
    top: 3px;
    left: 4px;
    right: 4px;
    display: flex;
    flex-wrap: wrap;
    gap: 0 3px;
    font-family: 'JetBrains Mono', monospace;
    font-size: calc(var(--cell) * 0.14);
    line-height: 1.15;
    color: var(--dim);
    pointer-events: none;
  }
```

- [ ] **Step 2: Pass hinted candidates from `Board.svelte`**

In `src/lib/components/Board.svelte`, add the prop to the `<Cell ... />` usage:

```svelte
        <Cell
          {cell}
          selected={game.selected === index}
          error={game.lastEntered === index && conflicts.has(index)}
          conflict={conflicts.has(index) && game.lastEntered !== index}
          hintCandidates={game.hintedCandidates[index]}
          onSelect={() => game.select(index)}
          onPress={(e) => onCellPress?.(index, e)}
        />
```

- [ ] **Step 3: Add the HINTS section to `Sidebar.svelte`**

In `src/lib/components/Sidebar.svelte`, insert this block **after** the closing `</div>` of the `.unlocks` (DIFFICULTY) block and **before** the `.key-hint` block. It reuses existing sidebar classes (`divider`, `unlocks-head`, `unlocks-sub`, `unlock-row`, `unlock-title`, `unlock-sub`, `tier-btn`, `unlock-owned`), so no new CSS is required:

```svelte
  {#if game.hintUnlocked}
    <div class="divider"></div>

    <div class="unlocks">
      <div class="unlocks-head">
        <span>HINTS</span>
      </div>
      <div class="unlocks-sub">Reveal candidate digits in random cells.</div>
      <div class="unlocks-list">
        <div class="unlock-row" class:affordable={game.nextHintCost !== null && game.status !== 'playing' && game.pointokus >= game.nextHintCost}>
          <div>
            <div class="unlock-title">Hints per board</div>
            <div class="unlock-sub">{game.hintCount} active</div>
          </div>
          {#if game.nextHintCost !== null}
            <button
              class="tier-btn buy"
              onclick={() => game.buyHint()}
              disabled={game.status === 'playing' || game.pointokus < game.nextHintCost}
            >{game.nextHintCost} P</button>
          {:else}
            <span class="unlock-owned">MAX</span>
          {/if}
        </div>
      </div>
    </div>
  {/if}
```

- [ ] **Step 4: Type check and build**

Run: `npm run check && npm run build`
Expected: no type errors; build succeeds.

- [ ] **Step 5: Manual smoke test**

Run: `npm run dev`, then in the browser:
1. Buy **Speed Bonus** then **Hints** in the Unlocks tab (grant yourself points as needed — the game persists to localStorage; you can clear it via devtools). Confirm the **HINTS** section appears in the Sidebar only after buying Hints.
2. In the HINTS section, click the buy button once or twice; confirm the count rises, points drop by the shown cost, and the button is disabled during a solve.
3. Press **Start Puzzle**; confirm exactly `min(hintCount, empties)` empty cells show small dimmed candidate digits in the top-left corner, and that they narrow as you fill peers.
4. Confirm the buy button re-enables on completion/idle and that the count persists after a page reload and after Prestige (reset).

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/Cell.svelte src/lib/components/Board.svelte src/lib/components/Sidebar.svelte
git commit -m "feat: render corner candidate hints and the Sidebar HINTS section"
```

---

## Final verification

- [ ] Run the full gate:

```bash
npm run check && npm test && npm run build
```

Expected: type check clean, all tests pass, build succeeds.

- [ ] Confirm against the spec: master unlock (Layer A) ✓, per-board escalating count (Layer B) ✓, corner candidate display ✓, buyable only between solves ✓, persistent across reset ✓, candidate engine reusable by future automators ✓.
