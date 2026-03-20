import { describe, expect, it } from 'vitest';
import { berechneLegislaturBewertung, berechneTitel, berechneTopPolitikfeld } from './auswertung';
import type { GameState } from './types';

function baseState(over: Partial<GameState> = {}): GameState {
  return {
    month: 48,
    speed: 0,
    pk: 50,
    view: 'agenda',
    kpi: { al: 5, hh: 0, gi: 32, zf: 50 },
    kpiPrev: null,
    tickLog: [],
    zust: { g: 50, arbeit: 50, mitte: 50, prog: 50 },
    coalition: 60,
    chars: [],
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
    gameOver: true,
    won: true,
    haushalt: {
      einnahmen: 300,
      pflichtausgaben: 200,
      laufendeAusgaben: 50,
      spielraum: 50,
      saldo: -10,
      saldoKumulativ: -40,
      konjunkturIndex: 100,
      steuerpolitikModifikator: 0,
      investitionsquote: 0,
      schuldenbremseAktiv: true,
      haushaltsplanMonat: 1,
      haushaltsplanBeschlossen: true,
      planPrioritaeten: [],
    },
    koalitionspartner: {
      id: 'gp',
      beziehung: 70,
      koalitionsvertragScore: 65,
      schluesselthemenErfuellt: [],
    },
    milieuZustimmung: { postmaterielle: 55, soziale_mitte: 50 },
    milieuZustimmungHistory: { postmaterielle: [48, 55], soziale_mitte: [49, 50] },
    medienKlima: 55,
    legislaturBilanz: {
      gesetzeBeschlossen: 5,
      politikfelderAbgedeckt: 3,
      haushaltsaldo: -10,
      koalitionsvertragErfuellt: 0.7,
      reformStaerke: 'moderat',
      stabilitaet: 'stabil',
      wirtschaftsBilanz: 'neutral',
      medienbilanz: 'gemischt',
      kernthemen: [],
      schwachstellen: [],
      glaubwuerdigkeitsBonus: 0,
    },
    ...over,
  } as GameState;
}

describe('auswertung', () => {
  it('berechneLegislaturBewertung liefert Note und Dimensionen', () => {
    const b = berechneLegislaturBewertung(baseState());
    expect(['A', 'B', 'C', 'D', 'F']).toContain(b.gesamtnote);
    expect(b.dimensionen.demokratie).toBeGreaterThanOrEqual(0);
    expect(b.dimensionen.demokratie).toBeLessThanOrEqual(100);
  });

  it('berechneTitel gibt einen String', () => {
    const t = berechneTitel(baseState());
    expect(typeof t).toBe('string');
    expect(t.length).toBeGreaterThan(3);
  });

  it('berechneTopPolitikfeld null ohne Gesetze', () => {
    expect(berechneTopPolitikfeld(baseState())).toBeNull();
  });
});
