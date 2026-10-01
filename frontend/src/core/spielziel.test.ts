import { describe, expect, it } from 'vitest';
import {
  berechneSpielzielErgebnis,
  berechneWahlbonus,
  istLegislaturErfolg,
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
