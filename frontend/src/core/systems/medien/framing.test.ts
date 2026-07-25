import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applyFraming } from './framing';
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

const singleAkteurContent = {
  medienAkteureContent: [
    { id: 'oeffentlich', name: 'Test', typ: 'oeffentlich' as const, reichweite: 100, stimmung_start: 10, min_complexity: 2 },
  ],
} as import('../../types').ContentBundle;

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
