export const BOARD_SIZE = 9;
export const EMPTY_CELLS = 3;
export const FLAT_POINTS = 10;

export const EXP_BASE = 1.5;         // intra-bracket exponential base (tunable, shared default)
export const GLOBAL_MULTIPLIER = 1;  // reserved for future unlocks; not upgradeable in this scope

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
  brackets: Bracket[];
  tiers: DifficultyTier[]; // ordered; tiers[0] is the free starter, bought sequentially
}

// Shaped as "one entry per board type" so more boards slot in later.
// Phase 1 has a single 3×3 board.
export const BOARDS: Record<string, BoardConfig> = {
  default: {
    id: 'default',
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
};

export const ACTIVE_BOARD: BoardConfig = BOARDS.default;
