import { describe, it, expect } from 'vitest';
import { tickMedienKlima } from './medienEvents';
import type { GameState, Law } from '../../types';

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
    framing_optionen: [],
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
    milieuZustimmung: { postmaterielle: 50, soziale_mitte: 50 },
    verbandsBeziehungen: { uvb: 50 },
    medienKlima: 55,
    ...overrides,
  } as GameState;
}

describe('tickMedienKlima Drift', () => {
  const minimalContent = {
    characters: [],
    events: [],
    charEvents: {},
    laws: [],
    bundesrat: [],
    medienEvents: [] as import('../../types').MedienEventContent[],
    scenario: { id: 's', name: 's', startMonth: 1, startPK: 100, startKPI: { al: 5, hh: 0, gi: 50, zf: 50 }, startCoalition: 70 },
  } as import('../../types').ContentBundle;

  /** Stufe 1: globale Drift (ohne plural Akteure) */
  it('Drift Richtung 50: medienKlima > 50 sinkt um 1', () => {
    const state = createMockState({ medienKlima: 60, complexity: 1 });
    const result = tickMedienKlima(state, minimalContent, 1);
    expect(result.medienKlima).toBe(59);
  });

  it('Drift Richtung 50: medienKlima < 50 steigt um 1', () => {
    const state = createMockState({ medienKlima: 40, complexity: 1 });
    const result = tickMedienKlima(state, minimalContent, 1);
    expect(result.medienKlima).toBe(41);
  });

  it('Drift bei 50: bleibt 50', () => {
    const state = createMockState({ medienKlima: 50, complexity: 1 });
    const result = tickMedienKlima(state, minimalContent, 1);
    expect(result.medienKlima).toBe(50);
  });
});
