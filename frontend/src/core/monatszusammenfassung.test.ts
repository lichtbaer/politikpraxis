import { describe, expect, it } from 'vitest';
import type { ContentBundle, GameState } from './types';
import { berechneMonatsDiff, berechneTopUrsachen } from './monatszusammenfassung';
import { DEFAULT_MEDIEN_AKTEURE } from '../data/defaults/medienAkteure';

function minimalContent(): ContentBundle {
  return {
    characters: [],
    events: [],
    charEvents: {},
    laws: [
      {
        id: 'law_a',
        titel: 'A',
        kurz: 'LawA',
        desc: '',
        tags: ['bund'],
        status: 'beschlossen',
        ja: 55,
        nein: 45,
        effekte: {},
        lag: 1,
        expanded: false,
        route: null,
        rprog: 0,
        rdur: 0,
        blockiert: null,
      },
    ],
    bundesrat: [],
    scenario: {
      id: 't',
      name: 't',
      startMonth: 1,
      startPK: 100,
      startKPI: { al: 50, hh: 50, gi: 50, zf: 50 },
      startCoalition: 50,
    },
    medienAkteureContent: DEFAULT_MEDIEN_AKTEURE,
  };
}

function baseState(over: Partial<GameState> = {}): GameState {
  const c = minimalContent();
  return {
    month: 5,
    speed: 1,
    pk: 100,
    view: 'agenda',
    kpi: { al: 50, hh: 50, gi: 50, zf: 50 },
    kpiPrev: null,
    tickLog: [],
    zust: { g: 50, arbeit: 50, mitte: 50, prog: 50 },
    coalition: 50,
    chars: [],
    gesetze: c.laws.map((l) => ({ ...l, status: 'entwurf' as const })),
    bundesrat: [],
    bundesratFraktionen: [],
    activeEvent: null,
    firedEvents: [],
    firedCharEvents: [],
    firedBundesratEvents: [],
    firedKommunalEvents: [],
    pending: [],
    log: [],
    ticker: '',
    gameOver: false,
    won: false,
    medienKlima: 50,
    haushalt: {
      einnahmen: 100,
      pflichtausgaben: 50,
      laufendeAusgaben: 30,
      spielraum: 20,
      saldo: -10,
      saldoKumulativ: 0,
      konjunkturIndex: 0,
      steuerpolitikModifikator: 0,
      investitionsquote: 0,
      schuldenbremseAktiv: true,
      haushaltsplanMonat: 0,
      haushaltsplanBeschlossen: false,
      planPrioritaeten: [],
    },
    milieuZustimmung: { postmaterielle: 50, etablierte: 48 },
    medienAkteure: {
      boulevard: { stimmung: 0, reichweite: 25 },
      social: { stimmung: 0, reichweite: 20 },
    },
    ...over,
  } as GameState;
}

describe('berechneMonatsDiff', () => {
  it('erkennt neu beschlossenes Gesetz', () => {
    const vor = baseState();
    const nach = {
      ...vor,
      month: 6,
      gesetze: vor.gesetze.map((g) =>
        g.id === 'law_a' ? { ...g, status: 'beschlossen' as const } : g,
      ),
      zust: { ...vor.zust, g: 52 },
    };
    const diff = berechneMonatsDiff(vor, nach, minimalContent());
    expect(diff.monat).toBe(6);
    expect(diff.beschlosseneGesetze).toContain('law_a');
    expect(diff.wahlprognose_delta).toBe(2);
  });

  it('sammelt Milieu-Deltas ab Schwelle 2', () => {
    const vor = baseState();
    const nach = {
      ...vor,
      month: 6,
      milieuZustimmung: { postmaterielle: 53, etablierte: 48 },
    };
    const diff = berechneMonatsDiff(vor, nach, minimalContent());
    expect(diff.milieu_deltas.postmaterielle).toBe(3);
    expect(diff.milieu_deltas.etablierte).toBeUndefined();
  });

  it('baut Medien-Highlights aus Akteur-Stimmung', () => {
    const vor = baseState();
    const nach = {
      ...vor,
      month: 6,
      medienAkteure: {
        boulevard: { stimmung: 5, reichweite: 25 },
        social: { stimmung: -3, reichweite: 20 },
      },
    };
    const diff = berechneMonatsDiff(vor, nach, minimalContent());
    expect(diff.medien_highlights.length).toBeGreaterThan(0);
    expect(diff.medien_highlights[0].delta).toBe(5);
    expect(diff.medien_highlights[0].spieler_perspektive).toBe('positiv');
    expect(diff.medien_highlights[0].delta_bedeutung).toBe('stimmung');
  });

  it('SMA-407: Alternativ nutzt Reichweite-Delta; Plus = schlecht für Spieler', () => {
    const content = minimalContent();
    const vor = baseState({
      medienAkteure: {
        boulevard: { stimmung: 0, reichweite: 25 },
        social: { stimmung: 0, reichweite: 20 },
        oeffentlich: { stimmung: 0, reichweite: 35 },
        qualitaet: { stimmung: 0, reichweite: 15 },
        konservativ: { stimmung: 0, reichweite: 10 },
        alternativ: { stimmung: 0, reichweite: 5 },
      },
    });
    const nach = {
      ...vor,
      month: 6,
      medienAkteure: {
        ...vor.medienAkteure!,
        alternativ: { stimmung: 0, reichweite: 6 },
      },
    };
    const diff = berechneMonatsDiff(vor, nach, content);
    const alt = diff.medien_highlights.find((h) => h.akteurId === 'alternativ');
    expect(alt).toBeDefined();
    expect(alt!.delta).toBe(1);
    expect(alt!.delta_bedeutung).toBe('reichweite');
    expect(alt!.spieler_perspektive).toBe('negativ');
  });
});

describe('berechneTopUrsachen (Issue #209)', () => {
  it('aggregiert tickLog-Einträge gleicher Quelle+KPI', () => {
    const vor = baseState();
    const nach = {
      ...vor,
      month: 6,
      tickLog: [
        { source: 'Gesetzwirkung', target: 'hh' as const, delta: 2 },
        { source: 'Gesetzwirkung', target: 'hh' as const, delta: 1.5 },
      ],
    };
    const diff = berechneMonatsDiff(vor, nach, minimalContent());
    const gw = diff.topUrsachen.filter(
      (u) => u.kategorie === 'gesetzwirkung' && u.kpi === 'hh',
    );
    expect(gw).toHaveLength(1);
    expect(gw[0].delta).toBe(3.5);
    expect(gw[0].art).toBe('zahl');
    expect(gw[0].gewicht).toBe(3.5);
  });

  it('sortiert nach Gewicht absteigend (größte Änderung zuerst)', () => {
    const vor = baseState();
    const nach = {
      ...vor,
      month: 6,
      zust: { ...vor.zust, g: 55 }, // wahlprognose +5
      tickLog: [
        { source: 'Gesetzwirkung', target: 'hh' as const, delta: 3 },
        { source: 'Haushalt & Konjunktur', target: 'zf' as const, delta: -2 },
      ],
    };
    const diff = berechneMonatsDiff(vor, nach, minimalContent());
    expect(diff.topUrsachen[0].kategorie).toBe('zustimmung');
    expect(diff.topUrsachen[0].delta).toBe(5);
    const gewichte = diff.topUrsachen.map((u) => u.gewicht);
    expect(gewichte).toEqual([...gewichte].sort((a, b) => b - a));
  });

  it('filtert High-Level-Deltas unterhalb der Schwelle', () => {
    const vor = baseState();
    const nach = { ...vor, month: 6, zust: { ...vor.zust, g: 51 } }; // +1 < Schwelle 2
    const diff = berechneMonatsDiff(vor, nach, minimalContent());
    expect(diff.topUrsachen.some((u) => u.kategorie === 'zustimmung')).toBe(false);
  });

  it('erfasst narrative Events als art "narrativ"', () => {
    const vor = baseState({ firedEvents: [] });
    const nach = { ...vor, month: 6, firedEvents: ['ev_streik'] };
    const diff = berechneMonatsDiff(vor, nach, minimalContent());
    const ev = diff.topUrsachen.find((u) => u.kategorie === 'event');
    expect(ev).toBeDefined();
    expect(ev!.art).toBe('narrativ');
    expect(ev!.refId).toBe('ev_streik');
  });

  it('engineDiagnostics-Einträge landen nicht in topUrsachen (keine tickLog-Einträge mehr)', () => {
    // Engine-Fehler werden seit #219 über engineDiagnostics kommuniziert, nicht als Null-Delta im tickLog.
    // Defensiver Schutz: alte Save-Daten mit Engine-Fehler-Einträgen im tickLog werden trotzdem ignoriert.
    const nach = baseState({
      tickLog: [{ source: 'Engine-Fehler: foo', target: 'zf', delta: 0 }],
      engineDiagnostics: [{ month: 6, phase: 'testPhase', system: 'foo', level: 'error' }],
    });
    const diff = berechneMonatsDiff(baseState(), { ...nach, month: 6 }, minimalContent());
    expect(diff.topUrsachen).toHaveLength(0);
  });

  it('liefert bei ruhigem Monat eine leere Ursachenliste', () => {
    const vor = baseState();
    const nach = { ...vor, month: 6 };
    const diff = berechneMonatsDiff(vor, nach, minimalContent());
    expect(diff.topUrsachen).toHaveLength(0);
  });

  it('berechneTopUrsachen ist direkt aufrufbar', () => {
    const nach = baseState({
      tickLog: [{ source: 'Konjunkturdrift', target: 'al', delta: 2 }],
    });
    const diff = berechneMonatsDiff(baseState(), { ...nach, month: 6 }, minimalContent());
    const direkt = berechneTopUrsachen({ ...nach, month: 6 }, diff);
    expect(direkt.some((u) => u.kategorie === 'konjunktur' && u.kpi === 'al')).toBe(true);
  });
});
