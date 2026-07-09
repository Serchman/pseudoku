export const BOARD_SIZE = 9;
export const EMPTY_CELLS = 3;
export const FLAT_POINTS = 10;

export const EXP_BASE = 1.5;         // intra-bracket exponential base (tunable, shared default)
export const GLOBAL_MULTIPLIER = 1;  // reserved for future unlocks; not upgradeable in this scope

export const POINT_SCALE = 10;       // base payout for the reference board+tier (replaces FLAT_POINTS)
export const SIZE_EXP = 1.3;         // board-worth steepness in total cells (tunable)
export const DIFF_EXP = 1.5;         // difficulty steepness in blank density (tunable)
export const REF_CELLS = 9;          // reference board size (3×3): boardWorth = 1 here
export const REF_DENSITY = 1 / 3;    // reference blank density (Easy): difficultyFactor = 1 here

export interface Bracket {
  maxSec: number; // upper time bound (seconds) of this bracket; last entry uses Infinity
  mult: number;   // bracket multiplier
}

export interface DifficultyTier {
  id: string;
  label: string;
  emptyCells: number; // blank cells the player must fill
  mult: number;       // points multiplier applied to the whole payout
  cost: number;       // pointokus to unlock (0 = free starter tier)
}

export interface BoardConfig {
  id: string;
  name: string;                           // short display name (e.g. '3×3', '6×3')
  caption: string;                        // board-area rule text shown above the grid
  cols: number;                           // cell grid width
  rows: number;                           // cell grid height
  blockCols: number;                      // single block width
  blockRows: number;                      // single block height
  symbols: number;                        // distinct symbols (9 for both boards)
  constraints: { rows: boolean; cols: boolean }; // enforce row/col uniqueness across full grid
  cost: number;                           // pointokus to unlock (0 = free / always owned)
  brackets: Bracket[];
  tiers: DifficultyTier[];                // ordered; tiers[0] is the free starter, bought sequentially
}

// Shaped as "one entry per board type" so more boards slot in later.
// Phase 1 has a single 3×3 board.
export const BOARDS: Record<string, BoardConfig> = {
  default: {
    id: 'default',
    name: '3×3',
    caption: 'FILL EVERY CELL · 1–9, NO REPEATS',
    cols: 3,
    rows: 3,
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
    // Difficulty tiers: more empty cells for a bigger multiplier (speed vs. reward tradeoff).
    tiers: [
      { id: 'easy', label: 'Easy', emptyCells: 3, mult: 1.0, cost: 0 },
      { id: 'medium', label: 'Medium', emptyCells: 5, mult: 2.0, cost: 50 },
      { id: 'hard', label: 'Hard', emptyCells: 7, mult: 3.5, cost: 200 },
    ],
  },
  board6x3: {
    id: 'board6x3',
    name: '6×3',
    caption: '1–9 PER BLOCK · NO ROW REPEATS',
    cols: 6,
    rows: 3,
    blockCols: 3,
    blockRows: 3,
    symbols: 9,
    constraints: { rows: true, cols: false },
    cost: 500,
    brackets: [
      { maxSec: 12, mult: 8 },
      { maxSec: 18, mult: 5 },
      { maxSec: 25, mult: 3 },
      { maxSec: 35, mult: 2 },
      { maxSec: Infinity, mult: 1 },
    ],
    tiers: [
      { id: 'easy', label: 'Easy', emptyCells: 6, mult: 1.0, cost: 0 },
      { id: 'medium', label: 'Medium', emptyCells: 10, mult: 2.5, cost: 150 },
      { id: 'hard', label: 'Hard', emptyCells: 14, mult: 4.5, cost: 500 },
    ],
  },
};

export const BOARD_ORDER: string[] = ['default', 'board6x3'];
