// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
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
  loadRecord,
  saveRecord,
} from './storage';

describe('pointokus persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns 0 when nothing is saved', () => {
    expect(loadPointokus()).toBe(0);
  });

  it('round-trips a saved value', () => {
    savePointokus(42);
    expect(loadPointokus()).toBe(42);
  });

  it('returns 0 when the stored value is not a number', () => {
    localStorage.setItem('sudoku-incremental:pointokus', 'not-a-number');
    expect(loadPointokus()).toBe(0);
  });
});

describe('unlocks persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns [] when nothing is saved', () => {
    expect(loadUnlocks()).toEqual([]);
  });

  it('round-trips a saved value', () => {
    saveUnlocks(['speed-bonus']);
    expect(loadUnlocks()).toEqual(['speed-bonus']);
  });

  it('returns [] when the stored value is malformed', () => {
    localStorage.setItem('sudoku-incremental:unlocks', 'not-json');
    expect(loadUnlocks()).toEqual([]);
  });

  it('returns [] when the stored value is valid JSON but not an array', () => {
    localStorage.setItem('sudoku-incremental:unlocks', '{"a":1}');
    expect(loadUnlocks()).toEqual([]);
  });
});

describe('tier persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults owned tiers to ['easy'] when nothing is saved", () => {
    expect(loadOwnedTiers('default')).toEqual(['easy']);
  });

  it('round-trips owned tiers, keyed per board', () => {
    saveOwnedTiers('default', ['easy', 'medium']);
    expect(loadOwnedTiers('default')).toEqual(['easy', 'medium']);
    expect(loadOwnedTiers('other')).toEqual(['easy']); // isolated per board
  });

  it("always includes 'easy' even if a saved list omits it", () => {
    saveOwnedTiers('default', ['medium']);
    expect(loadOwnedTiers('default')).toEqual(['easy', 'medium']);
  });

  it("defaults owned tiers to ['easy'] when the stored value is malformed", () => {
    localStorage.setItem('sudoku-incremental:tiers:default', 'not-json');
    expect(loadOwnedTiers('default')).toEqual(['easy']);
  });

  it("defaults the selected tier to 'easy' when nothing is saved", () => {
    expect(loadSelectedTier('default')).toBe('easy');
  });

  it('round-trips the selected tier, keyed per board', () => {
    saveSelectedTier('default', 'medium');
    expect(loadSelectedTier('default')).toBe('medium');
    expect(loadSelectedTier('other')).toBe('easy');
  });
});

describe('active board persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns 'default' when nothing is saved", () => {
    expect(loadActiveBoard()).toBe('default');
  });

  it('round-trips a saved value', () => {
    saveActiveBoard('board6x3');
    expect(loadActiveBoard()).toBe('board6x3');
  });
});

describe('owned boards persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns [] when nothing is saved', () => {
    expect(loadOwnedBoards()).toEqual([]);
  });

  it('round-trips a saved value', () => {
    saveOwnedBoards(['board6x3']);
    expect(loadOwnedBoards()).toEqual(['board6x3']);
  });

  it('returns [] when the stored value is malformed', () => {
    localStorage.setItem('sudoku-incremental:owned-boards', 'not-json');
    expect(loadOwnedBoards()).toEqual([]);
  });

  it('returns [] when the stored value is valid JSON but not an array', () => {
    localStorage.setItem('sudoku-incremental:owned-boards', '{"a":1}');
    expect(loadOwnedBoards()).toEqual([]);
  });
});

describe('record (best time) persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when nothing is saved', () => {
    expect(loadRecord('default')).toBe(null);
  });

  it('round-trips a saved value, keyed per board', () => {
    saveRecord('default', 2500);
    expect(loadRecord('default')).toBe(2500);
    expect(loadRecord('board6x3')).toBe(null); // isolated per board
  });

  it('returns null when the stored value is not a number', () => {
    localStorage.setItem('sudoku-incremental:record:default', 'not-a-number');
    expect(loadRecord('default')).toBe(null);
  });
});
