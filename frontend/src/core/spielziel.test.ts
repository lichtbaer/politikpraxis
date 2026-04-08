import { describe, expect, it } from 'vitest';
import {
  berechneSpielzielErgebnis,
  berechneWahlbonus,
  istLegislaturErfolg,
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

  it('istLegislaturErfolg nutzt Schwelle', () => {
    expect(istLegislaturErfolg(SPIELZIEL_ERFOLG_SCHWELLE)).toBe(true);
    expect(istLegislaturErfolg(SPIELZIEL_ERFOLG_SCHWELLE - 0.1)).toBe(false);
  });
});
