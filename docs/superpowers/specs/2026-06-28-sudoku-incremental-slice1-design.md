# Sudoku Incremental — Slice 1 Design (Solving Feel)

*Date: 2026-06-28*

## Purpose

First buildable slice of the Sudoku Incremental prototype (see `sudoku-incremental-gdd (1).md`). The goal is to validate **solving feel** — does placing numbers on the 3×3 board feel snappy and satisfying? — before building the upgrade loop.

This is intentionally narrower than the GDD's full Phase 1 MVP. It does **not** yet answer the GDD's central "is the loop fun?" question, which depends on the speed-bonus upgrade. That comes in a follow-up slice. If solving doesn't feel good here, no upgrade loop will save it, so this is validated first.

## Scope

**In scope:**
- Single 3×3 board (9 cells); numbers 1–9 each placed exactly once; no row/column constraints.
- Easy difficulty only: 3 cells empty, 6 pre-filled with correct numbers, chosen randomly each puzzle.
- Empty board + Start button; puzzle generates and timer starts simultaneously on press (prevents pre-solving).
- Wrong/duplicate placements allowed and freely correctable; no error flagging.
- Both input methods: keyboard and click-to-place.
- Completion detection → award flat Pointokus → show points earned + time taken.
- Manual "Reset Boards" button returning to idle.
- Pointokus total display.
- Lightweight LocalStorage autosave of the Pointokus total.

**Out of scope (deferred to later slices):**
- Speed-bonus unlock and tiered/exponential scoring.
- Global speed-bonus multiplier upgrade.
- Per-board difficulty tiers.
- Unlocks tab.
- Anything from Phases 2+.
- Cosmetics beyond functional UI.
- Persisting an in-progress board.

## Tech Stack

- **Svelte 5 (runes) + Vite + TypeScript.** Svelte's reactivity maps cleanly onto incremental-game state with minimal boilerplate; Vite gives zero-config TS + instant hot reload.
- Vanilla CSS, functional styling only.
- LocalStorage for persistence.

## Rules & Completion

- The 9 cells must each hold a number; the goal state is the values being exactly the set {1..9} (each once).
- Because no row/column constraints apply, **completion = all 9 cells filled AND all values distinct**. (Distinct + full over 9 cells with values 1–9 is equivalent to "each of 1–9 once.")
- Pre-filled cells always contain correct, non-conflicting numbers. The player only needs to fill the 3 missing numbers into the 3 empty cells.

## States & Flow

- **`idle`** — empty board, no numbers shown, with a **Start** button. Hiding numbers until Start prevents solving on paper before committing.
- **`playing`** — on Start, the puzzle generates and the timer starts simultaneously. Player fills cells.
- **`complete`** — on completion the timer stops; the UI shows **points earned** and **time taken**. A **Reset Boards** button returns to `idle`.

## Input

- **Keyboard:** click a cell to select it; press `1`–`9` to place a number; `Backspace`/`Delete` to clear the selected cell.
- **Click-to-place:** a 1–9 number palette below the board; with a cell selected, click a number to fill it. A clear control empties the selected cell.

## Code Structure

Small, isolated, independently testable units.

- `src/lib/game/board.ts` — pure logic, no UI/Svelte dependency:
  - `generatePuzzle()` → a board with a valid 1–9 arrangement, exactly 3 cells marked empty, the rest pre-filled.
  - `isComplete(board)` → boolean.
- `src/lib/game/config.ts` — all tunable numbers in one place: empty-cell count (`3`), flat points per solve (`10`). Easy to tweak during playtesting.
- `src/lib/game/state.svelte.ts` — game store using runes. State: `pointokus`, `board`, `status`, `elapsed`, `lastResult`. Actions: `start()`, `place(cellIndex, value)`, `clear(cellIndex)`, `reset()`.
- `src/lib/components/` — `Board.svelte`, `Cell.svelte`, `NumberPad.svelte`, `Timer.svelte`, `Header.svelte` (Pointokus total). `App.svelte` wires them together.

### Data model

- `Cell`: `{ value: number | null, prefilled: boolean }`
- `Board`: `Cell[]` (length 9)
- Game state: `pointokus: number`, `board: Board | null` (null while idle), `status: 'idle' | 'playing' | 'complete'`, `elapsed: number` (ms), `lastResult: { points: number, timeMs: number } | null`

### Timer

Drives `elapsed` while `status === 'playing'`, stopping on completion. Displayed as a running clock (e.g. `mm:ss.cs`) so the player can feel and chase speed.

## Persistence

Autosave the **Pointokus total** to LocalStorage on change; load on startup. The in-progress board is **not** persisted — a mid-solve refresh returns to `idle`. Keeps persistence trivial and matches the no-pre-solving spirit.

## Testing

TDD on the pure logic in `board.ts`:
- `generatePuzzle()` produces exactly 3 empty cells and a valid 1–9 solution (the full set is present once across solution values).
- `isComplete()` accepts a correctly filled board and rejects incomplete or duplicate-containing boards.

The UI layer is thin enough to validate by playing.

## Starter Tuning Values

In `config.ts`, trivially changeable: **3** empty cells, **10** Pointokus flat per solve.

## Open Questions / Future Slices

- Next slice: speed-bonus unlock + tiered bracket + exponential scoring (answers the GDD's MVP question).
- Then: global multiplier upgrade, difficulty tiers, Unlocks tab.
- Scoring brackets, multiplier values, and difficulty-tier progression remain TBD by designer.
