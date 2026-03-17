import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getMedienMultiplikator,
  applyFraming,
  getMedienPkZusatzkosten,
  tickMedienKlima,
} from './medienklima';
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
    framing_optionen: [
      {
        key: 'klimaschutz',
        milieu_effekte: { postmaterielle: 5, soziale_mitte: 2 },
        verband_effekte: { uvb: 3 },
        medienklima_delta: 2,
      },
    ],
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

describe('getMedienMultiplikator', () => {
  it('k >= 70 → 1.15', () => {
    expect(getMedienMultiplikator(70)).toBe(1.15);
    expect(getMedienMultiplikator(85)).toBe(1.15);
  });

  it('k >= 40 und < 70 → 1.0', () => {
    expect(getMedienMultiplikator(40)).toBe(1.0);
    expect(getMedienMultiplikator(55)).toBe(1.0);
    expect(getMedienMultiplikator(69)).toBe(1.0);
  });

  it('k >= 20 und < 40 → 0.85', () => {
    expect(getMedienMultiplikator(20)).toBe(0.85);
    expect(getMedienMultiplikator(30)).toBe(0.85);
    expect(getMedienMultiplikator(39)).toBe(0.85);
  });

  it('k < 20 → 0.70', () => {
    expect(getMedienMultiplikator(0)).toBe(0.7);
    expect(getMedienMultiplikator(19)).toBe(0.7);
  });
});

describe('getMedienPkZusatzkosten', () => {
  it('medienKlima >= 20 → 0', () => {
    expect(getMedienPkZusatzkosten(20)).toBe(0);
    expect(getMedienPkZusatzkosten(55)).toBe(0);
  });

  it('medienKlima < 20 → 3', () => {
    expect(getMedienPkZusatzkosten(19)).toBe(3);
    expect(getMedienPkZusatzkosten(0)).toBe(3);
  });
});

describe('applyFraming', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('wendet Framing-Effekte an (milieu, verband, medienklima)', () => {
    const state = createMockState();
    const result = applyFraming(state, 'ee', 'klimaschutz', 2);

    expect(result.milieuZustimmung?.['postmaterielle']).toBe(55);
    expect(result.milieuZustimmung?.['soziale_mitte']).toBe(52);
    expect(result.verbandsBeziehungen?.['uvb']).toBe(53);
    expect(result.medienKlima).toBe(57);
  });

  it('ignoriert bei unbekanntem framingKey', () => {
    const state = createMockState();
    const result = applyFraming(state, 'ee', 'unbekannt', 2);
    expect(result).toBe(state);
  });

  it('ignoriert bei fehlendem Gesetz', () => {
    const state = createMockState();
    const result = applyFraming(state, 'nicht_vorhanden', 'klimaschutz', 2);
    expect(result).toBe(state);
  });

  it('clamped Werte 0–100', () => {
    const gesetzMitExtrem: Law = {
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
      framing_optionen: [
        { key: 'extreme', milieu_effekte: { postmaterielle: 10 }, medienklima_delta: 50 },
      ],
    };
    const state = createMockState({
      milieuZustimmung: { postmaterielle: 98 },
      gesetze: [gesetzMitExtrem],
      medienKlima: 95,
    });
    const result = applyFraming(state, 'ee', 'extreme', 2);
    expect(result.milieuZustimmung?.['postmaterielle']).toBe(100);
    expect(result.medienKlima).toBe(100);
  });
});

describe('tickMedienKlima Drift', () => {
  const minimalContent = {
    characters: [],
    events: [],
    charEvents: {},
    laws: [],
    bundesrat: [],
    medienEvents: [] as import('../types').MedienEventContent[],
    scenario: { id: 's', name: 's', startMonth: 1, startPK: 100, startKPI: { al: 5, hh: 0, gi: 50, zf: 50 }, startCoalition: 70 },
  } as import('../types').ContentBundle;

  it('Drift Richtung 50: medienKlima > 50 sinkt um 1', () => {
    const state = createMockState({ medienKlima: 60 });
    const result = tickMedienKlima(state, minimalContent, 2);
    expect(result.medienKlima).toBe(59);
  });

  it('Drift Richtung 50: medienKlima < 50 steigt um 1', () => {
    const state = createMockState({ medienKlima: 40 });
    const result = tickMedienKlima(state, minimalContent, 2);
    expect(result.medienKlima).toBe(41);
  });

  it('Drift bei 50: bleibt 50', () => {
    const state = createMockState({ medienKlima: 50 });
    const result = tickMedienKlima(state, minimalContent, 2);
    expect(result.medienKlima).toBe(50);
  });
});
