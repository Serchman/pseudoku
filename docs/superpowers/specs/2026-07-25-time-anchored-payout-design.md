# Time-Anchored Payout Design

**Date:** 2026-07-25
**Status:** Approved (design); implementation pending
**Prereq reading:** `docs/superpowers/specs/2026-07-09-unlock-cost-rebalance-design.md` (gate-cost derivation), balance-simulator plan doc.

## Problem

The balance simulator's rate table shows 3×3 Hard as the best points/min in the game
for every skill profile (engaged: 917/min vs 620/min for 6×3 Hard). Root cause: base
payout is pure geometry — `POINT_SCALE × cells^SIZE_EXP × density^DIFF_EXP` — while the
cost to earn it is *time*. 3×3 Hard and 6×3 Hard have identical blank density (7/9 =
14/18), so the 6×3 pays only `2^1.3 ≈ 2.46×` more per solve but takes ~6× longer.
Payout scales ~`cells^1.3`; real solve time scales ~`cells^2.6`. Bigger boards lose on
rate, worst for fast players. (Logged in memory as "3×3 Hard grind dominance".)

## Goal

**Strict rate ladder** for every skill profile: every 6×3 tier out-earns every 3×3
tier, and within each board harder tiers out-earn easier ones (also fixes the current
6×3 Easy > Medium inversion). Verified by the simulator's rate table.

## Decision

Anchor the base payout to the tier's **reference solve time** — pay proportionally to
the time a solve takes, so `boardWorth × difficultyFactor` becomes a pure profit-rate
escalator. Bigger/harder is then more profitable *by construction*, for every profile,
and recalibrating solve times moves payouts with them (self-healing).

Rejected alternatives:
- **Crank SIZE_EXP** (~2.8 needed to satisfy the speedy profile): huge point inflation,
  and the exponent silently hand-offsets an empirical solve-time table it doesn't know
  about — any solve-time recalibration reopens the gap.
- **Retune 3×3 brackets harsher + moderate SIZE_EXP:** makes real 3×3 play feel
  punishing for fast players; two hand-tuned knobs that must stay in sync.

## Design

### 1. Data: reference solve time becomes tier config

Each tier in `config.ts` (`TIER_BLANKS`) gains `refSolveSec` — the skilled-play
reference solve time:

| board | easy | medium | hard |
|---|---|---|---|
| 3×3 (`default`) | 1.5 | 2 | 2 |
| 6×3 (`board6x3`) | 7 | 10 | 12 |

These are the values currently living in `BASE_SOLVE_SEC` in `simulate.ts`; that table
is deleted and the sim reads tier config instead. Game and simulator share one source
of truth. `solveTimeMs` drops its now-unused `boardId` parameter.

### 2. Formula: a third factor in the base payout

`formula.ts` gains a reference anchor alongside `REF_CELLS` / `REF_DENSITY`:

```ts
export const REF_SOLVE_SEC = 1.5; // reference solve time (3×3 Easy): timeFactor = 1 here
```

and a factor `timeFactor = refSolveSec / REF_SOLVE_SEC`. The base payout becomes:

```
base = POINT_SCALE × timeFactor × boardWorth × difficultyFactor
```

- `computeScore` opts gain `timeFactor: number` (same pattern as `boardWorth`).
- `SIZE_EXP` / `DIFF_EXP` are untouched.
- 3×3 Easy still pays base 10 — early-game feel identical.
- Callers (`state.svelte.ts` `scoreOpts()`, `simulate.ts` `solvePoints`) pass the
  selected tier's factor.

### 3. Gate costs

`gateCost` folds in the anchor tier's `timeFactor` the same way (new `anchorRefSolveSec`
parameter; `anchorDims` in `config.ts` also returns it). Every cost stays "N solves'
worth of its anchor tier." Resulting costs (same `n` values):

| gate | before | after |
|---|---|---|
| speed-bonus | 30 | 30 |
| default:medium | 125 | 125 |
| board6x3 | 430 | 575 |
| default:hard | 800 | ~3735 |
| board6x3:medium | 1605 | ~2140 |
| board6x3:hard | 2650 | ~17,660 |
| records | 2850 | ~22,815 |

Solve counts per section stay in the designed range; mid/late wall-clock pacing
stretches somewhat (engaged board6x3:hard section ~3 min → ~5 min). The `n` column in
`PROGRESSION` remains the pacing lever; the balance report is reviewed with the user
before pinning new bands.

### 4. Expected rates (engaged profile, pts/min)

| tier | before | after |
|---|---|---|
| 3×3 Easy | 500 | 500 |
| 3×3 Medium | 557 | ~738 |
| 3×3 Hard | 917 | ~1221 |
| 6×3 Easy | 568 | ~2656 |
| 6×3 Medium | 553 | ~3695 |
| 6×3 Hard | 620 | ~4960 |

Strict ladder verified by hand for speedy, engaged, casual, and mobile; the simulator
is the authority during implementation.

### 5. UI touch-up

The tier picker's `mult` badge (`state.svelte.ts` `get tiers`, currently
`difficultyFactor` only) becomes `timeFactor × difficultyFactor` — the tier's payout
multiple relative to the global 3×3-Easy reference (so 6×3 Easy shows ~4.7×, not 1×).

### 6. Tests

- `scoring.test.ts`: `ref` fixture gains `timeFactor: 1`; existing assertions hold.
- `formula.test.ts`: `gateCost` calls updated for the new parameter and expected costs.
- `simulate.test.ts`: solve-model tests unchanged in spirit (3×3 Easy numbers
  identical); `bestTier` comment/values updated; **new test asserting the strict rate
  ladder for every profile** (the point of this change).
- Pacing bands (`EXPECTED_ENGAGED_CUMULATIVE_SEC`): re-pinned only after the user
  approves the new `npm run balance` report.
- `simulate.crosscheck.test.ts`: must keep passing — both sides go through
  `computeScore`, so the cross-check adapts if `timeFactor` is threaded consistently.

Done when: `npm run check`, `npm test`, `npm run build` all pass, and the rate table
shows the strict ladder for all four profiles.
