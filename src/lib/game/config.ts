export const BOARD_SIZE = 9;
export const EMPTY_CELLS = 3;
export const FLAT_POINTS = 10;

export const EXP_BASE = 1.5;         // intra-bracket exponential base (tunable, shared default)
export const GLOBAL_MULTIPLIER = 1;  // reserved for future unlocks; not upgradeable in this scope

export interface Bracket {
  maxSec: number; // upper time bound (seconds) of this bracket; last entry uses Infinity
  mult: number;   // bracket multiplier
}

export interface BoardConfig {
  id: string;
  brackets: Bracket[];
}

// Shaped as "one entry per board type" so more boards slot in later.
// Phase 1 has a single 3×3 board.
export const BOARDS: Record<string, BoardConfig> = {
  default: {
    id: 'default',
    brackets: [
      { maxSec: 5, mult: 8 },
      { maxSec: 10, mult: 5 },
      { maxSec: 20, mult: 3 },
      { maxSec: 40, mult: 2 },
      { maxSec: Infinity, mult: 1 },
    ],
  },
};

export const ACTIVE_BOARD: BoardConfig = BOARDS.default;
