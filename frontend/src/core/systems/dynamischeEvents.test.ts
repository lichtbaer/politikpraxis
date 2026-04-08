import { describe, it, expect, vi } from 'vitest';
import type { ContentBundle, GameEvent, GameState } from '../types';
import * as rng from '../rng';
import { checkDynamischeEvents } from './dynamischeEvents';

function baseState(over: Partial<GameState> = {}): GameState {
  return {
    month: 5,
    speed: 0,
    pk: 80,
    view: 'agenda',
    kpi: { al: 5, hh: 50, gi: 50, zf: 50 },
    kpiPrev: null,
    tickLog: [],
    zust: { g: 50, arbeit: 50, mitte: 50, prog: 50 },
    coalition: 55,
    chars: [],
    gesetze: [],
    bundesrat: [],
    bundesratFraktionen: [],
    activeEvent: null,
    firedEvents: [],
    ausgeloesteEvents: [],
    firedCharEvents: [],
    firedBundesratEvents: [],
    pending: [],
    log: [],
    ticker: '',
    gameOver: false,
    won: false,
    haushalt: {
      einnahmen: 400,
      pflichtausgaben: 350,
      laufendeAusgaben: 30,
      spielraum: 50,
      saldo: 20,
      saldoKumulativ: 0,
      konjunkturIndex: 0,
      steuerpolitikModifikator: 1,
      investitionsquote: 0,
      schuldenbremseAktiv: true,
      haushaltsplanMonat: 10,
      haushaltsplanBeschlossen: false,
      planPrioritaeten: [],
    },
    medienKlima: 50,
    medienKlimaHistory: [20, 22, 24, 26],
    ...over,
  } as GameState;
}

const saldoEv: GameEvent = {
  id: 'dyn_wirtschaftskrise_droht',
  type: 'warn',
  icon: 'x',
  typeLabel: 'W',
  title: 't',
  quote: 'q',
  context: 'c',
  ticker: 'tk',
  choices: [],
  triggerTyp: 'saldo_unter',
  triggerParams: { wert: -35, monate: 3 },
  einmalig: true,
  min_complexity: 1,
};

describe('checkDynamischeEvents', () => {
  it('löst Saldo-Trigger aus wenn letzte 3 Monate unter Schwelle', () => {
    vi.spyOn(rng, 'nextRandom').mockReturnValue(0.99);
    const state = baseState({
      haushaltSaldoHistory: [-40, -38, -36],
      haushalt: {
        einnahmen: 400,
        pflichtausgaben: 350,
        laufendeAusgaben: 80,
        spielraum: -30,
        saldo: -36,
        saldoKumulativ: -100,
        konjunkturIndex: 0,
        steuerpolitikModifikator: 1,
        investitionsquote: 0,
        schuldenbremseAktiv: true,
        haushaltsplanMonat: 10,
        haushaltsplanBeschlossen: false,
        planPrioritaeten: [],
      },
    });
    const content = { dynamicEvents: [saldoEv] } as unknown as ContentBundle;
    const next = checkDynamischeEvents(state, content, 4);
    expect(next.activeEvent?.id).toBe('dyn_wirtschaftskrise_droht');
    expect(next.ausgeloesteEvents).toContain('dyn_wirtschaftskrise_droht');
    expect(next.firedEvents).toContain('dyn_wirtschaftskrise_droht');
    vi.restoreAllMocks();
  });

  it('löst monat_range mit Zufall aus', () => {
    vi.spyOn(rng, 'nextRandom').mockReturnValue(0.01);
    const rangeEv: GameEvent = {
      ...saldoEv,
      id: 'dyn_energiekrise_eu',
      triggerTyp: 'monat_range',
      triggerParams: { von: 1, bis: 48, wahrscheinlichkeit: 0.5 },
    };
    const next = checkDynamischeEvents(baseState({ month: 10 }), { dynamicEvents: [rangeEv] } as unknown as ContentBundle, 4);
    expect(next.activeEvent?.id).toBe('dyn_energiekrise_eu');
    vi.restoreAllMocks();
  });
});
