import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  bewerteEURoute,
  resolveEURoute,
  tickEUKlima,
  checkEUEreignisse,
  getRatsvorsitzModifikator,
  initEUKlima,
} from './eu';
import type { GameState, Law, ContentBundle, Verband } from '../types';

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
    politikfeldId: 'umwelt_energie',
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
    eu: {
      klima: { umwelt_energie: 70, wirtschaft_finanzen: 50 },
      klimaSperre: {},
      ratsvorsitz: false,
      ratsvorsitzStartMonat: 0,
      ratsvorsitzPrioritaeten: [],
      umsetzungsfristen: [],
      foerdermittelBeantragt: [],
      aktiveRoute: null,
    },
    ...overrides,
  } as GameState;
}

const verbaende: Verband[] = [
  { id: 'uvb', kurz: 'UVB', politikfeld_id: 'umwelt_energie', beziehung_start: 50, staerke_eu: 4, tradeoffs: [] },
];

describe('bewerteEURoute', () => {
  it('PK-Kosten mit EU-Klima-Modifikator: höheres Klima → höhere Erfolgschance', () => {
    const stateLow = createMockState({ eu: { ...createMockState().eu!, klima: { umwelt_energie: 30 } } });
    const stateHigh = createMockState({ eu: { ...createMockState().eu!, klima: { umwelt_energie: 90 } } });
    const resultLow = bewerteEURoute(stateLow, 'ee', verbaende, 3);
    const resultHigh = bewerteEURoute(stateHigh, 'ee', verbaende, 3);
    expect(resultHigh.erfolgschance).toBeGreaterThan(resultLow.erfolgschance);
  });

  it('gibt Default-Werte wenn Gesetz nicht gefunden', () => {
    const state = createMockState();
    const result = bewerteEURoute(state, 'unknown', verbaende, 3);
    expect(result.pkKosten).toBe(28);
    expect(result.dauer).toBe(8);
    expect(result.erfolgschance).toBe(0.5);
  });

  it('Erfolgschance steigt mit Klima (0.4 + klima/100 * 0.35)', () => {
    const state = createMockState({ eu: { ...createMockState().eu!, klima: { umwelt_energie: 100 } } });
    const result = bewerteEURoute(state, 'ee', verbaende, 3);
    expect(result.erfolgschance).toBeCloseTo(0.75, 2);
  });
});

describe('resolveEURoute', () => {
  afterEach(() => vi.restoreAllMocks());

  it('Kofinanzierung korrekt angewendet bei Erfolg', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1); // Erfolg

    const state = createMockState({
      eu: {
        klima: { umwelt_energie: 70 },
        klimaSperre: {},
        ratsvorsitz: false,
        ratsvorsitzStartMonat: 0,
        ratsvorsitzPrioritaeten: [],
        umsetzungsfristen: [],
        foerdermittelBeantragt: [],
        aktiveRoute: {
          gesetzId: 'ee',
          phase: 2,
          startMonat: 1,
          dauer: 8,
          erfolgschance: 0.8,
          verwässert: false,
        },
      },
      gesetze: [{
        id: 'ee',
        titel: 'EE',
        kurz: 'EE',
        desc: '',
        tags: ['bund'],
        status: 'ausweich',
        ja: 60,
        nein: 40,
        effekte: { gi: 2 },
        lag: 2,
        expanded: false,
        route: 'eu',
        rprog: 8,
        rdur: 8,
        blockiert: null,
        politikfeldId: 'umwelt_energie',
      }],
    });

    const result = resolveEURoute(state);
    expect(result.eu?.aktiveRoute).toBeNull();
    expect(result.gesetze.find(g => g.id === 'ee')?.status).toBe('beschlossen');
    expect(result.log.some(l => l.msg.includes('Kofinanzierung'))).toBe(true);
  });
});

describe('tickEUKlima', () => {
  it('Verbands-Rückkopplung bei Stärke >= 4 und Beziehung > 70', () => {
    const state = createMockState({
      verbandsBeziehungen: { uvb: 75 },
      eu: { ...createMockState().eu!, klima: { umwelt_energie: 50 } },
    });
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const result = tickEUKlima(state, verbaende, 3);
    expect(result.eu?.klima?.umwelt_energie).toBeDefined();
    vi.restoreAllMocks();
  });

  it('ändert nichts bei complexity < 3', () => {
    const state = createMockState();
    const result = tickEUKlima(state, verbaende, 2);
    expect(result).toBe(state);
  });
});

describe('checkEUEreignisse', () => {
  it('läuft durch bei eu_reaktiv (complexity 3+)', () => {
    const state = createMockState({ month: 5 });
    const content: ContentBundle = {
      characters: [],
      events: [],
      charEvents: {},
      bundesratEvents: [],
      laws: [],
      bundesrat: [],
      bundesratFraktionen: [],
      milieus: [],
      politikfelder: [],
      verbaende: [],
      scenario: { id: 's1', name: 'Test', startMonth: 1, startPK: 100, startKPI: { al: 5, hh: 0, gi: 50, zf: 50 }, startCoalition: 70 },
    };
    const result = checkEUEreignisse(state, content, 3);
    expect(result.eu).toBeDefined();
  });

  it('ändert nichts bei complexity < 3', () => {
    const state = createMockState();
    const content: ContentBundle = {
      characters: [],
      events: [],
      charEvents: {},
      bundesratEvents: [],
      laws: [],
      bundesrat: [],
      bundesratFraktionen: [],
      milieus: [],
      politikfelder: [],
      verbaende: [],
      scenario: { id: 's1', name: 'Test', startMonth: 1, startPK: 100, startKPI: { al: 5, hh: 0, gi: 50, zf: 50 }, startCoalition: 70 },
    };
    const result = checkEUEreignisse(state, content, 2);
    expect(result).toBe(state);
  });
});

describe('getRatsvorsitzModifikator', () => {
  it('gibt PK-Rabatt und Dauer-Bonus bei Ratsvorsitz', () => {
    const state = createMockState({
      eu: { ...createMockState().eu!, ratsvorsitz: true },
    });
    const result = getRatsvorsitzModifikator(state, 4);
    expect(result.pkRabatt).toBe(0.3);
    expect(result.dauerBonus).toBe(-2);
  });

  it('gibt 0 bei complexity < 4', () => {
    const state = createMockState({
      eu: { ...createMockState().eu!, ratsvorsitz: true },
    });
    const result = getRatsvorsitzModifikator(state, 3);
    expect(result.pkRabatt).toBe(0);
    expect(result.dauerBonus).toBe(0);
  });
});

describe('initEUKlima', () => {
  it('initialisiert Klima aus Content oder Defaults', () => {
    const state = createMockState({ eu: undefined });
    const content: ContentBundle = {
      characters: [],
      events: [],
      charEvents: {},
      bundesratEvents: [],
      laws: [],
      bundesrat: [],
      bundesratFraktionen: [],
      milieus: [],
      politikfelder: [{ id: 'umwelt_energie', verbandId: null }, { id: 'wirtschaft_finanzen', verbandId: null }],
      verbaende: [],
      scenario: { id: 's1', name: 'Test', startMonth: 1, startPK: 100, startKPI: { al: 5, hh: 0, gi: 50, zf: 50 }, startCoalition: 70 },
    };
    const result = initEUKlima(state, content, 3);
    expect(result.eu?.klima).toBeDefined();
    expect(Object.keys(result.eu!.klima).length).toBeGreaterThan(0);
  });
});
