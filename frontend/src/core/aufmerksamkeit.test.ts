import { describe, expect, it } from 'vitest';
import type { GameState, Law } from './types';
import { berechneAufmerksamkeit } from './aufmerksamkeit';
import {
  ALERT_MAX_ANZAHL,
  MIN_KOALITION_FORTGANG,
  MISSTRAUENSVOTUM_EVENT_MONATE,
  MISSTRAUENSVOTUM_KOALITION_SCHWELLE,
  MISSTRAUENSVOTUM_OPPOSITION_SCHWELLE,
} from './constants';

function law(over: Partial<Law> = {}): Law {
  return {
    id: 'law_a',
    titel: 'Gesetz A',
    kurz: 'GesetzA',
    desc: '',
    tags: ['bund'],
    status: 'entwurf',
    ja: 55,
    nein: 45,
    effekte: {},
    lag: 1,
    expanded: false,
    route: null,
    rprog: 0,
    rdur: 0,
    blockiert: null,
    ...over,
  };
}

/** Ruhiger Ausgangszustand: keine einzige Alert-Bedingung erfüllt. */
function baseState(over: Partial<GameState> = {}): GameState {
  return {
    month: 12,
    speed: 1,
    pk: 100,
    view: 'agenda',
    kpi: { al: 50, hh: 50, gi: 50, zf: 50 },
    kpiPrev: null,
    tickLog: [],
    zust: { g: 50, arbeit: 50, mitte: 50, prog: 50 },
    coalition: 70,
    chars: [],
    gesetze: [law()],
    eingebrachteGesetze: [],
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
    medienKlima: 55,
    lowApprovalMonths: 0,
    opposition: { staerke: 30, aktivesThema: null, letzterAngriff: 0 },
    ...over,
  } as GameState;
}

describe('berechneAufmerksamkeit', () => {
  it('meldet nichts, wenn keine Schwelle gerissen ist', () => {
    expect(berechneAufmerksamkeit(baseState(), 4)).toEqual([]);
  });

  it('meldet nichts mehr nach Spielende', () => {
    const state = baseState({ pk: 0, coalition: 10, gameOver: true });
    expect(berechneAufmerksamkeit(state, 4)).toEqual([]);
  });

  describe('PK-Knappheit', () => {
    it('warnt, sobald kein Gesetz mehr einbringbar ist', () => {
      const alerts = berechneAufmerksamkeit(baseState({ pk: 12 }), 4);
      const pk = alerts.find((a) => a.kategorie === 'pk');
      expect(pk?.stufe).toBe('warnung');
      expect(pk?.params?.pk).toBe(12);
    });

    it('eskaliert auf kritisch, wenn gar keine Aktion mehr bezahlbar ist', () => {
      const alerts = berechneAufmerksamkeit(baseState({ pk: 3 }), 4);
      expect(alerts.find((a) => a.kategorie === 'pk')?.stufe).toBe('kritisch');
    });

    it('schweigt bei ausreichendem PK-Vorrat', () => {
      const alerts = berechneAufmerksamkeit(baseState({ pk: 40 }), 4);
      expect(alerts.some((a) => a.kategorie === 'pk')).toBe(false);
    });
  });

  describe('Koalition', () => {
    it('warnt unterhalb der Instabilitätsschwelle', () => {
      const state = baseState({ coalition: MISSTRAUENSVOTUM_KOALITION_SCHWELLE - 1 });
      const alert = berechneAufmerksamkeit(state, 4).find((a) => a.kategorie === 'koalition');
      expect(alert?.stufe).toBe('warnung');
      expect(alert?.params?.grenze).toBe(MIN_KOALITION_FORTGANG);
    });

    it('eskaliert kurz vor dem Koalitionsbruch', () => {
      const alert = berechneAufmerksamkeit(baseState({ coalition: 18 }), 4)
        .find((a) => a.kategorie === 'koalition');
      expect(alert?.stufe).toBe('kritisch');
    });

    it('gilt auch auf Stufe 1, weil der Bruch dort ebenfalls das Spiel beendet', () => {
      const alerts = berechneAufmerksamkeit(baseState({ coalition: 18 }), 1);
      expect(alerts.some((a) => a.kategorie === 'koalition')).toBe(true);
    });
  });

  describe('Misstrauensvotum', () => {
    /** Oppositions-Stärke + instabile Koalition = reale Mehrheitsbasis (Art. 67 GG). */
    const bedrohlich = {
      coalition: MISSTRAUENSVOTUM_KOALITION_SCHWELLE - 5,
      opposition: { staerke: MISSTRAUENSVOTUM_OPPOSITION_SCHWELLE + 5, aktivesThema: null, letzterAngriff: 0 },
    };

    it('schweigt in den ersten sechs Monaten, weil die Engine dort nicht zählt', () => {
      const state = baseState({ ...bedrohlich, month: 6, lowApprovalMonths: 3 });
      expect(berechneAufmerksamkeit(state, 4).some((a) => a.kategorie === 'misstrauensvotum')).toBe(false);
    });

    it('warnt, sobald die Opposition eine Mehrheitsbasis hat', () => {
      const state = baseState({ ...bedrohlich, month: 10, lowApprovalMonths: 1 });
      const alert = berechneAufmerksamkeit(state, 4).find((a) => a.kategorie === 'misstrauensvotum');
      expect(alert?.stufe).toBe('warnung');
    });

    it('eskaliert, wenn der nächste Tick das Votum auslösen kann', () => {
      const state = baseState({
        ...bedrohlich,
        month: 14,
        lowApprovalMonths: MISSTRAUENSVOTUM_EVENT_MONATE - 1,
      });
      const alert = berechneAufmerksamkeit(state, 4).find((a) => a.kategorie === 'misstrauensvotum');
      expect(alert?.stufe).toBe('kritisch');
    });

    it('verschwindet, sobald die Mehrheitsbasis wegfällt', () => {
      const state = baseState({ month: 14, lowApprovalMonths: 3, coalition: 70 });
      expect(berechneAufmerksamkeit(state, 4).some((a) => a.kategorie === 'misstrauensvotum')).toBe(false);
    });

    it('steht über allen anderen Alerts', () => {
      const state = baseState({ ...bedrohlich, month: 14, lowApprovalMonths: 3, pk: 2 });
      expect(berechneAufmerksamkeit(state, 4)[0].kategorie).toBe('misstrauensvotum');
    });
  });

  describe('Blockade', () => {
    it('meldet ein bereits blockiertes Gesetz', () => {
      const state = baseState({
        gesetze: [law({ status: 'blockiert', blockiert: 'bundestag' })],
      });
      const alert = berechneAufmerksamkeit(state, 1).find((a) => a.kategorie === 'blockade');
      expect(alert?.stufe).toBe('warnung');
      expect(alert?.params?.gesetz).toBe('GesetzA');
    });

    it('zählt mehrere blockierte Gesetze zusammen', () => {
      const state = baseState({
        gesetze: [
          law({ id: 'a', status: 'blockiert', blockiert: 'bundestag' }),
          law({ id: 'b', status: 'br_einspruch' }),
        ],
      });
      const alert = berechneAufmerksamkeit(state, 3).find((a) => a.kategorie === 'blockade');
      expect(alert?.params?.anzahl).toBe(2);
    });

    it('warnt vor einem eingebrachten Gesetz ohne Mehrheit', () => {
      const state = baseState({
        gesetze: [law({ status: 'eingebracht', ja: 30, nein: 70 })],
        eingebrachteGesetze: [
          { gesetzId: 'law_a', eingebrachtMonat: 11, abstimmungMonat: 14, lagMonths: 3 },
        ],
      });
      const alert = berechneAufmerksamkeit(state, 4).find(
        (a) => a.id === 'blockade-prognose-law_a',
      );
      expect(alert?.stufe).toBe('kritisch');
      expect(alert?.params?.monate).toBe(2);
    });

    it('schweigt bei komfortabler Mehrheit', () => {
      const state = baseState({
        gesetze: [law({ status: 'eingebracht', ja: 80, nein: 20 })],
        eingebrachteGesetze: [
          { gesetzId: 'law_a', eingebrachtMonat: 11, abstimmungMonat: 14, lagMonths: 3 },
        ],
      });
      expect(berechneAufmerksamkeit(state, 4).some((a) => a.kategorie === 'blockade')).toBe(false);
    });
  });

  describe('Stufengerechte Reduktion', () => {
    it('zeigt auf Stufe 1 weniger Einträge als auf Stufe 4', () => {
      const over: Partial<GameState> = {
        month: 14,
        pk: 2,
        coalition: 18,
        lowApprovalMonths: 3,
        opposition: { staerke: MISSTRAUENSVOTUM_OPPOSITION_SCHWELLE + 5, aktivesThema: null, letzterAngriff: 0 },
        gesetze: [law({ status: 'blockiert', blockiert: 'bundestag' })],
      };
      const stufe1 = berechneAufmerksamkeit(baseState(over), 1);
      const stufe4 = berechneAufmerksamkeit(baseState(over), 4);

      expect(stufe1).toHaveLength(ALERT_MAX_ANZAHL[1]);
      expect(stufe4.length).toBeGreaterThan(stufe1.length);
      // Auch bei harter Kürzung bleibt das Dringendste sichtbar.
      expect(stufe1[0].stufe).toBe('kritisch');
    });
  });
});
