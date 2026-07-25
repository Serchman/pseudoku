# Balance Simulator — Pacing via Per-Section Strategy Tournament

**Date:** 2026-07-25
**Status:** Design approved, pending implementation plan

## Problem

Every new feature or constant retune (scoring exponents, brackets, `N` values,
`REF_SPEED_MULT`) can silently shift game pacing, and today the only way to notice is
manually playing through the progression. The economy is already formula-derived and
pure (`computeScore`, `speedFactor`, `recordTerm`, `GATE_COSTS`, `PROGRESSION`), so
pacing can be computed instead of playtested.

## Goal

A deterministic pacing simulator that:

1. Reports wall-clock time-to-each-gate for several player skill profiles and play
   strategies (`npm run balance`).
2. Fails `npm test` when a change pushes the best-play pacing curve outside approved
   bands — including when a change opens a degenerate *fast* lane, not just a stall.
3. Surfaces rate traps: tiers/boards whose points/min is worse than cheaper options.

Non-goals: auto-tuning constants, UI changes, randomness, modeling hints or any
mechanic that does not affect points/time.

## Player model

```ts
interface SkillProfile {
  id: 'casual' | 'engaged' | 'speedy' | 'mobile'
  secPerBlank: number   // seconds of solve time per blank cell
  overheadSec: number   // between-solve overhead (start click, menus, banking)
}
```

- Solve time for a board/tier is `secPerBlank × emptyCells`. This is the time fed to
  `computeScore` (the in-game clock only runs during a puzzle). `overheadSec` is added
  to wall-clock per solve but never to the scored time.
- Deterministic — no randomness, so runs are reproducible and test bands stay tight.
- Starting values (calibrated during implementation; the engaged profile's typical
  speed multiplier should land near `REF_SPEED_MULT = 2.5` as a consistency check):
  `speedy` 1 s/blank, `engaged` 2 s/blank, `casual` 4 s/blank, `mobile` 5 s/blank with
  higher overhead.
- No `bestFactor`/record-hunting parameter. Records emerge from simulated play exactly
  as in the real game (`checkWin` updates records on every solve), and the Records
  unlock is the ladder's final gate, so the record multiplier cannot affect ladder
  pacing. See Future extensions.

## Strategies

A strategy decides **which board(s) to grind**; the tier within a board is always the
owned tier with the best points/sec under the profile (evaluated with the real
`computeScore` — no "harder = better" assumption):

- `optimalRate` — grind the owned (board, tier) pair with the best points/sec.
- `singleBoard` — grind only the starter board.
- `allBoards` — cycle through all owned boards, one solve each.
- `naive` — always the highest owned board at its highest owned tier (models a player
  trusting the progression; the gap between `naive` and the section winner measures
  how badly a misleading unlock punishes them). Exception to rate-picked tiers.

All strategies bank (`pointokus += round(pending × recordMultiplier)`, the `resetAll`
prestige) as soon as banking would afford the next gate, then buy it. Purchases follow
`PROGRESSION` order (matches the game's sequential gating); strategies only choose
what to grind, never what to buy.

## Per-section strategy tournament

Sections are the intervals between consecutive `PROGRESSION` gates.

1. For each section, run **every** strategy from the same start state; measure
   wall-clock and solves until the gate is bought.
2. Section winner = fastest (ties: first in the strategy list). The winner's end state
   — leftover points, records, owned set — seeds the next section for all strategies.
3. The **pacing curve** = cumulative wall-clock of chained winners. This models a
   player who plays well at every phase without hardcoding the meta, so balance
   targets don't depend on guessing how players will optimize.

Strategy is fixed within a section (sections are short: N ≈ 3–30 solves). Records
carry forward from the winner's path only — no free record terms from losing
strategies.

Every strategy has positive income, so every section terminates; a structural test
asserts this.

## Module layout

- `src/lib/game/simulate.ts` — pure: profiles, strategies, `simulateSection(state,
  gate, strategy, profile)`, `runLadder(profile)` returning per-section results plus
  the chained curve. Reuses `computeScore`, `speedFactor`, `recordTerm`,
  `globalRecordMultiplier`, `GATE_COSTS`, `PROGRESSION`, `BOARDS`; the only new logic
  is the grind/bank/buy policy.
- `src/lib/game/simulate.test.ts` — bands + structural checks (node env, no jsdom).
- `src/lib/game/simulate.crosscheck.test.ts` — jsdom; drives the real `createGame()`
  through a few solves and a bank with `performance.now` mocked to fixed solve times
  (reusing the `solveDefault` helper pattern from `state.test.ts`), and asserts the
  simulator's accounting predicts the identical `pointokus`. This is the drift alarm
  if `state.svelte.ts` banking/prestige logic changes without the sim being updated.
- `scripts/balance-report.ts` — the report; `npm run balance` runs it via `vite-node`
  (ships with vitest, no new dependency).

## Report (`npm run balance`)

Three tables, all profiles:

1. **Pacing matrix** — cumulative wall-clock and solves to each gate (chained-winner
   curve per profile).
2. **Strategy map** — section × strategy wall-clock with winners marked; shows
   crossover points (e.g. where `singleBoard` stops winning) and the `naive` gap.
3. **Rate table** — points/min per board × tier × profile; makes rate traps visible
   (e.g. whether 6×3 Hard under-earns 6×3 Easy for slower profiles).

## Tests (the automatic part)

- **Baseline bands:** an `EXPECTED` table (same pattern as `progression.test.ts`)
  pinning the engaged-profile chained curve — cumulative wall-clock per gate —
  asserted within ±25%. The first implementation run generates the numbers; they are
  presented for approval before being pinned. Retuning later means consciously
  updating the table.
- **Structural:** simulation terminates, every gate is reached, cumulative wall-clock
  strictly increases along the ladder.
- **Cross-check:** as above; sim accounting must match the real game exactly.
- Rate-trap assertions (e.g. "every purchasable tier improves its board's best rate")
  stay **report-only** for now — first-run numbers may legitimately fail them, and
  whether that is a bug or intended is a design decision to make after seeing the
  data.

## Future extensions (documented, not built)

- **Record hunt strategy:** once post-Records content exists, add "spend K attempts on
  each board's Easy at `bestFactor` × typical, then grind" as a tournament candidate.
  Whether hunting first is worth it becomes a tournament *output*, not an assumption.
  `bestFactor` joins the profile at that point.
- **Strategy-dominance assertions:** "completing all boards before reset should beat
  single-board grinding" becomes assertable only when a mechanic (e.g. the
  boards-completed-per-reset multiplier from the unlock-cost spec's retune triggers)
  can make it true. Until then the strategy map just quantifies the gap.
- New boards/tiers/gates need no simulator changes — it derives everything from
  `PROGRESSION` and `BOARDS`.

## Verification

`npm run check`, `npm test`, `npm run build` all pass (per CLAUDE.md), plus a manual
`npm run balance` run whose output is sanity-checked before the bands are pinned.
