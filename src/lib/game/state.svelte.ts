import { generatePuzzle, isComplete, type Board } from './board';
import { ACTIVE_BOARD, GLOBAL_MULTIPLIER } from './config';
import { computeScore } from './scoring';
import { UNLOCKS, getNextUnlock, canBuy } from './unlocks';
import { loadPointokus, savePointokus, loadUnlocks, saveUnlocks } from './storage';

type Status = 'idle' | 'playing' | 'complete';
type ViewId = 'board' | 'unlocks' | 'settings';

function createGame() {
  let pointokus = $state(loadPointokus());
  let pendingPoints = $state(0);
  let board = $state<Board | null>(null);
  let status = $state<Status>('idle');
  let selected = $state<number | null>(null);
  let elapsed = $state(0);
  let lastResult = $state<{ points: number; timeMs: number; bracketMult: number; speedApplied: boolean } | null>(
    null,
  );
  let activeView = $state<ViewId>('board');
  let owned = $state<Set<string>>(new Set(loadUnlocks()));

  let startTime = 0;
  let timer: ReturnType<typeof setInterval> | null = null;

  function stopTimer() {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  }

  function start() {
    board = generatePuzzle();
    selected = null;
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
    checkWin();
  }

  function clear() {
    if (status !== 'playing' || board === null || selected === null) return;
    if (board[selected].prefilled) return;
    board[selected] = { value: null, prefilled: false };
  }

  function checkWin() {
    if (board === null || !isComplete(board)) return;
    stopTimer();
    const timeMs = performance.now() - startTime;
    elapsed = timeMs;
    const result = computeScore(timeMs, ACTIVE_BOARD.brackets, {
      speedBonusOwned: owned.has('speed-bonus'),
      globalMultiplier: GLOBAL_MULTIPLIER,
    });
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

  function resetAll() {
    stopTimer();
    pointokus += pendingPoints;
    savePointokus(pointokus);
    pendingPoints = 0;
    board = null;
    selected = null;
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
    get board() {
      return board;
    },
    get status() {
      return status;
    },
    get selected() {
      return selected;
    },
    get elapsed() {
      return elapsed;
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
    start,
    select,
    place,
    clear,
    resetAll,
    setView,
    buyUnlock,
  };
}

export const game = createGame();
