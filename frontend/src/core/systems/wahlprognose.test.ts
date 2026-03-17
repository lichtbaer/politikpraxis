import { describe, it, expect } from 'vitest';
import { berechneWahlprognose } from './wahlprognose';
import type { GameState, ContentBundle } from '../types';

function createMockState(overrides: Partial<GameState> = {}): GameState {
  return {
    month: 1,
    speed: 0,
    pk: 100,
    view: 'agenda',
    kpi: { al: 5, hh: 0, gi: 50, zf: 50 },
    kpiPrev: null,
    zust: { g: 52, arbeit: 58, mitte: 54, prog: 44 },
    coalition: 70,
    chars: [],
    gesetze: [],
    bundesrat: [],
    bundesratFraktionen: [],
    activeEvent: null,
    firedEvents: [],
    firedCharEvents: [],
    firedBundesratEvents: [],
    pending: [],
    log: [],
    ticker: '',
    gameOver: false,
    won: false,
    ...overrides,
  } as GameState;
}

const milieus = [
  { id: 'postmaterielle', ideologie: { wirtschaft: -40, gesellschaft: -80, staat: -30 }, min_complexity: 1, gewicht: 14, basisbeteiligung: 70 },
  { id: 'buergerliche_mitte', ideologie: { wirtschaft: 20, gesellschaft: 0, staat: 10 }, min_complexity: 1, gewicht: 20, basisbeteiligung: 80 },
];

const content: ContentBundle = {
  characters: [],
  events: [],
  charEvents: {},
  bundesratEvents: [],
  laws: [],
  bundesrat: [],
  bundesratFraktionen: [],
  milieus,
  politikfelder: [],
  verbaende: [],
  scenario: { id: 's1', name: 'Test', startMonth: 1, startPK: 100, startKPI: { al: 5, hh: 0, gi: 50, zf: 50 }, startCoalition: 70 },
};

describe('berechneWahlprognose', () => {
  it('gibt zust.g zurück bei complexity 1 (Stufe 1: alte Formel)', () => {
    const state = createMockState({ zust: { g: 55, arbeit: 50, mitte: 52, prog: 48 } });
    const result = berechneWahlprognose(state, content, 1);
    expect(result).toBe(55);
  });

  it('gewichtete Milieu-Formel bei Stufe 2+', () => {
    const state = createMockState({
      zust: { g: 50, arbeit: 50, mitte: 50, prog: 50 },
      milieuZustimmung: { postmaterielle: 60, buergerliche_mitte: 40 },
    });
    const result = berechneWahlprognose(state, content, 2);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(100);
    expect(Number.isInteger(result)).toBe(true);
  });

  it('gewichtete Formel: höhere Milieu-Zustimmung → höhere Prognose', () => {
    const stateLow = createMockState({
      milieuZustimmung: { postmaterielle: 30, buergerliche_mitte: 30 },
    });
    const stateHigh = createMockState({
      milieuZustimmung: { postmaterielle: 80, buergerliche_mitte: 80 },
    });
    const resultLow = berechneWahlprognose(stateLow, content, 2);
    const resultHigh = berechneWahlprognose(stateHigh, content, 2);
    expect(resultHigh).toBeGreaterThan(resultLow);
  });

  it('verwendet zust-Fallback wenn milieuZustimmung fehlt', () => {
    const state = createMockState({
      zust: { g: 50, arbeit: 58, mitte: 54, prog: 44 },
      milieuZustimmung: {},
    });
    const result = berechneWahlprognose(state, content, 2);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(100);
  });

  it('gibt zust.g zurück bei leerem Milieus-Array', () => {
    const state = createMockState({ zust: { g: 52, arbeit: 58, mitte: 54, prog: 44 } });
    const emptyContent = { ...content, milieus: [] };
    const result = berechneWahlprognose(state, emptyContent, 2);
    expect(result).toBe(52);
  });

  it('filtert Milieus nach min_complexity', () => {
    const milieusStufe3 = [
      { id: 'postmaterielle', ideologie: { wirtschaft: -40, gesellschaft: -80, staat: -30 }, min_complexity: 3, gewicht: 14, basisbeteiligung: 70 },
    ];
    const state = createMockState({ milieuZustimmung: { postmaterielle: 60 } });
    const contentStufe3 = { ...content, milieus: milieusStufe3 };
    const result = berechneWahlprognose(state, contentStufe3, 2);
    expect(result).toBe(52); // Kein sichtbares Milieu → zust.g
  });
});
