import { gateCost } from './formula'
export { POINT_SCALE, SIZE_EXP, DIFF_EXP, REF_CELLS, REF_DENSITY, REF_SPEED_MULT } from './formula'

export const BOARD_SIZE = 9
export const EMPTY_CELLS = 3

export const EXP_BASE = 1.5         // intra-bracket exponential base (tunable, shared default)
export const GLOBAL_MULTIPLIER = 1  // reserved for future unlocks; not upgradeable in this scope

export interface Bracket {
  maxSec: number // upper time bound (seconds) of this bracket; last entry uses Infinity
  mult: number   // bracket multiplier
}

export interface DifficultyTier {
  id: string
  label: string
  emptyCells: number // blank cells the player must fill
  cost: number       // pointokus to unlock (0 = free starter tier)
}

export interface BoardConfig {
  id: string
  name: string                           // short display name (e.g. '3×3', '6×3')
  caption: string                        // board-area rule text shown above the grid
  cols: number                           // cell grid width
  rows: number                           // cell grid height
  blockCols: number                      // single block width
  blockRows: number                      // single block height
  symbols: number                        // distinct symbols (9 for both boards)
  constraints: { rows: boolean; cols: boolean } // enforce row/col uniqueness across full grid
  cost: number                           // pointokus to unlock (0 = free / always owned)
  brackets: Bracket[]
  tiers: DifficultyTier[]                // ordered; tiers[0] is the free starter, bought sequentially
}

export interface ProgressionEntry {
  gate: string       // gate id: 'speed-bonus' | boardId | 'boardId:tierId'
  n: number          // solves-per-gate (escalation lever)
  anchor: string     // tier id the cost is measured in: 'boardId:tierId'
  withSpeed: boolean // fold REF_SPEED_MULT (true for gates bought after Speed Bonus)
  requires: string[] // prerequisites — documentation only; gating stays sequential for now
}

// Canonical unlock progression and single source of truth for every derived cost.
// Order defines escalation; `anchor`/`requires` are explicit so cost and (future)
// availability do not depend on list position. See the unlock-cost-rebalance design doc.
export const PROGRESSION: ProgressionEntry[] = [
  { gate: 'speed-bonus', n: 3, anchor: 'default:easy', withSpeed: false, requires: [] },
  { gate: 'default:medium', n: 5, anchor: 'default:easy', withSpeed: true, requires: ['default:easy'] },
  { gate: 'board6x3', n: 8, anchor: 'default:medium', withSpeed: true, requires: ['default:medium'] },
  { gate: 'default:hard', n: 13, anchor: 'board6x3:easy', withSpeed: true, requires: ['default:medium'] },
  { gate: 'board6x3:medium', n: 18, anchor: 'default:hard', withSpeed: true, requires: ['board6x3:easy'] },
  { gate: 'board6x3:hard', n: 20, anchor: 'board6x3:medium', withSpeed: true, requires: ['board6x3:medium'] },
  { gate: 'records', n: 13, anchor: 'board6x3:hard', withSpeed: true, requires: ['board6x3:hard'] },
]

// Board dimensions and per-tier blank-cell counts — the geometry the cost derivation
// reads. BOARDS below is built from these so nothing drifts.
const BOARD_DIMS: Record<string, { cols: number; rows: number }> = {
  default: { cols: 3, rows: 3 },
  board6x3: { cols: 6, rows: 3 },
}

const TIER_BLANKS: Record<string, DifficultyTier[]> = {
  default: [
    { id: 'easy', label: 'Easy', emptyCells: 3, cost: 0 },
    { id: 'medium', label: 'Medium', emptyCells: 5, cost: 0 },
    { id: 'hard', label: 'Hard', emptyCells: 7, cost: 0 },
  ],
  board6x3: [
    { id: 'easy', label: 'Easy', emptyCells: 6, cost: 0 },
    { id: 'medium', label: 'Medium', emptyCells: 10, cost: 0 },
    { id: 'hard', label: 'Hard', emptyCells: 14, cost: 0 },
  ],
}

function anchorDims(anchorId: string): { cols: number; rows: number; emptyCells: number } {
  const [boardId, tierId] = anchorId.split(':')
  const { cols, rows } = BOARD_DIMS[boardId]
  const emptyCells = TIER_BLANKS[boardId].find((t) => t.id === tierId)!.emptyCells
  return { cols, rows, emptyCells }
}

// gate id -> derived cost (single source of truth: PROGRESSION + the formula helpers).
export const GATE_COSTS: Record<string, number> = Object.fromEntries(
  PROGRESSION.map((p) => {
    const a = anchorDims(p.anchor)
    return [p.gate, gateCost(p.n, a.cols, a.rows, a.emptyCells, p.withSpeed)]
  }),
)

// Build a board's tiers with derived costs (the free starter tier stays 0).
function tiersFor(boardId: string): DifficultyTier[] {
  return TIER_BLANKS[boardId].map((t) => ({
    ...t,
    cost: t.id === 'easy' ? 0 : GATE_COSTS[`${boardId}:${t.id}`],
  }))
}

// Shaped as "one entry per board type" so more boards slot in later.
export const BOARDS: Record<string, BoardConfig> = {
  default: {
    id: 'default',
    name: '3×3',
    caption: 'FILL EVERY CELL · 1–9, NO REPEATS',
    ...BOARD_DIMS.default,
    blockCols: 3,
    blockRows: 3,
    symbols: 9,
    constraints: { rows: false, cols: false },
    cost: 0,
    brackets: [
      { maxSec: 2, mult: 8 },
      { maxSec: 3, mult: 5 },
      { maxSec: 4, mult: 3 },
      { maxSec: 6, mult: 2 },
      { maxSec: Infinity, mult: 1 },
    ],
    tiers: tiersFor('default'),
  },
  board6x3: {
    id: 'board6x3',
    name: '6×3',
    caption: '1–9 PER BLOCK · NO ROW REPEATS',
    ...BOARD_DIMS.board6x3,
    blockCols: 3,
    blockRows: 3,
    symbols: 9,
    constraints: { rows: true, cols: false },
    cost: GATE_COSTS['board6x3'],
    brackets: [
      { maxSec: 12, mult: 8 },
      { maxSec: 18, mult: 5 },
      { maxSec: 25, mult: 3 },
      { maxSec: 35, mult: 2 },
      { maxSec: Infinity, mult: 1 },
    ],
    tiers: tiersFor('board6x3'),
  },
}

export const BOARD_ORDER: string[] = ['default', 'board6x3']
