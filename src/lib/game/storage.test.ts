// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { loadPointokus, savePointokus, loadUnlocks, saveUnlocks } from './storage';

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
});
