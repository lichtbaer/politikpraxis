import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  berechneEinnahmen,
  berechneSchuldenbremseVerbrauchtMrd,
  checkSchuldenbremse,
  createInitialHaushalt,
  applyGesetzKosten,
  tickKonjunktur,
  checkLehmannSparvorschlag,
} from './haushalt';
import type { GameState, Haushalt, Law } from '../types';

type MockStateOverrides = Omit<Partial<GameState>, 'haushalt'> & { haushalt?: Partial<Haushalt> };

function createMockState(overrides: MockStateOverrides = {}): GameState {
  const { haushalt: haushaltOverrides, ...restOverrides } = overrides;
  const haushalt: Haushalt = {
    einnahmen: 350,
    pflichtausgaben: 370,
    laufendeAusgaben: 0,
    spielraum: 130,
    saldo: 130,
    saldoKumulativ: 0,
    konjunkturIndex: 0,
    steuerpolitikModifikator: 1.0,
    investitionsquote: 0,
    schuldenbremseAktiv: true,
    haushaltsplanMonat: 10,
    haushaltsplanBeschlossen: false,
    planPrioritaeten: [],
    ...(haushaltOverrides ?? {}),
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
    haushalt,
    ...restOverrides,
  } as GameState;
}

describe('haushalt', () => {
  afterEach(() => vi.restoreAllMocks());

describe('berechneEinnahmen', () => {
  it('gibt Basis 350 bei AL=5, Konjunktur=0, Steuerpolitik=1.0', () => {
    const state = createMockState();
    expect(berechneEinnahmen(state)).toBe(350);
  });

  it('reduziert Einnahmen bei höherer Arbeitslosigkeit', () => {
    const state = createMockState({ kpi: { al: 8, hh: 0, gi: 50, zf: 50 } });
    const einnahmen = berechneEinnahmen(state);
    expect(einnahmen).toBeLessThan(350);
    expect(einnahmen).toBeGreaterThan(0);
  });

  it('erhöht Einnahmen bei positivem Konjunkturindex', () => {
    const state = createMockState({
      haushalt: { konjunkturIndex: 2, steuerpolitikModifikator: 1.0 },
    });
    const einnahmen = berechneEinnahmen(state);
    expect(einnahmen).toBeGreaterThan(350);
  });

  it('berücksichtigt steuerpolitikModifikator', () => {
    const state = createMockState({
      haushalt: { steuerpolitikModifikator: 1.1 },
    });
    const einnahmen = berechneEinnahmen(state);
    expect(einnahmen).toBeGreaterThan(350);
  });

  it('gibt Basis zurück wenn kein Haushalt vorhanden', () => {
    const state = createMockState();
    const ohneHaushalt = { ...state, haushalt: undefined };
    expect(berechneEinnahmen(ohneHaushalt)).toBe(350);
  });
});

describe('berechneSchuldenbremseVerbrauchtMrd', () => {
  it('ist 0 bei vollem Spielraum (Start)', () => {
    const state = createMockState({
      haushalt: { saldo: -20, schuldenbremseSpielraum: 13 },
    });
    expect(berechneSchuldenbremseVerbrauchtMrd(state.haushalt!)).toBe(0);
  });

  it('entspricht der Differenz zu 13 Mrd. erlaubt', () => {
    const state = createMockState({
      haushalt: { schuldenbremseSpielraum: 5 },
    });
    expect(berechneSchuldenbremseVerbrauchtMrd(state.haushalt!)).toBe(8);
  });
});

describe('checkSchuldenbremse', () => {
  it('gibt ausgeglichen wenn kein Schuldenbremse-Spielraum verbraucht (SMA-397)', () => {
    const state = createMockState({
      haushalt: { saldo: -20, schuldenbremseSpielraum: 13 },
    });
    expect(checkSchuldenbremse(state, 3)).toBe('ausgeglichen');
  });

  it('gibt grenzwertig bei geringem Verbrauch (1–5 Mrd.)', () => {
    const state = createMockState({
      haushalt: { saldo: -20, schuldenbremseSpielraum: 10 },
    });
    expect(checkSchuldenbremse(state, 3)).toBe('grenzwertig');
  });

  it('gibt verletzt_mild bei mittlerem bis hohem Verbrauch (noch Spielraum)', () => {
    const state = createMockState({
      haushalt: { saldo: -20, schuldenbremseSpielraum: 4 },
    });
    expect(checkSchuldenbremse(state, 3)).toBe('verletzt_mild');
  });

  it('gibt verletzt_stark wenn Schuldenbremse-Spielraum erschöpft', () => {
    const state = createMockState({
      haushalt: { saldo: -20, schuldenbremseSpielraum: 0 },
    });
    expect(checkSchuldenbremse(state, 3)).toBe('verletzt_stark');
  });

  it('gibt inaktiv wenn feature nicht aktiv (complexity 1)', () => {
    const state = createMockState({
      haushalt: { saldo: -20, schuldenbremseSpielraum: 0 },
    });
    expect(checkSchuldenbremse(state, 1)).toBe('inaktiv');
  });
});

describe('createInitialHaushalt', () => {
  it('erstellt Haushalt mit Basiswerten', () => {
    const state = createMockState();
    const base = { ...state, haushalt: undefined };
    const haushalt = createInitialHaushalt(base);
    expect(haushalt.einnahmen).toBe(350);
    expect(haushalt.pflichtausgaben).toBe(370); // SMA-310: PFLICHTAUSGABEN_BASIS (strukturelles Defizit)
    expect(haushalt.laufendeAusgaben).toBe(0);
    expect(haushalt.konjunkturIndex).toBe(0);
    expect(haushalt.steuerpolitikModifikator).toBe(1.0);
  });
});

describe('applyGesetzKosten', () => {
  it('wendet einmalige und laufende Kosten an', () => {
    const state = createMockState();
    const gesetz: Law = {
      id: 'test_gesetz',
      titel: 'Test',
      kurz: 'Test',
      desc: '',
      tags: ['bund'],
      status: 'entwurf',
      ja: 60,
      nein: 40,
      effekte: {},
      lag: 0,
      expanded: false,
      route: null,
      rprog: 0,
      rdur: 0,
      blockiert: null,
      kosten_einmalig: 20,
      kosten_laufend: 5,
      einnahmeeffekt: 0,
    };
    const stateMitGesetz = { ...state, gesetze: [gesetz] };
    const result = applyGesetzKosten(stateMitGesetz, 'test_gesetz');
    expect(result.haushalt?.saldoKumulativ).toBe(-20);
    expect(result.haushalt?.laufendeAusgaben).toBe(5);
  });

  it('wendet einnahmeeffekt auf steuerpolitikModifikator an', () => {
    const state = createMockState();
    const gesetz: Law = {
      id: 'steuer_gesetz',
      titel: 'Steuer',
      kurz: 'Steuer',
      desc: '',
      tags: ['bund'],
      status: 'entwurf',
      ja: 60,
      nein: 40,
      effekte: {},
      lag: 0,
      expanded: false,
      route: null,
      rprog: 0,
      rdur: 0,
      blockiert: null,
      einnahmeeffekt: 35,
    };
    const stateMitGesetz = { ...state, gesetze: [gesetz] };
    const result = applyGesetzKosten(stateMitGesetz, 'steuer_gesetz');
    expect(result.haushalt?.steuerpolitikModifikator).toBeCloseTo(1.1, 2);
  });

  it('ändert nichts wenn Haushalt fehlt', () => {
    const state = createMockState();
    const ohneHaushalt = { ...state, haushalt: undefined };
    const result = applyGesetzKosten(ohneHaushalt, 'irgendwas');
    expect(result).toBe(ohneHaushalt);
  });

  it('SMA-309: setzt lehmannUltimatumBeschleunigt bei schuldenbremse_reform', () => {
    const state = createMockState();
    const gesetz: Law = {
      id: 'schuldenbremse_reform',
      titel: 'Schuldenbremse-Reform',
      kurz: 'SBR',
      desc: '',
      tags: ['bund'],
      status: 'entwurf',
      ja: 60,
      nein: 40,
      effekte: {},
      lag: 0,
      expanded: false,
      route: null,
      rprog: 0,
      rdur: 0,
      blockiert: null,
      einnahmeeffekt: 20,
    };
    const stateMitGesetz = { ...state, gesetze: [gesetz] };
    const result = applyGesetzKosten(stateMitGesetz, 'schuldenbremse_reform');
    expect(result.lehmannUltimatumBeschleunigt).toBe(true);
  });
});

describe('tickKonjunktur', () => {
  it('Drift bleibt in -3 bis +3', () => {
    const state = createMockState({
      haushalt: { ...createMockState().haushalt!, konjunkturIndex: 2.5 },
    });
    vi.spyOn(Math, 'random').mockReturnValue(0); // drift = -0.2
    const result = tickKonjunktur(state, 3);
    expect(result.haushalt?.konjunkturIndex).toBeGreaterThanOrEqual(-3);
    expect(result.haushalt?.konjunkturIndex).toBeLessThanOrEqual(3);
    vi.restoreAllMocks();
  });

  it('ändert nichts bei complexity < 3 (konjunkturindex inaktiv)', () => {
    const state = createMockState();
    const result = tickKonjunktur(state, 2);
    expect(result.haushalt?.konjunkturIndex).toBe(0);
  });
});

describe('checkLehmannSparvorschlag', () => {
  it('triggert nur einmal bei Saldo < -15', () => {
    const state = createMockState({
      haushalt: { ...createMockState().haushalt!, saldo: -20 },
      lehmannSparvorschlagAktiv: false,
      aktiveMinisterialInitiative: null,
    });
    const result = checkLehmannSparvorschlag(state, 3);
    expect(result.lehmannSparvorschlagAktiv).toBe(true);
    expect(result.aktiveMinisterialInitiative?.initId).toBe('fm_sparpaket');

    const result2 = checkLehmannSparvorschlag(result, 3);
    expect(result2).toBe(result);
  });

  it('triggert nicht wenn bereits aktiv', () => {
    const state = createMockState({
      haushalt: { ...createMockState().haushalt!, saldo: -20 },
      lehmannSparvorschlagAktiv: true,
    });
    const result = checkLehmannSparvorschlag(state, 3);
    expect(result).toBe(state);
  });

  it('triggert nicht bei Saldo >= -15', () => {
    const state = createMockState({
      haushalt: { ...createMockState().haushalt!, saldo: -10 },
    });
    const result = checkLehmannSparvorschlag(state, 3);
    expect(result).toBe(state);
  });

  it('triggert nicht bei complexity < 3 (schuldenbremse inaktiv)', () => {
    const state = createMockState({
      haushalt: { ...createMockState().haushalt!, saldo: -20 },
    });
    const result = checkLehmannSparvorschlag(state, 2);
    expect(result).toBe(state);
  });
});
});
