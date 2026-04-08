import { describe, expect, it } from 'vitest';
import { updateAgendaHistoryTrackers } from './agendaHistory';
import {
  AGENDA_TRACKING_CHAR_MOOD_MAX,
  AGENDA_TRACKING_MEDIENKLIMA_SCHWELLE,
} from '../constants';
import type { GameState } from '../types';

function baseState(overrides: Partial<GameState> = {}): GameState {
  return {
    month: 2,
    speed: 0,
    pk: 50,
    view: 'agenda',
    kpi: { al: 5, hh: 0, gi: 30, zf: 50 },
    kpiPrev: null,
    tickLog: [],
    zust: { g: 50, arbeit: 50, mitte: 50, prog: 50 },
    coalition: 50,
    chars: [
      {
        id: 'a',
        name: 'A',
        role: 'FM',
        initials: 'A',
        color: '#000',
        mood: 0,
        loyalty: 3,
      },
      {
        id: 'b',
        name: 'B',
        role: 'WM',
        initials: 'B',
        color: '#000',
        mood: 3,
        loyalty: 3,
      },
    ],
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
    rngSeed: 1,
    gameOver: false,
    won: false,
    milieuZustimmung: { m1: 40, m2: 60 },
    koalitionspartner: {
      id: 'gp',
      beziehung: 55,
      koalitionsvertragScore: 50,
      schluesselthemenErfuellt: [],
    },
    haushalt: {
      einnahmen: 300,
      pflichtausgaben: 300,
      laufendeAusgaben: 0,
      spielraum: 0,
      saldo: -5,
      saldoKumulativ: -10,
      konjunkturIndex: 0,
      steuerpolitikModifikator: 0,
      investitionsquote: 0,
      schuldenbremseAktiv: false,
      haushaltsplanMonat: 0,
      haushaltsplanBeschlossen: false,
      planPrioritaeten: [],
    },
    ...overrides,
  } as GameState;
}

describe('updateAgendaHistoryTrackers', () => {
  it('aggregiert Milieu-Zustimmung (min/max/sum/months)', () => {
    const s0 = baseState();
    const s1 = updateAgendaHistoryTrackers(s0, AGENDA_TRACKING_MEDIENKLIMA_SCHWELLE);
    expect(s1.milieuHistory?.m1).toEqual({ min: 40, max: 40, sum: 40, months: 1 });
    expect(s1.milieuHistory?.m2).toEqual({ min: 60, max: 60, sum: 60, months: 1 });

    const s2 = updateAgendaHistoryTrackers(
      { ...s1, milieuZustimmung: { m1: 35, m2: 70 } },
      AGENDA_TRACKING_MEDIENKLIMA_SCHWELLE,
    );
    expect(s2.milieuHistory?.m1).toEqual({ min: 35, max: 40, sum: 75, months: 2 });
    expect(s2.milieuHistory?.m2).toEqual({ min: 60, max: 70, sum: 130, months: 2 });
  });

  it('zählt Monate unter Medienklima-Schwelle', () => {
    const s = baseState({ medienklimaBelowMonths: 2 });
    const low = updateAgendaHistoryTrackers(s, AGENDA_TRACKING_MEDIENKLIMA_SCHWELLE - 1);
    expect(low.medienklimaBelowMonths).toBe(3);
    const high = updateAgendaHistoryTrackers(low, AGENDA_TRACKING_MEDIENKLIMA_SCHWELLE);
    expect(high.medienklimaBelowMonths).toBe(3);
  });

  it('zählt Chars mit Mood ≤ Schwelle pro Monat', () => {
    const s = baseState();
    const r = updateAgendaHistoryTrackers(s, 50);
    expect(r.charMoodHistory?.a).toBe(1);
    expect(r.charMoodHistory?.b).toBeUndefined();
    const r2 = updateAgendaHistoryTrackers(
      {
        ...r,
        chars: r.chars.map((c) => (c.id === 'b' ? { ...c, mood: AGENDA_TRACKING_CHAR_MOOD_MAX } : c)),
      },
      50,
    );
    expect(r2.charMoodHistory?.a).toBe(2);
    expect(r2.charMoodHistory?.b).toBe(1);
  });

  it('summiert Koalitionspartner-Beziehung', () => {
    const s = baseState();
    const r = updateAgendaHistoryTrackers(s, 50);
    expect(r.koalitionsbeziehungLegislatur).toEqual({ sum: 55, months: 1 });
    const r2 = updateAgendaHistoryTrackers(
      { ...r, koalitionspartner: { ...r.koalitionspartner!, beziehung: 45 } },
      50,
    );
    expect(r2.koalitionsbeziehungLegislatur).toEqual({ sum: 100, months: 2 });
  });

  it('ohne Koalitionspartner: kein koalitionsbeziehungLegislatur-Block', () => {
    const s = baseState({ koalitionspartner: undefined });
    const r = updateAgendaHistoryTrackers(s, 50);
    expect(r.koalitionsbeziehungLegislatur).toBeUndefined();
  });
});
