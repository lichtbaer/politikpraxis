import { describe, it, expect } from 'vitest';
import { applyMilieuEffekte } from './milieus';
import type { GameState, Law } from '../types';

function createMockState(overrides: Partial<GameState> = {}): GameState {
  const gesetz: Law = {
    id: 'ee',
    titel: 'Energiewende',
    kurz: 'EE',
    desc: '',
    tags: ['bund'],
    status: 'entwurf',
    ja: 60,
    nein: 40,
    effekte: {},
    lag: 2,
    expanded: false,
    route: null,
    rprog: 0,
    rdur: 0,
    blockiert: null,
    ideologie: { wirtschaft: -30, gesellschaft: -60, staat: -20 },
  };

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
    gesetze: [gesetz],
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
    milieuZustimmung: {},
    ...overrides,
  } as GameState;
}

const milieus = [
  { id: 'postmaterielle', ideologie: { wirtschaft: -40, gesellschaft: -80, staat: -30 }, min_complexity: 1 },
  { id: 'buergerliche_mitte', ideologie: { wirtschaft: 20, gesellschaft: 0, staat: 10 }, min_complexity: 1 },
];

describe('applyMilieuEffekte', () => {
  it('korrekte Deltas je Kongruenz-Score: Score >= 85 → +4', () => {
    const state = createMockState({
      gesetze: [{
        id: 'ee',
        titel: 'EE',
        kurz: 'EE',
        desc: '',
        tags: ['bund'],
        status: 'entwurf',
        ja: 60,
        nein: 40,
        effekte: {},
        lag: 2,
        expanded: false,
        route: null,
        rprog: 0,
        rdur: 0,
        blockiert: null,
        ideologie: { wirtschaft: -40, gesellschaft: -80, staat: -30 },
      }],
    });
    const result = applyMilieuEffekte(state, 'ee', milieus, 2);
    expect(result.milieuZustimmung?.['postmaterielle']).toBe(54); // 50 + 4 (Score 100 >= 85)
  });

  it('korrekte Deltas: Score >= 70 → +2', () => {
    const state = createMockState({
      milieuZustimmung: { buergerliche_mitte: 50 },
      gesetze: [{
        id: 'ee',
        titel: 'EE',
        kurz: 'EE',
        desc: '',
        tags: ['bund'],
        status: 'entwurf',
        ja: 60,
        nein: 40,
        effekte: {},
        lag: 2,
        expanded: false,
        route: null,
        rprog: 0,
        rdur: 0,
        blockiert: null,
        ideologie: { wirtschaft: 70, gesellschaft: 70, staat: 70 },
      }],
    });
    const result = applyMilieuEffekte(state, 'ee', milieus, 2);
    expect(result.milieuZustimmung?.['buergerliche_mitte']).toBe(52); // 50 + 2 (Score ~70)
  });

  it('korrekte Deltas: Score >= 35 → -1', () => {
    const state = createMockState({
      milieuZustimmung: { postmaterielle: 50 },
      gesetze: [{
        id: 'ee',
        titel: 'EE',
        kurz: 'EE',
        desc: '',
        tags: ['bund'],
        status: 'entwurf',
        ja: 60,
        nein: 40,
        effekte: {},
        lag: 2,
        expanded: false,
        route: null,
        rprog: 0,
        rdur: 0,
        blockiert: null,
        ideologie: { wirtschaft: 70, gesellschaft: 70, staat: 70 },
      }],
    });
    const result = applyMilieuEffekte(state, 'ee', milieus, 2);
    expect(result.milieuZustimmung?.['postmaterielle']).toBe(49); // 50 - 1 (Score ~39)
  });

  it('korrekte Deltas: Score >= 20 → -2', () => {
    const state = createMockState({
      milieuZustimmung: { postmaterielle: 50 },
      gesetze: [{
        id: 'ee',
        titel: 'EE',
        kurz: 'EE',
        desc: '',
        tags: ['bund'],
        status: 'entwurf',
        ja: 60,
        nein: 40,
        effekte: {},
        lag: 2,
        expanded: false,
        route: null,
        rprog: 0,
        rdur: 0,
        blockiert: null,
        ideologie: { wirtschaft: 100, gesellschaft: 100, staat: 100 },
      }],
    });
    const result = applyMilieuEffekte(state, 'ee', milieus, 2);
    expect(result.milieuZustimmung?.['postmaterielle']).toBe(48); // 50 - 2 (Score ~24)
  });

  it('ändert nichts bei complexity 1 (milieus_voll erst ab Stufe 2)', () => {
    const state = createMockState();
    const result = applyMilieuEffekte(state, 'ee', milieus, 1);
    expect(result).toBe(state);
  });

  it('ändert nichts bei leerem Milieus-Array', () => {
    const state = createMockState();
    const result = applyMilieuEffekte(state, 'ee', [], 2);
    expect(result).toBe(state);
  });

  it('clamped Zustimmung 0–100', () => {
    const state = createMockState({
      milieuZustimmung: { postmaterielle: 2 },
      gesetze: [{
        id: 'ee',
        titel: 'EE',
        kurz: 'EE',
        desc: '',
        tags: ['bund'],
        status: 'entwurf',
        ja: 60,
        nein: 40,
        effekte: {},
        lag: 2,
        expanded: false,
        route: null,
        rprog: 0,
        rdur: 0,
        blockiert: null,
        ideologie: { wirtschaft: 100, gesellschaft: 100, staat: 100 },
      }],
    });
    const result = applyMilieuEffekte(state, 'ee', milieus, 2);
    expect(result.milieuZustimmung?.['postmaterielle']).toBe(0);
  });
});
