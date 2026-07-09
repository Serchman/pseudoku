import { generatePuzzle, isComplete, findConflicts, firstEmptyIndex, nextEmptyIndex, type Board } from './board';
import { BOARDS, BOARD_ORDER, GLOBAL_MULTIPLIER } from './config';
import { computeScore, boardWorth, difficultyFactor } from './scoring';
import { UNLOCKS, getNextUnlock, canBuy } from './unlocks';
import { getTierById, canBuyTier } from './tiers';
import {
  loadPointokus,
  savePointokus,
  loadUnlocks,
  saveUnlocks,
  loadOwnedTiers,
  saveOwnedTiers,
  loadSelectedTier,
  saveSelectedTier,
  loadActiveBoard,
  saveActiveBoard,
  loadOwnedBoards,
  saveOwnedBoards,
} from './storage';

type Status = 'idle' | 'playing' | 'complete';
type ViewId = 'board' | 'unlocks' | 'settings';
type LastResult = { points: number; timeMs: number; bracketMult: number; speedApplied: boolean };
// Per-board play state, preserved across board switches (in-memory, cleared on resetAll).
type PlayState = {
  board: Board | null;
  status: Status;
  selected: number | null;
  elapsed: number;
  lastResult: LastResult | null;
  startTime: number;
  lastEntered: number | null;
};

export function createGame() {
  let pointokus = $state(loadPointokus());
  let pendingPoints = $state(0);
  let board = $state<Board | null>(null);
  let status = $state<Status>('idle');
  let selected = $state<number | null>(null);
  let lastEntered = $state<number | null>(null);
  let elapsed = $state(0);
  let lastResult = $state<LastResult | null>(null);
  let activeView = $state<ViewId>('board');
  let owned = $state<Set<string>>(new Set(loadUnlocks()));

  const initialActiveBoardId = loadActiveBoard();
  let activeBoardId = $state<string>(initialActiveBoardId);

  const freeBoards = Object.values(BOARDS)
    .filter((b) => b.cost === 0)
    .map((b) => b.id);
  let ownedBoards = $state<Set<string>>(new Set([...freeBoards, ...loadOwnedBoards()]));

  let ownedTiers = $state<Set<string>>(new Set(loadOwnedTiers(initialActiveBoardId)));
  let selectedTierId = $state<string>(loadSelectedTier(initialActiveBoardId));

  let startTime = 0;
  let timer: ReturnType<typeof setInterval> | null = null;

  // Snapshot of each non-active board's play state, so switching boards keeps
  // (rather than wipes) a board you started or solved. Only resetAll clears it.
  let boardStates: Record<string, PlayState> = {};

  function activeBoard() {
    return BOARDS[activeBoardId];
  }

  function selectedTier() {
    return getTierById(activeBoard().tiers, selectedTierId) ?? activeBoard().tiers[0];
  }

  function scoreOpts() {
    const b = activeBoard();
    const totalCells = b.cols * b.rows;
    return {
      speedBonusOwned: owned.has('speed-bonus'),
      globalMultiplier: GLOBAL_MULTIPLIER,
      boardWorth: boardWorth(b),
      difficultyFactor: difficultyFactor(selectedTier().emptyCells, totalCells),
    };
  }

  // Memoized whole-board conflict set: recomputes once when the board or status
  // changes, then feeds both the conflict highlight and place()'s advance guard.
  const conflicts = $derived(
    board && status === 'playing' ? findConflicts(board, activeBoard()) : new Set<number>(),
  );

  function stopTimer() {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  }

  function start() {
    board = generatePuzzle(activeBoard(), selectedTier().emptyCells);
    selected = firstEmptyIndex(board);
    lastEntered = null;
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
    lastEntered = selected;
    checkWin();
    if (status !== 'playing') return; // board just solved — nothing to advance to
    if (!conflicts.has(selected)) {
      const next = nextEmptyIndex(board, selected);
      if (next !== null) selected = next;
    }
  }

  function clear() {
    if (status !== 'playing' || board === null || selected === null) return;
    if (board[selected].prefilled) return;
    board[selected] = { value: null, prefilled: false };
    lastEntered = null;
  }

  function checkWin() {
    if (board === null || !isComplete(board, activeBoard())) return;
    stopTimer();
    const timeMs = performance.now() - startTime;
    elapsed = timeMs;
    const result = computeScore(timeMs, activeBoard().brackets, scoreOpts());
    pendingPoints += result.points;
    lastResult = {
      points: result.points,
      timeMs,
      bracketMult: result.bracketMult,
      speedApplied: result.speedApplied,
    };
    status = 'complete';
  }

  function setView(v: ViewId) {
    activeView = v;
  }

  function buyUnlock(id: string) {
    if (!canBuy(id, pointokus, owned)) return;
    const u = UNLOCKS.find((x) => x.id === id)!;
    pointokus -= u.cost;
    owned = new Set([...owned, id]); // reassign so the $state Set triggers reactivity
    savePointokus(pointokus);
    saveUnlocks([...owned]);
  }

  function buyTier(id: string) {
    if (!canBuyTier(id, pointokus, ownedTiers, activeBoard().tiers)) return;
    const t = getTierById(activeBoard().tiers, id)!;
    pointokus -= t.cost;
    ownedTiers = new Set([...ownedTiers, id]); // reassign so the $state Set triggers reactivity
    savePointokus(pointokus);
    saveOwnedTiers(activeBoard().id, [...ownedTiers]);
  }

  function selectTier(id: string) {
    if (status === 'playing') return;   // can't switch difficulty mid-solve
    if (!ownedTiers.has(id)) return;    // only owned tiers are selectable
    selectedTierId = id;
    saveSelectedTier(activeBoard().id, id);
  }

  function selectBoard(id: string) {
    if (status === 'playing' || !ownedBoards.has(id) || id === activeBoardId) return;
    // Preserve the outgoing board's play state, then restore the incoming
    // board's (or a fresh idle state if it was never played).
    boardStates[activeBoardId] = {
      board,
      status,
      selected,
      elapsed,
      lastResult,
      startTime,
      lastEntered,
    };
    activeBoardId = id;
    ownedTiers = new Set(loadOwnedTiers(id));
    selectedTierId = loadSelectedTier(id);
    const saved = boardStates[id];
    board = saved?.board ?? null;
    status = saved?.status ?? 'idle';
    selected = saved?.selected ?? null;
    elapsed = saved?.elapsed ?? 0;
    lastResult = saved?.lastResult ?? null;
    startTime = saved?.startTime ?? 0;
    lastEntered = saved?.lastEntered ?? null;
    saveActiveBoard(id);
  }

  function buyBoard(id: string) {
    if (ownedBoards.has(id) || pointokus < BOARDS[id].cost) return;
    pointokus -= BOARDS[id].cost;
    ownedBoards = new Set([...ownedBoards, id]); // reassign so the $state Set triggers reactivity
    savePointokus(pointokus);
    saveOwnedBoards([...ownedBoards]);
    selectBoard(id);
  }

  function resetAll() {
    stopTimer();
    pointokus += pendingPoints;
    savePointokus(pointokus);
    pendingPoints = 0;
    boardStates = {}; // wipe every board's preserved state
    board = null;
    selected = null;
    lastEntered = null;
    status = 'idle';
    elapsed = 0;
    lastResult = null;
  }

  return {
    get pointokus() {
      return pointokus;
    },
    get pendingPoints() {
      return pendingPoints;
    },
    get prestigeBreakdown(): { id: string; name: string; points: number }[] {
      return BOARD_ORDER.flatMap((id) => {
        const isActive = id === activeBoardId;
        const st = isActive ? status : boardStates[id]?.status;
        const res = isActive ? lastResult : boardStates[id]?.lastResult;
        if (st !== 'complete' || !res) return [];
        return [{ id, name: BOARDS[id].name, points: res.points }];
      });
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
    get conflicts(): Set<number> {
      return conflicts;
    },
    get lastEntered() {
      return lastEntered;
    },
    get elapsed() {
      return elapsed;
    },
    get projectedPoints() {
      return computeScore(elapsed, activeBoard().brackets, scoreOpts()).points;
    },
    get lastResult() {
      return lastResult;
    },
    get editableCount() {
      if (board === null) return 0;
      return board.filter((cell) => !cell.prefilled).length;
    },
    get filledCount() {
      if (board === null) return 0;
      return board.filter((cell) => !cell.prefilled && cell.value != null).length;
    },
    get activeView() {
      return activeView;
    },
    get ownedCount() {
      return owned.size;
    },
    get nextUnlock() {
      return getNextUnlock(owned);
    },
    get speedBonusOwned() {
      return owned.has('speed-bonus');
    },
    isOwned(id: string) {
      return owned.has(id);
    },
    get selectedTier() {
      return selectedTier();
    },
    get tiers() {
      const totalCells = activeBoard().cols * activeBoard().rows;
      return activeBoard().tiers.map((t) => ({
        ...t,
        mult: difficultyFactor(t.emptyCells, totalCells),
        owned: ownedTiers.has(t.id),
        selected: t.id === selectedTierId,
        buyable: canBuyTier(t.id, pointokus, ownedTiers, activeBoard().tiers),
      }));
    },
    get activeBoard() {
      return activeBoard();
    },
    get boards() {
      return BOARD_ORDER.map((id) => {
        const b = BOARDS[id];
        // Active board's status is live; other boards' status lives in their snapshot.
        const boardStatus = id === activeBoardId ? status : boardStates[id]?.status;
        return {
          id,
          name: b.name,
          cost: b.cost,
          owned: ownedBoards.has(id),
          active: id === activeBoardId,
          done: boardStatus === 'complete',
          buyable: !ownedBoards.has(id) && pointokus >= b.cost,
        };
      });
    },
    start,
    select,
    place,
    clear,
    resetAll,
    setView,
    buyUnlock,
    buyTier,
    selectTier,
    selectBoard,
    buyBoard,
  };
}

export const game = createGame();
