import { describe, it, expect } from 'vitest';
import { checkGameEnd } from './election';
import { createInitialState } from '../state';
import { DEFAULT_CONTENT } from '../../data/defaults/scenarios';
import type { GameState } from '../types';

function makeState(overrides: Partial<GameState> = {}): GameState {
  const base = createInitialState(DEFAULT_CONTENT, 4);
  return { ...base, ...overrides };
}

describe('checkGameEnd', () => {
  it('setzt gameOver und won wenn Monat > 48 und Zustimmung >= Schwelle', () => {
    const state = makeState({
      month: 49,
      zust: { g: 45, arbeit: 50, mitte: 50, prog: 50 },
      electionThreshold: 40,
    });
    const result = checkGameEnd(state);
    expect(result.gameOver).toBe(true);
    expect(result.won).toBe(true);
    expect(result.speed).toBe(0);
  });

  it('setzt gameOver und won=false wenn Zustimmung < Schwelle', () => {
    const state = makeState({
      month: 49,
      zust: { g: 30, arbeit: 50, mitte: 50, prog: 50 },
      electionThreshold: 40,
    });
    const result = checkGameEnd(state);
    expect(result.gameOver).toBe(true);
    expect(result.won).toBe(false);
  });

  it('nutzt Default-Schwelle 40% wenn nicht gesetzt', () => {
    const state = makeState({
      month: 49,
      zust: { g: 39, arbeit: 50, mitte: 50, prog: 50 },
    });
    const result = checkGameEnd(state);
    expect(result.gameOver).toBe(true);
    expect(result.won).toBe(false);
  });

  it('setzt gameOver bei Koalition < 15', () => {
    const state = makeState({
      month: 10,
      coalition: 10,
    });
    const result = checkGameEnd(state);
    expect(result.gameOver).toBe(true);
    expect(result.won).toBe(false);
  });

  it('lässt Spiel weiterlaufen bei normalen Werten', () => {
    const state = makeState({
      month: 20,
      coalition: 60,
      zust: { g: 50, arbeit: 50, mitte: 50, prog: 50 },
    });
    const result = checkGameEnd(state);
    expect(result.gameOver).toBe(false);
  });

  it('Koalition genau 15 lässt Spiel weiterlaufen', () => {
    const state = makeState({
      month: 20,
      coalition: 15,
    });
    const result = checkGameEnd(state);
    expect(result.gameOver).toBe(false);
  });
});
