# Sudoku Incremental — Slice 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first playable slice — solve a 3×3 board, earn flat Pointokus, reset, repeat — to validate solving feel.

**Architecture:** Svelte 5 (runes) single-page app. Pure game logic (board generation, completion check, persistence) lives in plain TypeScript modules that are unit-tested with Vitest. A thin runes-based store (`state.svelte.ts`) wraps that logic and drives small, focused Svelte components. The store is validated by playing the app; the pure logic is validated by tests.

**Tech Stack:** Svelte 5, Vite 6, TypeScript (strict), Vitest, jsdom (for storage tests only).

## Global Constraints

- Svelte 5 with **runes** (`$state`, `$props`, `$derived`). No Svelte 4 stores.
- TypeScript `strict` mode on.
- No dependencies beyond those declared in Task 1's `package.json`.
- Functional CSS only — no design polish, no cosmetics.
- All tunable numbers live in `src/lib/game/config.ts`. Starter values: `EMPTY_CELLS = 3`, `FLAT_POINTS = 10`, `BOARD_SIZE = 9`.
- Completion rule: a board is complete when all 9 cells are filled **and** all values are distinct.
- The in-progress board is **not** persisted. Only the Pointokus total is saved to LocalStorage.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `package.json`, `vite.config.ts`, `svelte.config.js`, `tsconfig.json`, `index.html` | Project scaffold + build/test config |
| `src/main.ts` | App entry point (mounts `App.svelte`) |
| `src/app.css` | Minimal functional styling |
| `src/vite-env.d.ts` | Ambient type references |
| `src/lib/game/config.ts` | Tunable constants |
| `src/lib/game/board.ts` | `Cell`/`Board` types, `generatePuzzle()`, `isComplete()` (pure) |
| `src/lib/game/storage.ts` | `loadPointokus()`, `savePointokus()` (LocalStorage) |
| `src/lib/game/state.svelte.ts` | Runes store: state + `start`/`select`/`place`/`clear`/`reset` |
| `src/lib/components/Header.svelte` | Pointokus total |
| `src/lib/components/Timer.svelte` | Running solve timer |
| `src/lib/components/Cell.svelte` | A single board cell button |
| `src/lib/components/Board.svelte` | 3×3 grid of cells |
| `src/lib/components/NumberPad.svelte` | 1–9 palette + Clear |
| `src/App.svelte` | Wires components, keyboard input, idle/playing/complete views |
| `src/lib/game/board.test.ts`, `src/lib/game/storage.test.ts` | Unit tests |

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `vite.config.ts`, `svelte.config.js`, `tsconfig.json`, `index.html`
- Create: `src/main.ts`, `src/App.svelte`, `src/app.css`, `src/vite-env.d.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: a runnable Vite dev server and a working `npm test` harness for later tasks.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "sudoku-incremental",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "check": "svelte-check --tsconfig ./tsconfig.json"
  },
  "devDependencies": {
    "@sveltejs/vite-plugin-svelte": "^5.0.0",
    "@tsconfig/svelte": "^5.0.4",
    "jsdom": "^25.0.0",
    "svelte": "^5.0.0",
    "svelte-check": "^4.0.0",
    "typescript": "^5.6.0",
    "vite": "^6.0.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create `vite.config.ts`**

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  test: {
    environment: 'node',
  },
});
```

- [ ] **Step 3: Create `svelte.config.js`**

```js
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
};
```

- [ ] **Step 4: Create `tsconfig.json`**

```json
{
  "extends": "@tsconfig/svelte/tsconfig.json",
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts", "src/**/*.svelte", "src/**/*.d.ts"]
}
```

- [ ] **Step 5: Create `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Sudoku Incremental</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 6: Create `src/vite-env.d.ts`**

```ts
/// <reference types="svelte" />
/// <reference types="vite/client" />
```

- [ ] **Step 7: Create `src/app.css`**

```css
:root {
  font-family: system-ui, sans-serif;
  color-scheme: light dark;
}
body {
  margin: 0;
  display: flex;
  justify-content: center;
}
main {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
}
.board {
  display: grid;
  grid-template-columns: repeat(3, 4rem);
  grid-template-rows: repeat(3, 4rem);
  gap: 2px;
}
.cell {
  font-size: 1.5rem;
  border: 1px solid #888;
  background: transparent;
  cursor: pointer;
}
.cell.prefilled {
  font-weight: bold;
  cursor: default;
}
.cell.selected {
  outline: 3px solid dodgerblue;
}
.numberpad {
  display: grid;
  grid-template-columns: repeat(5, 2.5rem);
  gap: 4px;
}
.numberpad button {
  font-size: 1.1rem;
  padding: 0.4rem 0;
  cursor: pointer;
}
.timer {
  font-variant-numeric: tabular-nums;
  font-size: 1.25rem;
}
.result {
  font-weight: bold;
}
```

- [ ] **Step 8: Create `src/App.svelte` (temporary placeholder)**

```svelte
<main>
  <h1>Sudoku Incremental</h1>
</main>
```

- [ ] **Step 9: Create `src/main.ts`**

```ts
import { mount } from 'svelte';
import App from './App.svelte';
import './app.css';

const app = mount(App, { target: document.getElementById('app')! });

export default app;
```

- [ ] **Step 10: Install dependencies**

Run: `npm install`
Expected: completes without errors; `node_modules/` created.

- [ ] **Step 11: Verify the build succeeds**

Run: `npm run build`
Expected: build completes, `dist/` created, no TypeScript errors.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "chore: scaffold Svelte 5 + Vite + TS project"
```

---

## Task 2: Board Logic & Config

**Files:**
- Create: `src/lib/game/config.ts`
- Create: `src/lib/game/board.ts`
- Test: `src/lib/game/board.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `BOARD_SIZE: number` (9), `EMPTY_CELLS: number` (3), `FLAT_POINTS: number` (10) from `config.ts`.
  - `type Cell = { value: number | null; prefilled: boolean }`
  - `type Board = Cell[]` (length `BOARD_SIZE`)
  - `generatePuzzle(): Board` — a board with `EMPTY_CELLS` empty cells and the rest pre-filled, values forming a 1..`BOARD_SIZE` permutation.
  - `isComplete(board: Board): boolean`

- [ ] **Step 1: Create `src/lib/game/config.ts`**

```ts
export const BOARD_SIZE = 9;
export const EMPTY_CELLS = 3;
export const FLAT_POINTS = 10;
```

- [ ] **Step 2: Write the failing tests**

Create `src/lib/game/board.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { generatePuzzle, isComplete, type Board } from './board';
import { BOARD_SIZE, EMPTY_CELLS } from './config';

describe('generatePuzzle', () => {
  it('returns a board of BOARD_SIZE cells', () => {
    expect(generatePuzzle()).toHaveLength(BOARD_SIZE);
  });

  it('leaves exactly EMPTY_CELLS empty, non-prefilled cells', () => {
    const board = generatePuzzle();
    const empty = board.filter((c) => c.value === null);
    expect(empty).toHaveLength(EMPTY_CELLS);
    expect(empty.every((c) => c.prefilled === false)).toBe(true);
  });

  it('prefilled cells hold distinct numbers within 1..BOARD_SIZE', () => {
    const board = generatePuzzle();
    const filled = board.filter((c) => c.value !== null);
    expect(filled.every((c) => c.prefilled === true)).toBe(true);
    const values = filled.map((c) => c.value);
    expect(new Set(values).size).toBe(values.length);
    expect(values.every((v) => v! >= 1 && v! <= BOARD_SIZE)).toBe(true);
  });
});

describe('isComplete', () => {
  function fullDistinct(): Board {
    return Array.from({ length: BOARD_SIZE }, (_, i) => ({
      value: i + 1,
      prefilled: false,
    }));
  }

  it('is true when full and all values distinct', () => {
    expect(isComplete(fullDistinct())).toBe(true);
  });

  it('is false when a cell is empty', () => {
    const board = fullDistinct();
    board[0] = { value: null, prefilled: false };
    expect(isComplete(board)).toBe(false);
  });

  it('is false when full but a value is duplicated', () => {
    const board = fullDistinct();
    board[0] = { value: board[1].value, prefilled: false };
    expect(isComplete(board)).toBe(false);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `board.ts` does not exist / exports missing.

- [ ] **Step 4: Implement `src/lib/game/board.ts`**

```ts
import { BOARD_SIZE, EMPTY_CELLS } from './config';

export type Cell = { value: number | null; prefilled: boolean };
export type Board = Cell[];

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function generatePuzzle(): Board {
  const numbers = shuffle(
    Array.from({ length: BOARD_SIZE }, (_, i) => i + 1),
  );
  const board: Board = numbers.map((value) => ({ value, prefilled: true }));

  const indices = shuffle(
    Array.from({ length: BOARD_SIZE }, (_, i) => i),
  ).slice(0, EMPTY_CELLS);

  for (const i of indices) {
    board[i] = { value: null, prefilled: false };
  }
  return board;
}

export function isComplete(board: Board): boolean {
  const values = board.map((c) => c.value);
  if (values.some((v) => v === null)) return false;
  return new Set(values).size === BOARD_SIZE;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — all tests in `board.test.ts` green.

- [ ] **Step 6: Commit**

```bash
git add src/lib/game/config.ts src/lib/game/board.ts src/lib/game/board.test.ts
git commit -m "feat: add board generation, completion check, and config"
```

---

## Task 3: Persistence

**Files:**
- Create: `src/lib/game/storage.ts`
- Test: `src/lib/game/storage.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `loadPointokus(): number` — returns saved total, or `0` if missing/invalid.
  - `savePointokus(value: number): void` — writes the total to LocalStorage.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/game/storage.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { loadPointokus, savePointokus } from './storage';

describe('pointokus persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns 0 when nothing is saved', () => {
    expect(loadPointokus()).toBe(0);
  });

  it('round-trips a saved value', () => {
    savePointokus(42);
    expect(loadPointokus()).toBe(42);
  });

  it('returns 0 when the stored value is not a number', () => {
    localStorage.setItem('sudoku-incremental:pointokus', 'not-a-number');
    expect(loadPointokus()).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `storage.ts` does not exist.

- [ ] **Step 3: Implement `src/lib/game/storage.ts`**

```ts
const KEY = 'sudoku-incremental:pointokus';

export function loadPointokus(): number {
  const raw = localStorage.getItem(KEY);
  if (raw === null) return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

export function savePointokus(value: number): void {
  localStorage.setItem(KEY, String(value));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — all tests green (both `board.test.ts` and `storage.test.ts`).

- [ ] **Step 5: Commit**

```bash
git add src/lib/game/storage.ts src/lib/game/storage.test.ts
git commit -m "feat: add Pointokus LocalStorage persistence"
```

---

## Task 4: Game State Store

**Files:**
- Create: `src/lib/game/state.svelte.ts`

**Interfaces:**
- Consumes: `generatePuzzle`, `isComplete`, `type Board` from `board.ts`; `FLAT_POINTS` from `config.ts`; `loadPointokus`, `savePointokus` from `storage.ts`.
- Produces: a singleton `game` object with read-only getters `pointokus`, `board`, `status`, `selected`, `elapsed`, `lastResult`, and methods:
  - `start(): void` — generate puzzle, start timer, set status `playing`.
  - `select(index: number): void` — select an empty cell.
  - `place(value: number): void` — set the selected cell's value, then check for win.
  - `clear(): void` — empty the selected cell.
  - `reset(): void` — return to idle.
  - `status` is one of `'idle' | 'playing' | 'complete'`.
  - `lastResult` is `{ points: number; timeMs: number } | null`.

> This store is reactive (Svelte 5 runes) and is verified by playing the app in Task 6, not by a unit test. Its logic dependencies (`generatePuzzle`, `isComplete`, persistence) are already covered by Tasks 2–3.

- [ ] **Step 1: Implement `src/lib/game/state.svelte.ts`**

```ts
import { generatePuzzle, isComplete, type Board } from './board';
import { FLAT_POINTS } from './config';
import { loadPointokus, savePointokus } from './storage';

type Status = 'idle' | 'playing' | 'complete';

function createGame() {
  let pointokus = $state(loadPointokus());
  let board = $state<Board | null>(null);
  let status = $state<Status>('idle');
  let selected = $state<number | null>(null);
  let elapsed = $state(0);
  let lastResult = $state<{ points: number; timeMs: number } | null>(null);

  let startTime = 0;
  let timer: ReturnType<typeof setInterval> | null = null;

  function stopTimer() {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  }

  function start() {
    board = generatePuzzle();
    selected = null;
    lastResult = null;
    elapsed = 0;
    status = 'playing';
    startTime = performance.now();
    stopTimer();
    timer = setInterval(() => {
      elapsed = performance.now() - startTime;
    }, 50);
  }

  function select(index: number) {
    if (status !== 'playing' || board === null) return;
    if (board[index].prefilled) return;
    selected = index;
  }

  function place(value: number) {
    if (status !== 'playing' || board === null || selected === null) return;
    if (board[selected].prefilled) return;
    board[selected] = { value, prefilled: false };
    checkWin();
  }

  function clear() {
    if (status !== 'playing' || board === null || selected === null) return;
    if (board[selected].prefilled) return;
    board[selected] = { value: null, prefilled: false };
  }

  function checkWin() {
    if (board === null || !isComplete(board)) return;
    stopTimer();
    const timeMs = performance.now() - startTime;
    elapsed = timeMs;
    pointokus += FLAT_POINTS;
    savePointokus(pointokus);
    lastResult = { points: FLAT_POINTS, timeMs };
    status = 'complete';
  }

  function reset() {
    stopTimer();
    board = null;
    selected = null;
    status = 'idle';
    elapsed = 0;
    lastResult = null;
  }

  return {
    get pointokus() {
      return pointokus;
    },
    get board() {
      return board;
    },
    get status() {
      return status;
    },
    get selected() {
      return selected;
    },
    get elapsed() {
      return elapsed;
    },
    get lastResult() {
      return lastResult;
    },
    start,
    select,
    place,
    clear,
    reset,
  };
}

export const game = createGame();
```

- [ ] **Step 2: Verify it type-checks**

Run: `npm run check`
Expected: no errors (warnings about unused App placeholder are acceptable; will be replaced in Task 5).

- [ ] **Step 3: Commit**

```bash
git add src/lib/game/state.svelte.ts
git commit -m "feat: add runes game state store"
```

---

## Task 5: UI Components & Wiring

**Files:**
- Create: `src/lib/components/Header.svelte`
- Create: `src/lib/components/Timer.svelte`
- Create: `src/lib/components/Cell.svelte`
- Create: `src/lib/components/Board.svelte`
- Create: `src/lib/components/NumberPad.svelte`
- Modify: `src/App.svelte` (replace placeholder)

**Interfaces:**
- Consumes: the `game` singleton from `state.svelte.ts`; `type Cell` from `board.ts`.
- Produces: a complete playable UI. No exports consumed by later tasks.

- [ ] **Step 1: Create `src/lib/components/Header.svelte`**

```svelte
<script lang="ts">
  import { game } from '../game/state.svelte';
</script>

<header>Pointokus: {game.pointokus}</header>
```

- [ ] **Step 2: Create `src/lib/components/Timer.svelte`**

```svelte
<script lang="ts">
  import { game } from '../game/state.svelte';

  function format(ms: number): string {
    const totalCs = Math.floor(ms / 10);
    const cs = totalCs % 100;
    const totalS = Math.floor(totalCs / 100);
    const s = totalS % 60;
    const m = Math.floor(totalS / 60);
    return `${m}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
  }
</script>

<div class="timer">{format(game.elapsed)}</div>
```

- [ ] **Step 3: Create `src/lib/components/Cell.svelte`**

```svelte
<script lang="ts">
  import type { Cell } from '../game/board';

  let {
    cell,
    selected,
    onSelect,
  }: { cell: Cell; selected: boolean; onSelect: () => void } = $props();
</script>

<button
  class="cell"
  class:selected
  class:prefilled={cell.prefilled}
  disabled={cell.prefilled}
  onclick={onSelect}
>
  {cell.value ?? ''}
</button>
```

- [ ] **Step 4: Create `src/lib/components/Board.svelte`**

```svelte
<script lang="ts">
  import { game } from '../game/state.svelte';
  import Cell from './Cell.svelte';
</script>

<div class="board">
  {#each game.board ?? [] as cell, i}
    <Cell {cell} selected={game.selected === i} onSelect={() => game.select(i)} />
  {/each}
</div>
```

- [ ] **Step 5: Create `src/lib/components/NumberPad.svelte`**

```svelte
<script lang="ts">
  import { game } from '../game/state.svelte';

  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
</script>

<div class="numberpad">
  {#each numbers as n}
    <button onclick={() => game.place(n)}>{n}</button>
  {/each}
  <button onclick={() => game.clear()}>Clear</button>
</div>
```

- [ ] **Step 6: Replace `src/App.svelte`**

```svelte
<script lang="ts">
  import { game } from './lib/game/state.svelte';
  import Header from './lib/components/Header.svelte';
  import Board from './lib/components/Board.svelte';
  import NumberPad from './lib/components/NumberPad.svelte';
  import Timer from './lib/components/Timer.svelte';

  function onKeydown(e: KeyboardEvent) {
    if (game.status !== 'playing') return;
    if (e.key >= '1' && e.key <= '9') {
      game.place(Number(e.key));
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      game.clear();
    }
  }
</script>

<svelte:window onkeydown={onKeydown} />

<Header />

<main>
  {#if game.status === 'idle'}
    <button onclick={() => game.start()}>Start</button>
  {:else}
    <Timer />
    <Board />
    <NumberPad />
    {#if game.status === 'complete' && game.lastResult}
      <div class="result">
        Solved! +{game.lastResult.points} Pointokus in
        {(game.lastResult.timeMs / 1000).toFixed(2)}s
      </div>
      <button onclick={() => game.reset()}>Reset Boards</button>
    {/if}
  {/if}
</main>
```

- [ ] **Step 7: Verify it type-checks**

Run: `npm run check`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/App.svelte src/lib/components/
git commit -m "feat: add board UI components and wiring"
```

---

## Task 6: End-to-End Verification

**Files:** none (verification only).

**Interfaces:** none.

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: PASS — all tests in `board.test.ts` and `storage.test.ts`.

- [ ] **Step 2: Type-check and build**

Run: `npm run check && npm run build`
Expected: no errors; `dist/` produced.

- [ ] **Step 3: Manual playtest**

Run: `npm run dev`, open the served URL, and confirm each:
- Idle state shows only a **Start** button (no numbers visible).
- Pressing **Start** reveals a 3×3 board with exactly 3 empty cells; the timer starts counting immediately.
- Clicking an empty cell selects it (blue outline); pre-filled cells cannot be selected.
- Typing `1`–`9` and clicking palette numbers both place into the selected cell.
- `Backspace`/`Delete` and the **Clear** button both empty the selected cell.
- Duplicate/wrong placements are allowed and freely correctable; no error flagging.
- Filling all cells with 1–9 distinct stops the timer and shows "Solved! +10 Pointokus in N.NNs".
- Pointokus total in the header increases by 10.
- **Reset Boards** returns to the idle Start state.
- Refreshing the page preserves the Pointokus total but returns to idle (in-progress board not persisted).

- [ ] **Step 4: Final commit (if any fixes were needed)**

```bash
git add -A
git commit -m "chore: slice 1 end-to-end verification"
```

---

## Self-Review Notes

- **Spec coverage:** 3×3 board (Task 2), random pre-fills / 3 empty (Task 2), Start→generate+timer simultaneity (Task 4), free wrong placement / no flagging (Task 4 + manual check), completion + flat points + result display (Tasks 4–5), Reset (Tasks 4–5), keyboard + click-to-place (Task 5), LocalStorage Pointokus persistence (Task 3 + Task 4 `savePointokus` call), no in-progress board persistence (Task 4 `reset`/load behavior + manual check). All covered.
- **Out of scope confirmed absent:** no difficulty tiers, no unlocks, no scoring curve, no multiple boards.
- **Type consistency:** `Cell`/`Board` defined in `board.ts` and consumed identically in `state.svelte.ts` and `Cell.svelte`; `game` getters/methods match between `state.svelte.ts` and all components.
