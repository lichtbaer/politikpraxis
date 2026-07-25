import { describe, it, expect } from 'vitest';
import { getAktiveMilieusFuerTalkshow, doMedienAktion } from './medienAktionen';
import type { GameState, Law, ContentBundle, Milieu } from '../../types';

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
