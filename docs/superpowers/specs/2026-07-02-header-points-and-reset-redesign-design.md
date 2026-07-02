# Header Points & Reset Button Redesign — Design

**Date:** 2026-07-02
**Status:** Approved
**Source mockup:** `docs/sudoku-incremental-ui-design-layout-structure/project/Sudoku Incremental - Tabbed Layout.dc.html`

## Goal

Recreate the mockup's centered header: the **POINTS** display and the **Reset All Boards**
prestige button move into the persistent header, centered. Alongside the visual change,
points are no longer banked automatically on solve — they are banked only when the reset
button is pressed.

## Behavioral change

Today, `checkWin()` adds the solve score directly to `pointokus`. This changes:

- Introduce a `pendingPoints` accumulator (state, starts at 0).
- `checkWin()` adds the computed score to `pendingPoints` instead of `pointokus`.
  `lastResult` still freezes as it does today (used by the completion readout).
- The header reset button is a **bank-and-reset** action (`resetAll()`):
  - Adds `pendingPoints` into `pointokus` and persists via `savePointokus`.
  - Sets `pendingPoints = 0`.
  - Wipes the board back to `idle` (same board teardown as the current `reset()`).
  - If `pendingPoints` is 0, it still resets the board but banks nothing.

`pendingPoints` represents "the sum of points from all completed boards" — forward-compatible
with multiple boards (Phase 2). Today there is a single board and no UX to start a second one,
so the sum holds at most one solve's worth at a time.

The scoring formula in `scoring.ts` is **not** changed.

## Layout change (`App.svelte`)

Match the mockup's header:

- **Top-left:** unchanged — status dot, `SUDOKU_INCREMENTAL_` wordmark, `v0.1` version.
- **Centered cluster** (absolutely centered in the header):
  - **POINTS box:** bordered pill, column layout — `POINTS` label (small, tracked mono)
    over the large point value (`game.pointokus`).
  - **Reset button** beside it, styled per mockup:
    - Left: `↺ RESET ALL BOARDS` label + subcaption `Prestige — wipes every board`.
    - Vertical divider.
    - Right: large `+{pendingPoints}` over a small `POINTS` label.
    - Click → `resetAll()`.
- **Board footer:** remove the old per-board `↺ Reset Board` button. Keep the filled counter.
  The header button is now the only reset control.
- The completion block (`+X P`, time, speed badge) stays as-is.

No live "potential-if-solved-now" readout in this change — that UX is deferred to a later task.

## Out of scope / not touched

- `scoring.ts` (formula unchanged)
- Tabs, Board, Cell, NumberPad, Sidebar, UnlocksView, SettingsView
- Multi-board mechanics (Phase 2)

## Success criteria

- Solving a board increases `pendingPoints`, not `pointokus`.
- The header reset button displays `+{pendingPoints} POINTS` and, when pressed, moves that
  amount into `pointokus`, persists it, zeroes `pendingPoints`, and returns the board to idle.
- Pressing reset with `pendingPoints === 0` banks nothing and resets the board.
- POINTS and the reset button render centered in the header, matching the mockup's styling.
- The old board-footer reset button is gone; existing tests still pass.
