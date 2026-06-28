import { generatePuzzle, isComplete, type Board } from './board';
import { FLAT_POINTS } from './config';
import { loadPointokus, savePointokus } from './storage';

type Status = 'idle' | 'playing' | 'complete';

function createGame() {
  let pointokus = $state(loadPointokus());
  let board = $state<Board | null>(null);
  let status = $state<Status>('idle');
  let selected = $state<number | null>(null);
  let elapsed = $state(0);
  let lastResult = $state<{ points: number; timeMs: number } | null>(null);

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
    pointokus += FLAT_POINTS;
    savePointokus(pointokus);
    lastResult = { points: FLAT_POINTS, timeMs };
    status = 'complete';
  }

  function reset() {
    stopTimer();
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
    start,
    select,
    place,
    clear,
    reset,
  };
}

export const game = createGame();
