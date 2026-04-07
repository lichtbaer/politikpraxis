/**
 * Integration-Tests: End-to-End-Szenarien über mehrere Systeme
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { tick } from './engine';
import { einbringen } from './systems/parliament';
import { applyMilieuEffekte } from './systems/milieus';
import { berechneWahlprognose } from './systems/wahlprognose';
import { triggerHaushaltsdebatte } from './systems/haushalt';
import type { GameState, ContentBundle, Law } from './types';

function createInitialState(): GameState {
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
    ideologie: { wirtschaft: -30, gesellschaft: -60, staat: -20 },
  };

  return {
    month: 1,
    speed: 1,
    pk: 100,
    view: 'agenda',
    kpi: { al: 5, hh: 0, gi: 50, zf: 50 },
    kpiPrev: null,
    tickLog: [],
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
    rngSeed: 42,
    gameOver: false,
    won: false,
    milieuZustimmung: { postmaterielle: 50, buergerliche_mitte: 50 },
  } as GameState;
}

const content: ContentBundle = {
  characters: [],
  events: [],
  charEvents: {},
  bundesratEvents: [],
  laws: [],
  bundesrat: [],
  bundesratFraktionen: [],
  milieus: [
    { id: 'postmaterielle', ideologie: { wirtschaft: -40, gesellschaft: -80, staat: -30 }, min_complexity: 1, gewicht: 14, basisbeteiligung: 70 },
    { id: 'buergerliche_mitte', ideologie: { wirtschaft: 20, gesellschaft: 0, staat: 10 }, min_complexity: 1, gewicht: 20, basisbeteiligung: 80 },
  ],
  politikfelder: [],
  verbaende: [],
  scenario: { id: 's1', name: 'Test', startMonth: 1, startPK: 100, startKPI: { al: 5, hh: 0, gi: 50, zf: 50 }, startCoalition: 70 },
};

describe('SMA-291: Bundesrat-Stufen — Stufe 1 Land-Gesetz direkt beschlossen', () => {
  it('Land-Gesetz bei complexity=1: BT-Mehrheit → direkt beschlossen (kein bt_passed)', () => {
    const gesetz: Law = {
      id: 'wb',
      titel: 'Wohnungsbau',
      kurz: 'WB',
      desc: '',
      tags: ['land'],
      status: 'entwurf',
      ja: 65,
      nein: 35,
      effekte: { gi: 1 },
      lag: 2,
      expanded: false,
      route: null,
      rprog: 0,
      rdur: 0,
      blockiert: null,
    };
    const state: GameState = {
      ...createInitialState(),
      gesetze: [gesetz],
      bundesratFraktionen: [
        { id: 'kb', name: 'KB', laender: ['by', 'bw', 'sn'], sprecher: { name: 'X', partei: 'CDP', land: 'BY', initials: 'X', color: '#000', bio: '' }, beziehung: 50, basisBereitschaft: 60, tradeoffPool: [] },
      ] as GameState['bundesratFraktionen'],
    };
    let s = einbringen(state, 'wb', { ausrichtung: { wirtschaft: 0, gesellschaft: 0, staat: 0 }, complexity: 1 });
    expect(s.gesetze[0].status).toBe('eingebracht');
    // SMA-304: Tick löst Abstimmung nach lag_months (Stufe 1: 1 Monat)
    s = tick(s, content, 1);
    expect(s.gesetze[0].status).toBe('beschlossen');
    expect(s.gesetze[0]).not.toHaveProperty('brVoteMonth');
  });
});

describe('Integration: Gesetz einbringen → Milieu reagiert → Wahlprognose ändert sich', () => {
  afterEach(() => vi.restoreAllMocks());

  it('Gesetz beschlossen → Milieu-Zustimmung ändert sich → Wahlprognose ändert sich', () => {
    // Math.random deterministisch: kein Abweichler-Würfwurf (0.99 × 100 = 99 > max Risiko 30)
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const state = createInitialState();
    let s = einbringen(state, 'ee', { ausrichtung: { wirtschaft: -30, gesellschaft: -60, staat: -20 }, complexity: 3 });
    expect(s.gesetze[0].status).toBe('eingebracht');

    // SMA-304: Tick löst Abstimmung nach Einbringungs-Lag (complexity 3: lag/2 = 1 Monat)
    s = tick(s, content, 3);
    expect(s.gesetze[0].status).toBe('beschlossen');

    s = applyMilieuEffekte(s, 'ee', content.milieus!, 3);
    const prognose = berechneWahlprognose(s, content, 3);
    expect(prognose).toBeGreaterThanOrEqual(0);
    expect(prognose).toBeLessThanOrEqual(100);
  });
});

describe('Integration: Haushaltsdebatte Oktober → Politikfeld-Priorisierung', () => {
  it('Haushaltsdebatte wird in Monat 10 getriggert (direkt via triggerHaushaltsdebatte)', () => {
    const state = createInitialState();
    state.month = 10;
    state.haushalt = {
      einnahmen: 350,
      pflichtausgaben: 370,
      laufendeAusgaben: 0,
      spielraum: -20,
      saldo: -20,
      saldoKumulativ: 0,
      konjunkturIndex: 0,
      steuerpolitikModifikator: 1.0,
      investitionsquote: 0,
      schuldenbremseAktiv: true,
      haushaltsplanMonat: 10,
      haushaltsplanBeschlossen: false,
      planPrioritaeten: [],
    };
    const politikfelder = [{ id: 'umwelt_energie' }, { id: 'wirtschaft_finanzen' }];
    const s = triggerHaushaltsdebatte(state, 3, politikfelder);
    expect(s.aktivesStrukturEvent?.type).toBe('haushaltsdebatte');
  });
});

describe('Integration: Engine-Tick durchläuft', () => {
  it('Tick läuft ohne Fehler durch', () => {
    const state = createInitialState();
    const s = tick(state, content, 2);
    expect(s.month).toBeGreaterThanOrEqual(1);
    expect(s.gameOver).toBe(false);
  });
});

/** SMA-412: Medienklima-Verlauf — ein Eintrag pro abgeschlossenem Monat inkl. Start nach erstem Tick */
describe('SMA-412: Medienklima-Verlauf (History)', () => {
  it('nach 3 Ticks mindestens 3 Datenpunkte (End-of-tick-Werte)', () => {
    const state = createInitialState();
    let s = state;
    for (let i = 0; i < 3; i++) {
      s = tick(s, content, 2);
    }
    const h = s.medienKlimaHistory ?? [];
    expect(h.length).toBeGreaterThanOrEqual(3);
  });
});
