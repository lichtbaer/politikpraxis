/**
 * Unit-Tests für Medienklima-Engine (SMA-277)
 */
import { describe, it, expect } from 'vitest';
import {
  getMedienMultiplikator,
  tickMedienKlima,
  applyFraming,
  pressemitteilung,
} from './medien';
import type { GameState, ContentBundle, Law } from '../types';

function createBaseState(): GameState {
  const gesetz: Law = {
    id: 'ee',
    titel: 'Energiewende',
    kurz: 'EE',
    desc: '',
    tags: ['bund'],
    status: 'entwurf',
    ja: 60,
    nein: 40,
    effekte: { gi: 2 },
    lag: 2,
    expanded: false,
    route: null,
    rprog: 0,
    rdur: 0,
    blockiert: null,
    framing_optionen: [
      { key: 'klimaschutz', milieu_effekte: { postmaterielle: 5 }, verband_effekte: { uvb: 3 }, medienklima_delta: 2 },
      { key: 'wirtschaft', milieu_effekte: { leistungstraeger: 3 }, verband_effekte: {}, medienklima_delta: 0 },
    ],
  };
  return {
    month: 12,
    speed: 1,
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
    medienKlima: 55,
    milieuZustimmung: { postmaterielle: 50, leistungstraeger: 50 },
    verbandsBeziehungen: { uvb: 50 },
  } as GameState;
}

const content: ContentBundle = {
  characters: [],
  events: [],
  charEvents: {},
  laws: [],
  bundesrat: [],
  milieus: [],
  politikfelder: [],
  verbaende: [],
  medienEvents: [],
  scenario: { id: 's1', name: 'Test', startMonth: 1, startPK: 100, startKPI: { al: 5, hh: 0, gi: 50, zf: 50 }, startCoalition: 70 },
};

describe('getMedienMultiplikator', () => {
  it('gibt 1.15 bei medienKlima >= 70', () => {
    expect(getMedienMultiplikator(70)).toBe(1.15);
    expect(getMedienMultiplikator(85)).toBe(1.15);
    expect(getMedienMultiplikator(100)).toBe(1.15);
  });

  it('gibt 1.0 bei medienKlima 40–69', () => {
    expect(getMedienMultiplikator(40)).toBe(1.0);
    expect(getMedienMultiplikator(55)).toBe(1.0);
    expect(getMedienMultiplikator(69)).toBe(1.0);
  });

  it('gibt 0.85 bei medienKlima 20–39', () => {
    expect(getMedienMultiplikator(20)).toBe(0.85);
    expect(getMedienMultiplikator(30)).toBe(0.85);
    expect(getMedienMultiplikator(39)).toBe(0.85);
  });

  it('gibt 0.70 bei medienKlima < 20', () => {
    expect(getMedienMultiplikator(0)).toBe(0.7);
    expect(getMedienMultiplikator(10)).toBe(0.7);
    expect(getMedienMultiplikator(19)).toBe(0.7);
  });
});

describe('tickMedienKlima', () => {
  it('Drift: medienKlima > 50 sinkt um 1', () => {
    const state = createBaseState();
    state.medienKlima = 60;
    const result = tickMedienKlima(state, content, 2);
    expect(result.medienKlima).toBe(59);
  });

  it('Drift: medienKlima < 50 steigt um 1', () => {
    const state = createBaseState();
    state.medienKlima = 40;
    const result = tickMedienKlima(state, content, 2);
    expect(result.medienKlima).toBe(41);
  });

  it('Drift: medienKlima = 50 bleibt', () => {
    const state = createBaseState();
    state.medienKlima = 50;
    const result = tickMedienKlima(state, content, 2);
    expect(result.medienKlima).toBe(50);
  });

  it('Drift bleibt bei 0 und 100 begrenzt', () => {
    const state = createBaseState();
    state.medienKlima = 0;
    const result1 = tickMedienKlima(state, content, 2);
    expect(result1.medienKlima).toBe(1);

    state.medienKlima = 100;
    const result2 = tickMedienKlima(state, content, 2);
    expect(result2.medienKlima).toBe(99);
  });

  it('bei Komplexität 1 wird medienklima nicht angewendet', () => {
    const state = createBaseState();
    state.medienKlima = 60;
    const result = tickMedienKlima(state, content, 1);
    expect(result.medienKlima).toBe(60);
  });
});

describe('applyFraming', () => {
  it('wendet Framing-Effekte an (Milieu, Verband, Medienklima)', () => {
    const state = createBaseState();
    const result = applyFraming(state, 'ee', 'klimaschutz', 2);
    expect(result.milieuZustimmung?.postmaterielle).toBe(55);
    expect(result.verbandsBeziehungen?.uvb).toBe(53);
    expect(result.medienKlima).toBe(57);
  });

  it('ignoriert unbekannten framingKey', () => {
    const state = createBaseState();
    const result = applyFraming(state, 'ee', 'unbekannt', 2);
    expect(result.milieuZustimmung?.postmaterielle).toBe(50);
    expect(result.medienKlima).toBe(55);
  });

  it('ignoriert bei null framingKey', () => {
    const state = createBaseState();
    const result = applyFraming(state, 'ee', null, 2);
    expect(result.medienKlima).toBe(55);
  });

  it('begrenzt Werte auf 0–100', () => {
    const state = createBaseState();
    state.milieuZustimmung = { postmaterielle: 98 };
    const gesetz = state.gesetze[0];
    if (gesetz?.framing_optionen) {
      gesetz.framing_optionen[0].milieu_effekte = { postmaterielle: 10 };
    }
    const result = applyFraming(state, 'ee', 'klimaschutz', 2);
    expect(result.milieuZustimmung?.postmaterielle).toBe(100);
  });
});

describe('pressemitteilung', () => {
  it('verbraucht 5 PK und erhöht medienKlima (haushalt)', () => {
    const state = createBaseState();
    state.pk = 10;
    state.medienKlima = 50;
    const result = pressemitteilung(state, 'haushalt', 3);
    expect(result.pk).toBe(5);
    expect(result.medienKlima).toBe(54);
    expect(result.letztesPressemitteilungMonat).toBe(12);
  });

  it('blockiert bei bereits genutzter Pressemitteilung im selben Monat', () => {
    const state = createBaseState();
    state.pk = 20;
    state.letztesPressemitteilungMonat = 12;
    const result = pressemitteilung(state, 'haushalt', 3);
    expect(result.pk).toBe(20);
    expect(result.medienKlima).toBe(55);
  });

  it('blockiert bei zu wenig PK', () => {
    const state = createBaseState();
    state.pk = 3;
    const result = pressemitteilung(state, 'haushalt', 3);
    expect(result.pk).toBe(3);
  });

  it('halbe Wirkung bei medienKlima < 30', () => {
    const state = createBaseState();
    state.pk = 10;
    state.medienKlima = 20;
    const result = pressemitteilung(state, 'haushalt', 3);
    expect(result.medienKlima).toBe(22); // 4 * 0.5 = 2
  });
});
