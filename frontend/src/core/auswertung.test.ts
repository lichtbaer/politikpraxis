import { describe, expect, it } from 'vitest';
import {
  berechneHistorischesUrteilKontext,
  berechneLegislaturBewertung,
  berechneTitel,
  berechneTopPolitikfeld,
} from './auswertung';
import type { GameState, Law } from './types';

function baseLaw(over: Partial<Law> = {}): Law {
  return {
    id: 'g1',
    titel: 'Testgesetz',
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
    ...over,
  } as Law;
}

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

  it('berechneHistorischesUrteilKontext: keine Gesetze → alles leer', () => {
    const k = berechneHistorischesUrteilKontext(baseState({ gesetze: [] }));
    expect(k.anzahlGesetze).toBe(0);
    expect(k.topLaw).toBeNull();
    expect(k.bottomLaw).toBeNull();
  });

  it('berechneHistorischesUrteilKontext: ein Gesetz → topLaw gesetzt, kein Kontrapunkt', () => {
    const k = berechneHistorischesUrteilKontext(
      baseState({ gesetze: [baseLaw({ id: 'g1', titel: 'Klimawende', langzeit_score: 9 })] }),
    );
    expect(k.anzahlGesetze).toBe(1);
    expect(k.topLaw).toEqual({ id: 'g1', titel: 'Klimawende', score: 9 });
    expect(k.bottomLaw).toBeNull();
  });

  it('berechneHistorischesUrteilKontext: großer Score-Abstand → bottomLaw als Kontrapunkt', () => {
    const k = berechneHistorischesUrteilKontext(
      baseState({
        gesetze: [
          baseLaw({ id: 'g1', titel: 'Klimawende', langzeit_score: 9 }),
          baseLaw({ id: 'g2', titel: 'Sparpaket', langzeit_score: 2 }),
        ],
      }),
    );
    expect(k.topLaw?.id).toBe('g1');
    expect(k.bottomLaw?.id).toBe('g2');
  });

  it('berechneHistorischesUrteilKontext: knapper Score-Abstand → kein Kontrapunkt', () => {
    const k = berechneHistorischesUrteilKontext(
      baseState({
        gesetze: [
          baseLaw({ id: 'g1', titel: 'Klimawende', langzeit_score: 8 }),
          baseLaw({ id: 'g2', titel: 'Sparpaket', langzeit_score: 7 }),
        ],
      }),
    );
    expect(k.bottomLaw).toBeNull();
  });

  it('berechneHistorischesUrteilKontext: reformTiefe/stabilitaet aus Legislatur-Bilanz', () => {
    const k = berechneHistorischesUrteilKontext(
      baseState({
        gesetze: [baseLaw({ langzeit_score: 6 })],
        legislaturBilanz: {
          gesetzeBeschlossen: 1,
          politikfelderAbgedeckt: 1,
          haushaltsaldo: 0,
          koalitionsvertragErfuellt: 0.5,
          reformStaerke: 'moderat',
          stabilitaet: 'turbulent',
          wirtschaftsBilanz: 'neutral',
          medienbilanz: 'gemischt',
          kernthemen: [],
          schwachstellen: [],
          glaubwuerdigkeitsBonus: 0,
          reformTiefe: 'tief',
        },
      }),
    );
    expect(k.reformTiefe).toBe('tief');
    expect(k.stabilitaet).toBe('turbulent');
  });
});
