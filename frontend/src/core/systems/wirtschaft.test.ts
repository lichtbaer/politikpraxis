import { describe, it, expect } from 'vitest';
import type { GameState, Law } from '../types';
import { createInitialWirtschaft, tickWirtschaft, scheduleSektorEffekteFromGesetz, bipZuKonjunkturIndex } from './wirtschaft';

function baseState(overrides: Partial<GameState> = {}): GameState {
  const law: Law = {
    id: 't',
    titel: 'T',
    kurz: 'k',
    desc: '',
    tags: ['bund'],
    status: 'beschlossen',
    ja: 50,
    nein: 50,
    effekte: {},
    lag: 0,
    expanded: false,
    route: null,
    rprog: 0,
    rdur: 0,
    blockiert: null,
    sektor_effekte: [{ sektor: 'industrie', delta: 10, verzoegerung_monate: 1 }],
  };
  return {
    month: 5,
    speed: 0,
    pk: 50,
    view: 'agenda',
    kpi: { al: 5, hh: 50, gi: 50, zf: 50 },
    kpiPrev: null,
    tickLog: [],
    zust: { g: 50, arbeit: 50, mitte: 50, prog: 50 },
    coalition: 50,
    chars: [],
    gesetze: [law],
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
      laufendeAusgaben: 0,
      spielraum: -20,
      saldo: -20,
      saldoKumulativ: 0,
      konjunkturIndex: 0,
      steuerpolitikModifikator: 1,
      investitionsquote: 0,
      schuldenbremseAktiv: true,
      haushaltsplanMonat: 10,
      haushaltsplanBeschlossen: false,
      planPrioritaeten: [],
      schuldenbremseSpielraum: 13,
      einnahmen_basis: 350,
    },
    verbandsBeziehungen: { bdi: 50, gbd: 50, uvb: 50 },
    complexity: 4,
    ...overrides,
  } as GameState;
}

describe('wirtschaft', () => {
  it('bipZuKonjunkturIndex: Start-BIP 1.2 → Index 0', () => {
    expect(bipZuKonjunkturIndex(1.2)).toBe(0);
  });

  it('scheduleSektorEffekteFromGesetz plant Delta für späteren Monat', () => {
    const s = scheduleSektorEffekteFromGesetz(baseState({ wirtschaft: createInitialWirtschaft() }), 't');
    expect(s.wirtschaft?.pendingSektorDeltas).toEqual([
      { sektor: 'industrie', delta: 10, wirkungMonat: 6 },
    ]);
  });

  it('tickWirtschaft setzt Konjunkturindex aus BIP und schreibt Verlauf', () => {
    const s0 = baseState({ wirtschaft: createInitialWirtschaft(), complexity: 4 });
    const s1 = tickWirtschaft(s0, 4);
    expect(s1.wirtschaft?.indikatoren_verlauf.length).toBe(1);
    expect(s1.wirtschaft?.indikatoren_verlauf[0]?.monat).toBe(5);
    expect(s1.haushalt?.konjunkturIndex).toBe(bipZuKonjunkturIndex(s1.wirtschaft!.bip_wachstum));
  });

  it('Stufe 1: kein Wirtschaftstick (Abwärtskompatibilität)', () => {
    const s = tickWirtschaft(baseState({ complexity: 1, wirtschaft: createInitialWirtschaft() }), 1);
    expect(s.wirtschaft?.indikatoren_verlauf.length).toBe(0);
  });

  it('Stufe 2: Wirtschaftstick läuft und schreibt Verlauf', () => {
    const s = tickWirtschaft(baseState({ complexity: 2, wirtschaft: createInitialWirtschaft() }), 2);
    expect(s.wirtschaft?.indikatoren_verlauf.length).toBe(1);
  });
});
