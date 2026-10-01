import { describe, expect, it } from 'vitest';
import {
  berechneSpielzielErgebnis,
  berechneWahlbonus,
  istLegislaturErfolg,
  legislaturMisserfolgGrund,
  agendaPflicht,
  SPIELZIEL_ERFOLG_SCHWELLE,
} from './spielziel';
import type { ContentBundle, GameState } from './types';

function minimalState(over: Partial<GameState> = {}): GameState {
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
    rngSeed: 1,
    gameOver: true,
    won: true,
    ...over,
  } as GameState;
}

const emptyContent = { agendaZiele: [], koalitionsZiele: [] } as unknown as ContentBundle;

describe('spielziel', () => {
  it('berechneWahlbonus: 0 unter Hürde, positiv klar darüber', () => {
    expect(berechneWahlbonus(39, 40)).toBe(0);
    expect(berechneWahlbonus(50, 40)).toBeGreaterThan(0);
  });

  it('Gewichtung: Bilanz+Urteil max, Agenda neutral 55 → ~84 Punkte', () => {
    const s = minimalState({
      gesetze: [
        {
          id: 'g1',
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
          langzeit_score: 10,
        },
      ],
    });
    const r = berechneSpielzielErgebnis(s, emptyContent, 100, 0);
    expect(r.urteilPunkte).toBe(100);
    expect(r.bilanzPunkte).toBe(100);
    expect(r.agendaPunkte).toBe(55);
    expect(r.gesamtpunkte).toBe(84);
  });

  const erfolg = (over: Partial<Parameters<typeof istLegislaturErfolg>[0]> = {}) => ({
    gesamtpunkte: SPIELZIEL_ERFOLG_SCHWELLE,
    beschlosseneGesetzeUrteil: 1,
    agendaSpielerErfuellt: 2,
    agendaSpielerGesamt: 2,
    ...over,
  });

  it('istLegislaturErfolg nutzt die Schwelle', () => {
    for (const stufe of [1, 2, 3, 4]) {
      expect(istLegislaturErfolg(erfolg(), stufe)).toBe(true);
      expect(istLegislaturErfolg(erfolg({ gesamtpunkte: SPIELZIEL_ERFOLG_SCHWELLE - 0.1 }), stufe)).toBe(false);
    }
  });

  it('ohne ein beschlossenes Gesetz kein Erfolg — auch mit vollen Punkten (#267)', () => {
    for (const stufe of [1, 2, 3, 4]) {
      expect(istLegislaturErfolg(erfolg({ gesamtpunkte: 100, beschlosseneGesetzeUrteil: 0 }), stufe)).toBe(false);
    }
  });

  it('Stufe 1 verlangt die komplette Spieler-Agenda, ab Stufe 2 nicht (#267)', () => {
    const teilweise = erfolg({ gesamtpunkte: 90, agendaSpielerErfuellt: 1 });
    expect(istLegislaturErfolg(teilweise, 1)).toBe(false);
    expect(istLegislaturErfolg(teilweise, 2)).toBe(true);
    expect(agendaPflicht(1)).toBe(true);
    expect(agendaPflicht(2)).toBe(false);
    expect(agendaPflicht(undefined)).toBe(false);
  });

  describe('legislaturMisserfolgGrund (#482)', () => {
    it('null bei erfolgreicher Legislatur (auf jeder Stufe)', () => {
      for (const stufe of [1, 2, 3, 4]) {
        expect(legislaturMisserfolgGrund(erfolg(), stufe)).toBeNull();
      }
    });

    it('kein_gesetz: kein einziges beschlossenes Gesetz', () => {
      expect(legislaturMisserfolgGrund(erfolg({ gesamtpunkte: 100, beschlosseneGesetzeUrteil: 0 }), 3)).toBe(
        'kein_gesetz',
      );
    });

    it('agenda: nur mit Agenda-Pflicht (Stufe 1) und unerfüllter Spieler-Agenda', () => {
      const teilweise = erfolg({ gesamtpunkte: 90, agendaSpielerErfuellt: 1 });
      expect(legislaturMisserfolgGrund(teilweise, 1)).toBe('agenda');
      expect(legislaturMisserfolgGrund(teilweise, 2)).toBeNull();
    });

    it('punkte: Gesamtpunkte unter der Erfolgsschwelle', () => {
      for (const stufe of [1, 2, 3, 4]) {
        expect(legislaturMisserfolgGrund(erfolg({ gesamtpunkte: SPIELZIEL_ERFOLG_SCHWELLE - 0.1 }), stufe)).toBe(
          'punkte',
        );
      }
    });

    it('Reihenfolge: kein_gesetz vor agenda vor punkte', () => {
      const allesVerfehlt = erfolg({ gesamtpunkte: 10, beschlosseneGesetzeUrteil: 0, agendaSpielerErfuellt: 0 });
      expect(legislaturMisserfolgGrund(allesVerfehlt, 1)).toBe('kein_gesetz');
      const agendaUndPunkte = erfolg({ gesamtpunkte: 10, agendaSpielerErfuellt: 0 });
      expect(legislaturMisserfolgGrund(agendaUndPunkte, 1)).toBe('agenda');
      expect(legislaturMisserfolgGrund(agendaUndPunkte, 2)).toBe('punkte');
    });

    it('istLegislaturErfolg ist genau dann wahr, wenn es keinen Misserfolgsgrund gibt', () => {
      const faelle = [
        erfolg(),
        erfolg({ beschlosseneGesetzeUrteil: 0 }),
        erfolg({ agendaSpielerErfuellt: 0 }),
        erfolg({ gesamtpunkte: 0 }),
      ];
      for (const fall of faelle) {
        for (const stufe of [undefined, 1, 2, 3, 4]) {
          expect(istLegislaturErfolg(fall, stufe)).toBe(legislaturMisserfolgGrund(fall, stufe) === null);
        }
      }
    });
  });

  it('Agenda: jedes Ziel zählt gleich — ein Koalitionsziel wiegt nicht die ganze Spieler-Agenda auf', () => {
    const content = {
      agendaZiele: [
        { id: 'a1', kategorie: 'gesetzgebung', titel: 'A1', beschreibung: '', min_complexity: 1, bedingung_typ: 'gesetz_anzahl_beschlossen', bedingung_param: { min_beschlossen: 5 } },
        { id: 'a2', kategorie: 'gesetzgebung', titel: 'A2', beschreibung: '', min_complexity: 1, bedingung_typ: 'gesetz_anzahl_beschlossen', bedingung_param: { min_beschlossen: 6 } },
      ],
      koalitionsZiele: [
        { id: 'k1', partner_profil: 'gp', titel: 'K1', beschreibung: '', min_complexity: 1, bedingung_typ: 'gesetz_politikfeld', bedingung_param: { politikfeld_id: 'umwelt_energie', min_beschlossen: 0 } },
      ],
    } as unknown as ContentBundle;
    const s = minimalState({ spielerAgenda: ['a1', 'a2'], koalitionsAgenda: ['k1'] });
    const r = berechneSpielzielErgebnis(s, content, 50, 0);
    // zwei rote Spielerziele (15) + ein grünes Koalitionsziel (100) → (15+15+100)/3 ≈ 43, nicht (15+100)/2
    expect(r.agendaPunkte).toBe(43);
  });
});
