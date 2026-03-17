import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  startKommunalPilot,
  startLaenderPilot,
  abbrechenVorstufe,
  tickGesetzVorstufen,
  getVorstufenBoni,
} from './gesetzLebenszyklus';
import type { GameState, Law, BundesratFraktion, ContentBundle } from '../types';

function createMockState(overrides: Partial<GameState> = {}): GameState {
  const gesetz: Law = {
    id: 'ee',
    titel: 'Energiewende',
    kurz: 'EE',
    desc: '',
    tags: ['bund'],
    status: 'entwurf',
    ja: 55,
    nein: 45,
    effekte: {},
    lag: 2,
    expanded: false,
    route: null,
    rprog: 0,
    rdur: 0,
    blockiert: null,
    kommunal_pilot_moeglich: true,
    laender_pilot_moeglich: true,
    eu_initiative_moeglich: true,
  };

  const fraktion: BundesratFraktion = {
    id: 'koalition',
    name: 'Koalition',
    laender: ['BY', 'NW'],
    basisBereitschaft: 60,
    beziehung: 70,
    tradeoffPool: [],
    sprecher: { name: 'Test', partei: 'CDU', land: 'BY', initials: 'T', color: '#000', bio: '' },
  };

  return {
    month: 1,
    speed: 0,
    pk: 100,
    view: 'agenda',
    kpi: { al: 5, hh: 0, gi: 50, zf: 50 },
    kpiPrev: null,
    zust: { g: 52, arbeit: 58, mitte: 54, prog: 44 },
    coalition: 70,
    chars: [],
    gesetze: [gesetz],
    bundesrat: [],
    bundesratFraktionen: [fraktion],
    activeEvent: null,
    firedEvents: [],
    firedCharEvents: [],
    firedBundesratEvents: [],
    pending: [],
    log: [],
    ticker: '',
    gameOver: false,
    won: false,
    ...overrides,
  } as GameState;
}

const mockContent: ContentBundle = {
  characters: [],
  events: [],
  charEvents: {},
  bundesratEvents: [],
  laws: [],
  bundesrat: [],
  bundesratFraktionen: [],
  milieus: [],
  politikfelder: [],
  verbaende: [],
  scenario: { id: 's1', name: 'Test', startMonth: 1, startPK: 100, startKPI: { al: 5, hh: 0, gi: 50, zf: 50 }, startCoalition: 70 },
};

describe('gesetzLebenszyklus', () => {
  afterEach(() => vi.restoreAllMocks());
  describe('startKommunalPilot', () => {
    it('erstellt GesetzProjekt und verbraucht 8 PK', () => {
      const state = createMockState();
      const next = startKommunalPilot(state, 'ee', 'progressiv', undefined, 2);
      expect(next.pk).toBe(92);
      expect(next.gesetzProjekte?.['ee']).toBeDefined();
      expect(next.gesetzProjekte!['ee'].aktiveVorstufen).toHaveLength(1);
      expect(next.gesetzProjekte!['ee'].aktiveVorstufen[0].typ).toBe('kommunal');
      expect(next.gesetzProjekte!['ee'].aktiveVorstufen[0].stadttyp).toBe('progressiv');
    });

    it('lehnt ab wenn kommunal_pilot_moeglich false', () => {
      const state = createMockState({
        gesetze: [{ ...createMockState().gesetze[0], kommunal_pilot_moeglich: false }],
      });
      const next = startKommunalPilot(state, 'ee', 'progressiv', undefined, 2);
      expect(next).toBe(state);
    });
  });

  describe('startLaenderPilot', () => {
    it('erstellt Länder-Vorstufe mit Fraktion', () => {
      const state = createMockState();
      const next = startLaenderPilot(state, 'ee', 'koalition', 2);
      expect(next.pk).toBe(88);
      expect(next.gesetzProjekte?.['ee'].aktiveVorstufen[0].typ).toBe('laender');
      expect(next.gesetzProjekte!['ee'].aktiveVorstufen[0].fraktionId).toBe('koalition');
    });
  });

  describe('getVorstufenBoni', () => {
    it('gibt Default-Boni wenn kein GesetzProjekt', () => {
      const state = createMockState();
      const boni = getVorstufenBoni(state, 'ee');
      expect(boni.btStimmenBonus).toBe(0);
      expect(boni.pkKostenRabatt).toBe(0);
      expect(boni.bundesratBonus).toBe(0);
    });

    it('gibt akkumulierte Boni aus GesetzProjekt', () => {
      const state = createMockState({
        gesetzProjekte: {
          ee: {
            gesetzId: 'ee',
            status: 'vorbereitung',
            aktiveVorstufen: [],
            boni: {
              btStimmenBonus: 10,
              pkKostenRabatt: 5,
              kofinanzierung: 0.1,
              bundesratBonus: 0,
              medienRueckhalt: 2,
            },
          },
        },
      });
      const boni = getVorstufenBoni(state, 'ee');
      expect(boni.btStimmenBonus).toBe(10);
      expect(boni.pkKostenRabatt).toBe(5);
    });
  });

  describe('Bonus-Akkumulation und Caps', () => {
    it('tickGesetzVorstufen löst Vorstufe bei fortschritt 100 und akkumuliert Boni', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5); // < 0.8 erfolgschance = Erfolg

      const state = createMockState({
        month: 5,
        gesetzProjekte: {
          ee: {
            gesetzId: 'ee',
            status: 'vorbereitung',
            aktiveVorstufen: [
              {
                typ: 'kommunal',
                startMonat: 1,
                dauerMonate: 4,
                fortschritt: 0,
                erfolgschance: 0.8,
                abgeschlossen: false,
                stadttyp: 'progressiv',
              },
            ],
            boni: { btStimmenBonus: 0, pkKostenRabatt: 0, kofinanzierung: 0, bundesratBonus: 0, medienRueckhalt: 0 },
          },
        },
      });

      const next = tickGesetzVorstufen(state, mockContent, 2);
      expect(next.gesetzProjekte?.['ee'].aktiveVorstufen[0].abgeschlossen).toBe(true);
      expect(next.gesetzProjekte?.['ee'].aktiveVorstufen[0].ergebnis).toBe('erfolg');
      expect(next.gesetzProjekte?.['ee'].boni.btStimmenBonus).toBe(8);
      expect(next.gesetzProjekte?.['ee'].boni.pkKostenRabatt).toBe(4);

      vi.restoreAllMocks();
    });

    it('Cap-Logik: btStimmenBonus max 25, pkKostenRabatt max 18', () => {
      const state = createMockState({
        gesetzProjekte: {
          ee: {
            gesetzId: 'ee',
            status: 'vorbereitung',
            aktiveVorstufen: [],
            boni: {
              btStimmenBonus: 20,
              pkKostenRabatt: 15,
              kofinanzierung: 0.3,
              bundesratBonus: 30,
              medienRueckhalt: 2,
            },
          },
        },
      });
      const boni = getVorstufenBoni(state, 'ee');
      expect(boni.btStimmenBonus).toBeLessThanOrEqual(25);
      expect(boni.pkKostenRabatt).toBeLessThanOrEqual(18);
    });
  });

  describe('abbrechenVorstufe', () => {
    it('markiert Vorstufe als abgebrochen', () => {
      const state = createMockState({
        gesetzProjekte: {
          ee: {
            gesetzId: 'ee',
            status: 'vorbereitung',
            aktiveVorstufen: [
              {
                typ: 'kommunal',
                startMonat: 1,
                dauerMonate: 4,
                fortschritt: 50,
                erfolgschance: 0.8,
                abgeschlossen: false,
                stadttyp: 'progressiv',
              },
            ],
            boni: { btStimmenBonus: 0, pkKostenRabatt: 0, kofinanzierung: 0, bundesratBonus: 0, medienRueckhalt: 0 },
          },
        },
      });
      const next = abbrechenVorstufe(state, 'ee', 'kommunal');
      expect(next.gesetzProjekte?.['ee'].aktiveVorstufen[0].abgeschlossen).toBe(true);
      expect(next.gesetzProjekte?.['ee'].aktiveVorstufen[0].ergebnis).toBe('scheitern');
    });
  });
});
