import { describe, it, expect } from 'vitest';
import { applyKongruenzEffekte, getEinbringenPkKosten } from './kongruenz';
import type { GameState, Law, Character } from '../types';

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
    ...overrides,
  } as GameState;
}

describe('applyKongruenzEffekte', () => {
  it('PK-Modifikator -3 bei Score >= 80 (complexity 3+, keine Halbierung)', () => {
    const state = createMockState();
    const ausrichtung = { wirtschaft: -30, gesellschaft: -60, staat: -20 };
    const result = applyKongruenzEffekte(state, 'ee', ausrichtung, 3);
    expect(result.pkModifikator).toBe(-3);
    expect(result.score).toBe(100);
  });

  it('PK-Modifikator 0 bei Score >= 40 und < 80', () => {
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
        ideologie: { wirtschaft: 50, gesellschaft: 0, staat: 20 },
      }],
    });
    const ausrichtung = { wirtschaft: -30, gesellschaft: -60, staat: -20 };
    const result = applyKongruenzEffekte(state, 'ee', ausrichtung, 3);
    expect(result.pkModifikator).toBe(0);
    expect(result.score).toBeGreaterThanOrEqual(40);
    expect(result.score).toBeLessThan(80);
  });

  it('PK-Modifikator +8 bei Score >= 20 und < 40', () => {
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
        ideologie: { wirtschaft: 90, gesellschaft: 90, staat: 90 },
      }],
    });
    const ausrichtung = { wirtschaft: -30, gesellschaft: -60, staat: -20 };
    const result = applyKongruenzEffekte(state, 'ee', ausrichtung, 3);
    expect(result.pkModifikator).toBe(8);
  });

  it('PK-Modifikator +12 bei Score < 20', () => {
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
        ideologie: { wirtschaft: 100, gesellschaft: 100, staat: 100 },
      }],
    });
    const ausrichtung = { wirtschaft: -100, gesellschaft: -100, staat: -100 };
    const result = applyKongruenzEffekte(state, 'ee', ausrichtung, 3);
    expect(result.pkModifikator).toBe(12);
  });

  it('Stufe 2 (complexity 2) halbiert PK-Modifikator', () => {
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
        ideologie: { wirtschaft: 100, gesellschaft: 100, staat: 100 },
      }],
    });
    const ausrichtung = { wirtschaft: -100, gesellschaft: -100, staat: -100 };
    const result = applyKongruenzEffekte(state, 'ee', ausrichtung, 2);
    expect(result.pkModifikator).toBe(6); // 12 * 0.5
  });

  it('Char-Effekte bei Score < 20 und gegensätzlichem Char-Profil (complexity 3+)', () => {
    const char: Character = {
      id: 'fm',
      name: 'Lehmann',
      role: 'Finanzminister',
      initials: 'L',
      color: '#000',
      mood: 3,
      loyalty: 4,
      bio: '',
      interests: [],
      bonus: { trigger: '', desc: '', applies: '' },
      ultimatum: { moodThresh: 0, event: '' },
      ideologie: { wirtschaft: -100, gesellschaft: -100, staat: -100 },
    };
    const state = createMockState({
      chars: [char],
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
    const ausrichtung = { wirtschaft: -100, gesellschaft: -100, staat: -100 };
    const result = applyKongruenzEffekte(state, 'ee', ausrichtung, 3);
    expect(result.charEffekte['fm']).toBe(-1);
  });

  it('keine Kongruenz-Effekte bei complexity 1 (Feature inaktiv)', () => {
    const state = createMockState();
    const ausrichtung = { wirtschaft: 100, gesellschaft: 100, staat: 100 };
    const result = applyKongruenzEffekte(state, 'ee', ausrichtung, 1);
    expect(result.pkModifikator).toBe(0);
    expect(result.charEffekte).toEqual({});
  });
});

describe('getEinbringenPkKosten', () => {
  it('Basis 20 + Modifikator, mindestens 5', () => {
    expect(getEinbringenPkKosten(0)).toBe(20);
    expect(getEinbringenPkKosten(-3)).toBe(17);
    expect(getEinbringenPkKosten(12)).toBe(32);
    expect(getEinbringenPkKosten(-20)).toBe(5); // Floor
  });
});
