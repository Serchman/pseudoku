import type { Bracket } from './config';

export const METER_HORIZON_FACTOR = 1.5;

export interface MeterSegment {
  mult: number;
  startSec: number;
  endSec: number; // last (open/Infinity) bracket clamped to horizon
  startPct: number; // 0..100 along the bar
  endPct: number;
  centerPct: number; // for label positioning ((startPct + endPct) / 2)
}

export interface MeterState {
  segments: MeterSegment[]; // fast→slow == left→right (same order as brackets)
  horizonSec: number;
  currentMult: number;
  activeIndex: number;
  positionPct: number; // indicator position, clamped 0..100
  nextDropSec: number | null; // time until next lower bracket; null in last bracket
  nextMult: number | null; // multiplier after the next drop; null in last bracket
}

export function computeMeter(elapsedSec: number, brackets: Bracket[]): MeterState {
  const maxFiniteSec = Math.max(...brackets.filter((b) => Number.isFinite(b.maxSec)).map((b) => b.maxSec));
  const horizonSec = maxFiniteSec * METER_HORIZON_FACTOR;

  const segments: MeterSegment[] = [];
  let prevMaxSec = 0;
  for (const bracket of brackets) {
    const startSec = prevMaxSec;
    const endSec = Math.min(bracket.maxSec, horizonSec);
    const startPct = (startSec / horizonSec) * 100;
    const endPct = (endSec / horizonSec) * 100;
    segments.push({
      mult: bracket.mult,
      startSec,
      endSec,
      startPct,
      endPct,
      centerPct: (startPct + endPct) / 2,
    });
    prevMaxSec = bracket.maxSec;
  }

  let activeIndex = brackets.length - 1;
  for (let i = 0; i < brackets.length; i++) {
    if (elapsedSec <= brackets[i].maxSec) {
      activeIndex = i;
      break;
    }
  }
  const activeBracket = brackets[activeIndex];
  const currentMult = activeBracket.mult;

  const positionPct = Math.min(1, Math.max(0, elapsedSec / horizonSec)) * 100;

  let nextDropSec: number | null = null;
  let nextMult: number | null = null;
  if (Number.isFinite(activeBracket.maxSec)) {
    nextDropSec = activeBracket.maxSec - elapsedSec;
    nextMult = brackets[activeIndex + 1].mult;
  }

  return { segments, horizonSec, currentMult, activeIndex, positionPct, nextDropSec, nextMult };
}

export function formatClock(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function formatCountdown(sec: number): string {
  const totalSec = Math.floor(sec);
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
