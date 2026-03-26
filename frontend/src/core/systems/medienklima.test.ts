import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getMedienMultiplikator,
  applyFraming,
  getMedienPkZusatzkosten,
  tickMedienKlima,
  berechneMedianklima,
  getAktiveMilieusFuerTalkshow,
  doMedienAktion,
} from './medienklima';
import type { GameState, Law, ContentBundle, Milieu } from '../types';

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

describe('getMedienMultiplikator (linear: 0→0.7, 50→1.0, 100→1.3)', () => {
  it('k = 0 → 0.7', () => {
    expect(getMedienMultiplikator(0)).toBe(0.7);
  });

  it('k = 50 → 1.0', () => {
    expect(getMedienMultiplikator(50)).toBe(1.0);
  });

  it('k = 100 → 1.3', () => {
    expect(getMedienMultiplikator(100)).toBe(1.3);
  });

  it('interpoliert linear zwischen Extremen', () => {
    expect(getMedienMultiplikator(25)).toBe(0.85);
    expect(getMedienMultiplikator(75)).toBe(1.15);
  });

  it('clamped auf 0–100', () => {
    expect(getMedienMultiplikator(-10)).toBe(0.7);
    expect(getMedienMultiplikator(110)).toBe(1.3);
  });
});

describe('berechneMedianklima (SMA-390)', () => {
  it('gewichteter Index aus Akteuren', () => {
    const G = {
      medienKlima: 50,
      medienAkteure: {
        a: { stimmung: 10, reichweite: 50 },
        b: { stimmung: -10, reichweite: 50 },
      },
    } as unknown as GameState;
    expect(berechneMedianklima(G)).toBe(50);
  });

  it('Alternativ >10% Reichweite: Malus −5', () => {
    const G = {
      medienKlima: 50,
      medienAkteure: {
        alternativ: { stimmung: 0, reichweite: 12 },
      },
    } as unknown as GameState;
    expect(berechneMedianklima(G)).toBe(45);
  });

  it('effektive Stimmung: Buff bis bisMonat (SMA-392)', () => {
    const G = {
      month: 5,
      medienKlima: 50,
      medienAkteure: {
        boulevard: { stimmung: 0, reichweite: 100 },
      },
      medienAkteurBuffs: {
        boulevard: { stimmung: 10, bisMonat: 5 },
      },
    } as unknown as GameState;
    expect(berechneMedianklima(G)).toBe(55);
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

const singleAkteurContent = {
  medienAkteureContent: [
    { id: 'oeffentlich', name_de: 'Test', typ: 'oeffentlich' as const, reichweite: 100, stimmung_start: 10, min_complexity: 2 },
  ],
} as import('../types').ContentBundle;

describe('applyFraming', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('wendet Framing-Effekte an (milieu, verband, medienklima)', () => {
    const state = createMockState();
    const result = applyFraming(state, 'ee', 'klimaschutz', 2, singleAkteurContent);

    expect(result.milieuZustimmung?.['postmaterielle']).toBe(55);
    expect(result.milieuZustimmung?.['soziale_mitte']).toBe(52);
    expect(result.verbandsBeziehungen?.['uvb']).toBe(53);
    expect(result.medienKlima).toBe(57);
  });

  it('ignoriert bei unbekanntem framingKey', () => {
    const state = createMockState();
    const result = applyFraming(state, 'ee', 'unbekannt', 2, singleAkteurContent);
    expect(result).toBe(state);
  });

  it('ignoriert bei fehlendem Gesetz', () => {
    const state = createMockState();
    const result = applyFraming(state, 'nicht_vorhanden', 'klimaschutz', 2, singleAkteurContent);
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
    const result = applyFraming(state, 'ee', 'extreme', 2, singleAkteurContent);
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

const ZERO_IO: Milieu['ideologie'] = { wirtschaft: 0, gesellschaft: 0, staat: 0 };

describe('getAktiveMilieusFuerTalkshow (SMA-393)', () => {
  const milieus: Milieu[] = [
    { id: 'soziale_mitte', ideologie: ZERO_IO, min_complexity: 2, kurz: 'S' },
    { id: 'prekaere', ideologie: ZERO_IO, min_complexity: 3, kurz: 'P' },
    { id: 'etablierte', ideologie: ZERO_IO, min_complexity: 3, kurz: 'E' },
  ];
  const bundle = { milieus } as ContentBundle;

  it('Stufe 1 / ohne milieus_4: leer', () => {
    expect(getAktiveMilieusFuerTalkshow(1, bundle)).toEqual([]);
  });

  it('Stufe 2: nur Milieus mit min_complexity ≤ 2', () => {
    expect(getAktiveMilieusFuerTalkshow(2, bundle)).toEqual(['soziale_mitte']);
  });

  it('Stufe 3+: alle freigeschalteten Milieus', () => {
    expect(getAktiveMilieusFuerTalkshow(3, bundle)).toEqual(['soziale_mitte', 'prekaere', 'etablierte']);
  });
});

describe('doMedienAktion ÖR-Talkshow (SMA-393)', () => {
  it('erhöht nur aktive Milieus (min_complexity), nicht alle Bundle-IDs', () => {
    const milieus: Milieu[] = [
      { id: 'soziale_mitte', ideologie: ZERO_IO, min_complexity: 2, kurz: 'S' },
      { id: 'prekaere', ideologie: ZERO_IO, min_complexity: 3, kurz: 'P' },
    ];
    const content = {
      characters: [],
      events: [],
      charEvents: {},
      laws: [],
      bundesrat: [],
      medienEvents: [],
      scenario: {
        id: 's',
        name: 's',
        startMonth: 1,
        startPK: 100,
        startKPI: { al: 5, hh: 0, gi: 50, zf: 50 },
        startCoalition: 70,
      },
      milieus,
    } as ContentBundle;

    const base = createMockState({
      month: 10,
      pk: 100,
      complexity: 3,
      milieuZustimmung: { soziale_mitte: 50, prekaere: 50, etablierte: 50 },
      medienAktionenGenutzt: {},
    });

    const wrapped = doMedienAktion(base, 'oeffentlich_talkshow', 3, content);
    expect(wrapped).not.toBeNull();
    const next = wrapped!.state;
    expect(next.milieuZustimmung?.soziale_mitte).toBe(51);
    expect(next.milieuZustimmung?.prekaere).toBe(51);
    expect(next.milieuZustimmung?.etablierte).toBe(50);
    expect(wrapped!.outcome).toEqual({ ok: true, aktion: 'oeffentlich_talkshow', pkKosten: 10 });
  });

  it('bei Cooldown: State unverändert, outcome cooldown', () => {
    const milieus: Milieu[] = [{ id: 'soziale_mitte', ideologie: ZERO_IO, min_complexity: 2, kurz: 'S' }];
    const content = {
      characters: [],
      events: [],
      charEvents: {},
      laws: [],
      bundesrat: [],
      medienEvents: [],
      scenario: {
        id: 's',
        name: 's',
        startMonth: 1,
        startPK: 100,
        startKPI: { al: 5, hh: 0, gi: 50, zf: 50 },
        startCoalition: 70,
      },
      milieus,
    } as ContentBundle;

    const base = createMockState({
      month: 10,
      pk: 100,
      complexity: 3,
      milieuZustimmung: { soziale_mitte: 50 },
      medienAktionenGenutzt: { oeffentlich_talkshow: 10 },
    });

    const wrapped = doMedienAktion(base, 'oeffentlich_talkshow', 3, content);
    expect(wrapped?.state).toBe(base);
    expect(wrapped?.outcome).toEqual({ ok: false, reason: 'cooldown' });
  });
});
