import type { DifficultyTier } from './config'
import { BOARDS, BOARD_ORDER, GATE_COSTS, GLOBAL_MULTIPLIER, PROGRESSION } from './config'
import {
  computeScore,
  boardWorth,
  difficultyFactor,
  timeFactor,
  recordTerm,
  globalRecordMultiplier,
} from './scoring'

export interface SkillProfile {
  id: string
  skillMult: number // multiplies the reference solve time (1 = skilled/fast play)
  overheadSec: number // between-solve overhead (start click, menus, banking)
}

// Deterministic player archetypes. skillMult scales each tier's reference solve time;
// engaged (2×) is anchored to observed play (6×3 Easy: ~7 s skilled, ~14 s typical).
// mobile solves at engaged speed (touch-drag input is close to keyboard) but carries
// more per-solve overhead.
export const PROFILES: SkillProfile[] = [
  { id: 'speedy', skillMult: 1, overheadSec: 2 },
  { id: 'engaged', skillMult: 2, overheadSec: 3 },
  { id: 'casual', skillMult: 3, overheadSec: 5 },
  { id: 'mobile', skillMult: 2, overheadSec: 5 },
]

export function solveTimeMs(profile: SkillProfile, tier: DifficultyTier): number {
  return tier.refSolveSec * profile.skillMult * 1000
}

// Payout of one solve, via the real scoring pipeline (no duplicated math).
export function solvePoints(
  profile: SkillProfile,
  boardId: string,
  tier: DifficultyTier,
  speedBonusOwned: boolean,
): number {
  const b = BOARDS[boardId]
  return computeScore(solveTimeMs(profile, tier), b.brackets, {
    speedBonusOwned,
    globalMultiplier: GLOBAL_MULTIPLIER,
    boardWorth: boardWorth(b),
    difficultyFactor: difficultyFactor(tier.emptyCells, b.cols * b.rows),
    timeFactor: timeFactor(tier.refSolveSec),
  }).points
}

// Points per second of wall-clock (solve + overhead) — the grind metric.
export function pointsPerSec(
  profile: SkillProfile,
  boardId: string,
  tier: DifficultyTier,
  speedBonusOwned: boolean,
): number {
  return (
    solvePoints(profile, boardId, tier, speedBonusOwned) /
    (solveTimeMs(profile, tier) / 1000 + profile.overheadSec)
  )
}

export type StrategyId = 'optimalRate' | 'singleBoard' | 'allBoards' | 'naive'
// Order matters: it is the tournament's tie-break order (first wins ties).
export const STRATEGIES: StrategyId[] = ['optimalRate', 'singleBoard', 'allBoards', 'naive']

// Boards the player owns: free boards plus bought board gates.
export function ownedBoards(owned: ReadonlySet<string>): string[] {
  return BOARD_ORDER.filter((id) => BOARDS[id].cost === 0 || owned.has(id))
}

// Tiers of a board the player owns: the free starter plus bought `board:tier` gates.
export function ownedTiers(boardId: string, owned: ReadonlySet<string>): DifficultyTier[] {
  return BOARDS[boardId].tiers.filter((t) => t.cost === 0 || owned.has(`${boardId}:${t.id}`))
}

// Owned tier of a board with the best points/sec (ties keep the earlier tier).
export function bestTier(
  profile: SkillProfile,
  boardId: string,
  owned: ReadonlySet<string>,
): DifficultyTier {
  const speed = owned.has('speed-bonus')
  return ownedTiers(boardId, owned).reduce((best, t) =>
    pointsPerSec(profile, boardId, t, speed) > pointsPerSec(profile, boardId, best, speed)
      ? t
      : best,
  )
}

// One round of (board, tier) picks. Strategies choose boards; the tier within a
// board is always rate-picked — except `naive`, which models trusting the
// progression (highest board, highest owned tier).
export function strategyPicks(
  strategy: StrategyId,
  profile: SkillProfile,
  owned: ReadonlySet<string>,
): { boardId: string; tier: DifficultyTier }[] {
  const boards = ownedBoards(owned)
  switch (strategy) {
    case 'singleBoard':
      return [{ boardId: boards[0], tier: bestTier(profile, boards[0], owned) }]
    case 'allBoards':
      return boards.map((boardId) => ({ boardId, tier: bestTier(profile, boardId, owned) }))
    case 'naive': {
      const boardId = boards[boards.length - 1]
      const tiers = ownedTiers(boardId, owned)
      return [{ boardId, tier: tiers[tiers.length - 1] }]
    }
    case 'optimalRate': {
      const speed = owned.has('speed-bonus')
      const picks = boards.map((boardId) => ({ boardId, tier: bestTier(profile, boardId, owned) }))
      return [
        picks.reduce((best, p) =>
          pointsPerSec(profile, p.boardId, p.tier, speed) >
          pointsPerSec(profile, best.boardId, best.tier, speed)
            ? p
            : best,
        ),
      ]
    }
  }
}

export interface SimState {
  pointokus: number // banked, spendable
  pending: number // earned since last bank (resetAll)
  owned: Set<string> // bought gate ids (PROGRESSION granularity)
  records: Record<string, number> // boardId -> best solve ms
}

export function initialState(): SimState {
  return { pointokus: 0, pending: 0, owned: new Set(), records: {} }
}

function cloneState(s: SimState): SimState {
  return {
    pointokus: s.pointokus,
    pending: s.pending,
    owned: new Set(s.owned),
    records: { ...s.records },
  }
}

// Mirrors state.svelte.ts's recordMultiplier $derived.
function currentRecordMultiplier(state: SimState): number {
  const terms = ownedBoards(state.owned).map((id) =>
    recordTerm(state.records[id] ?? null, BOARDS[id]),
  )
  return globalRecordMultiplier(terms, state.owned.has('records'))
}

export interface SectionResult {
  wallClockSec: number
  solves: number
  endState: SimState
}

// Grind with `strategy` from `start` until `gate` is bought. Mirrors the real game:
// solves accrue pending; banking (resetAll) converts pending × record
// multiplier into pointokus; bank-and-buy happens the moment the gate is affordable.
export function simulateSection(
  start: SimState,
  gate: string,
  strategy: StrategyId,
  profile: SkillProfile,
): SectionResult {
  const state = cloneState(start)
  const cost = GATE_COSTS[gate]
  let wallClockSec = 0
  let solves = 0

  const banked = () => state.pointokus + Math.round(state.pending * currentRecordMultiplier(state))

  grind: while (banked() < cost) {
    for (const { boardId, tier } of strategyPicks(strategy, profile, state.owned)) {
      const timeMs = solveTimeMs(profile, tier)
      state.pending += solvePoints(profile, boardId, tier, state.owned.has('speed-bonus'))
      const prev = state.records[boardId]
      if (prev === undefined || timeMs < prev) state.records[boardId] = timeMs
      wallClockSec += timeMs / 1000 + profile.overheadSec
      solves++
      // Guard: a balance bug that zeroes income must fail tests, not hang them.
      if (solves > 100_000) throw new Error(`section '${gate}' (${strategy}) did not converge`)
      if (banked() >= cost) break grind
    }
  }

  state.pointokus = banked() - cost
  state.pending = 0
  state.owned.add(gate)

  return { wallClockSec, solves, endState: state }
}

export interface LadderSection {
  gate: string
  cost: number
  results: Record<StrategyId, { wallClockSec: number; solves: number }>
  winner: StrategyId
  cumulativeSec: number
}

// Per-section tournament: every strategy runs each section from the same start
// state; the fastest wins (ties: STRATEGIES order) and its end state seeds the
// next section. The chained winners are the pacing curve the tests pin.
export function runLadder(profile: SkillProfile): LadderSection[] {
  let state = initialState()
  let cumulativeSec = 0
  return PROGRESSION.map((p) => {
    const results = {} as LadderSection['results']
    let winner = STRATEGIES[0]
    let winnerResult: SectionResult | undefined
    for (const strategy of STRATEGIES) {
      const r = simulateSection(state, p.gate, strategy, profile)
      results[strategy] = { wallClockSec: r.wallClockSec, solves: r.solves }
      if (winnerResult === undefined || r.wallClockSec < winnerResult.wallClockSec) {
        winner = strategy
        winnerResult = r
      }
    }
    state = winnerResult!.endState
    cumulativeSec += winnerResult!.wallClockSec
    return { gate: p.gate, cost: GATE_COSTS[p.gate], results, winner, cumulativeSec }
  })
}

export interface RateRow {
  boardId: string
  tierId: string
  pointsPerMin: number
}

// Points/min for every board × tier (speed bonus assumed owned — true for all
// but the first gate). Surfaces rate traps regardless of ownership.
export function rateTable(profile: SkillProfile): RateRow[] {
  return BOARD_ORDER.flatMap((boardId) =>
    BOARDS[boardId].tiers.map((tier) => ({
      boardId,
      tierId: tier.id,
      pointsPerMin: pointsPerSec(profile, boardId, tier, true) * 60,
    })),
  )
}
