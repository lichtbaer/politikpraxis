import { describe, it, expect } from 'vitest';
import {
  brauchtGegenfinanzierung,
  berechneOptionen,
  wendeGegenfinanzierungAn,
  istGegenfinanzierungErfuellt,
} from './gegenfinanzierung';
import type { GameState, Law, ContentBundle } from '../types';

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    month: 12,
    speed: 1,
    pk: 50,
    view: 'agenda',
    kpi: { al: 5, hh: 5, gi: 5, zf: 5 },
    kpiPrev: null,
    tickLog: [],
    zust: { g: 50, arbeit: 50, mitte: 50, prog: 50 },
    coalition: 60,
    chars: [
      {
        id: 'fm',
        name: 'Lehmann',
        role: 'FM',
        initials: 'RL',
        color: '#000',
        mood: 3,
        loyalty: 4,
        bio: '',
        interests: [],
        bonus: { trigger: '', desc: '', applies: '' },
        ultimatum: { moodThresh: 0, event: '' },
        ressort: 'finanzen',
        pool_partei: 'cdp',
      },
    ],
    gesetze: [],
    eingebrachteGesetze: [],
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
    haushalt: {
      einnahmen: 350,
      pflichtausgaben: 370,
      laufendeAusgaben: 20,
      spielraum: -20,
      saldo: -40,
      saldoKumulativ: 0,
      konjunkturIndex: 0,
      steuerpolitikModifikator: 1,
      investitionsquote: 0,
      schuldenbremseAktiv: true,
      haushaltsplanMonat: 10,
      haushaltsplanBeschlossen: false,
      planPrioritaeten: [],
      schuldenbremseSpielraum: 13,
    },
    ...overrides,
  } as GameState;
}

function makeLaw(overrides: Partial<Law> = {}): Law {
  return {
    id: 'test',
    titel: 'Test',
    kurz: 'T',
    desc: '',
    tags: ['bund'],
    status: 'entwurf',
    ja: 50,
    nein: 50,
    effekte: {},
    lag: 4,
    expanded: false,
    route: null,
    rprog: 0,
    rdur: 0,
    blockiert: null,
    ...overrides,
  } as Law;
}

describe('gegenfinanzierung', () => {
  it('brauchtGegenfinanzierung: false bei < 1 Mrd. laufend', () => {
    expect(brauchtGegenfinanzierung(makeLaw({ kosten_laufend: -0.5 }))).toBe(false);
    expect(brauchtGegenfinanzierung(makeLaw({ kosten_laufend: 0 }))).toBe(false);
  });

  it('brauchtGegenfinanzierung: true bei > 1 Mrd. laufend', () => {
    expect(brauchtGegenfinanzierung(makeLaw({ kosten_laufend: -2 }))).toBe(true);
    expect(brauchtGegenfinanzierung(makeLaw({ kosten_laufend: -5 }))).toBe(true);
  });

  it('brauchtGegenfinanzierung: true bei > 3 Mrd. einmalig', () => {
    expect(brauchtGegenfinanzierung(makeLaw({ kosten_einmalig: -5 }))).toBe(true);
  });

  it('brauchtGegenfinanzierung: Einnahmen reduzieren Netto-Kosten', () => {
    const law = makeLaw({ kosten_laufend: -3, einnahmeeffekt: 2 });
    expect(brauchtGegenfinanzierung(law)).toBe(true); // -3 + 2 = -1 netto
  });

  it('berechneOptionen: liefert Optionen bei complexity 2+', () => {
    const state = makeState({
      gesetze: [
        makeLaw({ id: 'steuer_plus', einnahmeeffekt: 10, status: 'entwurf' }),
      ],
    });
    const law = makeLaw({ kosten_laufend: -5 });
    const optionen = berechneOptionen(state, law, {} as ContentBundle, 2);
    expect(optionen.length).toBeGreaterThan(0);
    expect(optionen.some((o) => o.key === 'ministerium_kuerzen')).toBe(true);
    expect(optionen.some((o) => o.key === 'schulden')).toBe(true);
  });

  it('berechneOptionen: leer bei complexity 1 (Stufe 1: kein Dialog)', () => {
    const state = makeState();
    const law = makeLaw({ kosten_laufend: -5 });
    const optionen = berechneOptionen(state, law, {} as ContentBundle, 1);
    expect(optionen).toEqual([]);
  });

  it('wendeGegenfinanzierungAn: steuergesetz koppelt Gesetz', () => {
    const state = makeState();
    const law = makeLaw({ id: 'teures_gesetz', kosten_laufend: -5 });
    const option = {
      key: 'steuergesetz' as const,
      label_de: 'Steuergesetz verknüpfen',
      verfuegbar: true,
      suboptionen: [{ gesetzId: 'est_plus', einnahmeeffekt: 17 }],
    };
    const result = wendeGegenfinanzierungAn(state, law, option, 'est_plus');
    expect(result.gekoppelteGesetze?.['teures_gesetz']).toBe('est_plus');
  });

  it('istGegenfinanzierungErfuellt: true ohne Kopplung', () => {
    const state = makeState();
    expect(istGegenfinanzierungErfuellt(state, 'irgendwas')).toBe(true);
  });

  it('istGegenfinanzierungErfuellt: false wenn Kopplung, Steuergesetz nicht beschlossen', () => {
    const state = makeState({
      gekoppelteGesetze: { gesetz_a: 'est_plus' },
      gesetze: [
        makeLaw({ id: 'est_plus', status: 'entwurf' }),
      ],
    });
    expect(istGegenfinanzierungErfuellt(state, 'gesetz_a')).toBe(false);
  });

  it('istGegenfinanzierungErfuellt: true wenn Kopplung, Steuergesetz beschlossen', () => {
    const state = makeState({
      gekoppelteGesetze: { gesetz_a: 'est_plus' },
      gesetze: [
        makeLaw({ id: 'est_plus', status: 'beschlossen' }),
      ],
    });
    expect(istGegenfinanzierungErfuellt(state, 'gesetz_a')).toBe(true);
  });
});
