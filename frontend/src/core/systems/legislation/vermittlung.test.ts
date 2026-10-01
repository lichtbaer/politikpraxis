import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  kannVermitteln,
  vermittlungsausschuss,
  tickVermittlungsausschuss,
  berechneVermittlungsChancen,
  bundesratRuftVermittlungAn,
} from './vermittlung';
import * as rng from '../../rng';
import type { GameState, Law, BundesratFraktion } from '../../types';

function createMockState(overrides: Partial<GameState> = {}): GameState {
  return {
    month: 12,
    speed: 1,
    pk: 100,
    view: 'agenda',
    kpi: { al: 5, hh: 0, gi: 30, zf: 50 },
    kpiPrev: null,
    zust: { g: 52, arbeit: 58, mitte: 54, prog: 44 },
    coalition: 70,
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
    gameOver: false,
    won: false,
    tickLog: [],
    rngSeed: 12345,
    ...overrides,
  };
}

function createFraktion(id: string, beziehung: number): BundesratFraktion {
  return {
    id,
    name: id,
    sprecher: { name: '', partei: '', land: '', initials: '', color: '', bio: '' },
    laender: [],
    basisBereitschaft: 50,
    beziehung,
    tradeoffPool: [],
  };
}

function createBlockedLaw(id = 'ee'): Law {
  return {
    id,
    titel: 'EE-Beschleunigung',
    kurz: 'EE-Beschleunigung',
    desc: '',
    tags: ['bund', 'land'],
    status: 'blockiert',
    ja: 40,
    nein: 60,
    effekte: { al: -1, hh: -2, zf: 3, gi: -1 },
    lag: 4,
    expanded: false,
    route: null,
    rprog: 0,
    rdur: 0,
    blockiert: 'bundesrat',
  };
}

/** Gesetz nach Bundestagsbeschluss, wartet auf die Bundesratsabstimmung */
function createBtPassedLaw(overrides: Partial<Law> = {}): Law {
  return {
    ...createBlockedLaw(),
    status: 'bt_passed',
    blockiert: null,
    ja: 55,
    nein: 45,
    brVoteMonth: 13,
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('berechneVermittlungsChancen', () => {
  it('liefert einen offenen Ausgang bei neutraler Beziehung (~45/45/10)', () => {
    const state = createMockState({
      bundesratFraktionen: [createFraktion('a', 50), createFraktion('b', 50)],
    });
    const chancen = berechneVermittlungsChancen(state, 'ee');
    expect(chancen.erfolg).toBeCloseTo(0.45, 5);
    expect(chancen.scheitern).toBeCloseTo(0.45, 5);
    expect(chancen.kompromiss).toBeCloseTo(0.1, 5);
    expect(chancen.erfolg + chancen.kompromiss + chancen.scheitern).toBeCloseTo(1, 5);
  });

  it('verschiebt die Chancen Richtung Erfolg bei guter Beziehung', () => {
    const state = createMockState({
      bundesratFraktionen: [createFraktion('a', 90), createFraktion('b', 90)],
    });
    const chancen = berechneVermittlungsChancen(state, 'ee');
    expect(chancen.erfolg).toBeGreaterThan(0.6);
    expect(chancen.scheitern).toBeLessThan(0.3);
  });

  it('verschiebt die Chancen Richtung Scheitern bei schlechter Beziehung', () => {
    const state = createMockState({
      bundesratFraktionen: [createFraktion('a', 10), createFraktion('b', 10)],
    });
    const chancen = berechneVermittlungsChancen(state, 'ee');
    expect(chancen.scheitern).toBeGreaterThan(0.6);
    expect(chancen.erfolg).toBeLessThan(0.3);
  });

  it('senkt die Erfolgschance bei abgelehntem Trade-off-Angebot', () => {
    const law = { ...createBlockedLaw(), lobbyFraktionen: { a: { pkInvestiert: false, tradeoffAblehnen: true } } };
    const stateOhne = createMockState({ gesetze: [createBlockedLaw()], bundesratFraktionen: [createFraktion('a', 50)] });
    const stateMit = createMockState({ gesetze: [law], bundesratFraktionen: [createFraktion('a', 50)] });
    const chancenOhne = berechneVermittlungsChancen(stateOhne, 'ee');
    const chancenMit = berechneVermittlungsChancen(stateMit, 'ee');
    expect(chancenMit.erfolg).toBeLessThan(chancenOhne.erfolg);
    expect(chancenMit.scheitern).toBeGreaterThan(chancenOhne.scheitern);
  });

  it('nutzt einen neutralen Default-Score ohne Fraktionsdaten', () => {
    const state = createMockState({ bundesratFraktionen: [] });
    const chancen = berechneVermittlungsChancen(state, 'ee');
    expect(chancen.erfolg).toBeCloseTo(0.45, 5);
  });
});

describe('kannVermitteln', () => {
  it('erlaubt Vermittlung bei Bundesrat-Blockade', () => {
    const law = createBlockedLaw();
    const state = createMockState({ gesetze: [law] });
    expect(kannVermitteln(state, 'ee', 2)).toBe(true);
  });

  it('verweigert bei zu niedriger Komplexität', () => {
    const law = createBlockedLaw();
    const state = createMockState({ gesetze: [law] });
    expect(kannVermitteln(state, 'ee', 1)).toBe(false);
  });

  it('verweigert ohne Bundesrat-Blockade', () => {
    const law = { ...createBlockedLaw(), blockiert: null as null };
    const state = createMockState({ gesetze: [law] });
    expect(kannVermitteln(state, 'ee', 2)).toBe(false);
  });

  it('verweigert bei zu wenig PK', () => {
    const law = createBlockedLaw();
    const state = createMockState({ gesetze: [law], pk: 10 });
    expect(kannVermitteln(state, 'ee', 2)).toBe(false);
  });

  it('verweigert bei bereits aktiver Vermittlung', () => {
    const law = createBlockedLaw();
    const state = createMockState({
      gesetze: [law],
      vermittlungAktiv: { ee: 14 },
    });
    expect(kannVermitteln(state, 'ee', 2)).toBe(false);
  });
});

describe('vermittlungsausschuss', () => {
  it('startet Vermittlung und zieht PK ab', () => {
    const law = createBlockedLaw();
    const state = createMockState({ gesetze: [law], pk: 100 });

    const result = vermittlungsausschuss(state, 'ee', 2);

    expect(result.pk).toBe(80); // 100 - 20
    expect(result.vermittlungAktiv?.['ee']).toBe(14); // month 12 + 2
    expect(result.gesetze[0].blockiert).toBeNull();
    expect(result.log.length).toBeGreaterThan(0);
    expect(['erfolg', 'kompromiss', 'scheitern']).toContain(result.vermittlungAusgang?.['ee']);
  });

  it('würfelt den Ausgang bereits bei Einberufung aus (gekoppelt an nextRandom)', () => {
    const law = createBlockedLaw();
    const state = createMockState({ gesetze: [law], pk: 100, bundesratFraktionen: [createFraktion('a', 50)] });

    vi.spyOn(rng, 'nextRandom').mockReturnValue(0.01); // < erfolg-Wahrscheinlichkeit (0.45)
    const result = vermittlungsausschuss(state, 'ee', 2);
    expect(result.vermittlungAusgang?.['ee']).toBe('erfolg');
  });

  it('ändert nichts wenn Bedingungen nicht erfüllt', () => {
    const law = createBlockedLaw();
    const state = createMockState({ gesetze: [law], pk: 5 });

    const result = vermittlungsausschuss(state, 'ee', 2);
    expect(result).toBe(state);
  });
});

describe('tickVermittlungsausschuss', () => {
  it('beschließt Gesetz mit halben Effekten nach Frist', () => {
    const law = { ...createBlockedLaw(), status: 'eingebracht' as const, blockiert: null as null };
    const state = createMockState({
      month: 14,
      gesetze: [law],
      vermittlungAktiv: { ee: 14 },
    });

    const result = tickVermittlungsausschuss(state);

    expect(result.gesetze[0].status).toBe('beschlossen');
    // Effekte halbiert
    expect(result.gesetze[0].effekte.al).toBe(-0.5);
    expect(result.gesetze[0].effekte.hh).toBe(-1);
    expect(result.gesetze[0].effekte.zf).toBe(1.5);
    expect(result.gesetze[0].effekte.gi).toBe(-0.5);
    // Vermittlung abgeräumt
    expect(result.vermittlungAktiv).toBeUndefined();
    expect(result.vermittlungAusgang).toBeUndefined();
  });

  it('beschließt Gesetz mit vollen Effekten bei Ausgang "erfolg"', () => {
    const law = { ...createBlockedLaw(), status: 'eingebracht' as const, blockiert: null as null };
    const state = createMockState({
      month: 14,
      gesetze: [law],
      vermittlungAktiv: { ee: 14 },
      vermittlungAusgang: { ee: 'erfolg' },
    });

    const result = tickVermittlungsausschuss(state);

    expect(result.gesetze[0].status).toBe('beschlossen');
    expect(result.gesetze[0].wirkungFaktor).toBe(1);
    // Effekte unverändert (voller Erfolg)
    expect(result.gesetze[0].effekte).toEqual(law.effekte);
    expect(result.vermittlungAktiv).toBeUndefined();
    expect(result.vermittlungAusgang).toBeUndefined();
  });

  it('setzt Gesetz bei Ausgang "scheitern" zurück in die Bundesrat-Blockade, ohne Effekte', () => {
    const law = { ...createBlockedLaw(), status: 'eingebracht' as const, blockiert: null as null };
    const state = createMockState({
      month: 14,
      pk: 80,
      gesetze: [law],
      vermittlungAktiv: { ee: 14 },
      vermittlungAusgang: { ee: 'scheitern' },
    });

    const result = tickVermittlungsausschuss(state);

    expect(result.gesetze[0].status).toBe('blockiert');
    expect(result.gesetze[0].blockiert).toBe('bundesrat');
    // Keine Effekte angewendet, PK bleibt wie zuvor (nur die 20 PK der Einberufung waren bereits weg)
    expect(result.gesetze[0].effekte).toEqual(law.effekte);
    expect(result.pk).toBe(80);
    expect(result.vermittlungAktiv).toBeUndefined();
    expect(result.vermittlungAusgang).toBeUndefined();
    // Kann danach erneut versucht werden
    expect(kannVermitteln(result, 'ee', 2)).toBe(true);
  });

  it('lässt beim Einspruchsgesetz nach gescheiterter Vermittlung den Einspruch bestehen (überstimmbar)', () => {
    const law = { ...createBlockedLaw(), status: 'eingebracht' as const, blockiert: null as null, zustimmungspflichtig: false };
    const state = createMockState({
      month: 14,
      gesetze: [law],
      vermittlungAktiv: { ee: 14 },
      vermittlungAusgang: { ee: 'scheitern' },
    });

    const result = tickVermittlungsausschuss(state, { complexity: 4 });

    expect(result.gesetze[0].status).toBe('br_einspruch');
    expect(result.gesetze[0].blockiert).toBeNull();
    expect(result.gesetze[0].brEinspruchEingelegt).toBe(true);
  });

  it('behält den vorab gewürfelten Ausgang, solange die Frist noch läuft', () => {
    const law = { ...createBlockedLaw(), status: 'eingebracht' as const, blockiert: null as null };
    const state = createMockState({
      month: 13,
      gesetze: [law],
      vermittlungAktiv: { ee: 14 },
      vermittlungAusgang: { ee: 'erfolg' },
    });

    const result = tickVermittlungsausschuss(state);
    expect(result.vermittlungAusgang?.['ee']).toBe('erfolg');
  });

  it('wartet wenn Frist noch nicht erreicht', () => {
    const law = { ...createBlockedLaw(), status: 'eingebracht' as const, blockiert: null as null };
    const state = createMockState({
      month: 13,
      gesetze: [law],
      vermittlungAktiv: { ee: 14 },
    });

    const result = tickVermittlungsausschuss(state);

    expect(result.gesetze[0].status).toBe('eingebracht');
    expect(result.vermittlungAktiv?.['ee']).toBe(14);
  });

  it('gibt unveränderten State zurück ohne aktive Vermittlung', () => {
    const state = createMockState();
    expect(tickVermittlungsausschuss(state)).toBe(state);
  });

  it('benennt bei Scheitern die Fraktion mit der schlechtesten Beziehung als Blockiererin', () => {
    const law = { ...createBlockedLaw(), status: 'eingebracht' as const, blockiert: null as null };
    const state = createMockState({
      month: 14,
      gesetze: [law],
      vermittlungAktiv: { ee: 14 },
      vermittlungAusgang: { ee: 'scheitern' },
      bundesratFraktionen: [createFraktion('gut', 80), createFraktion('schlecht', 10)],
    });

    const result = tickVermittlungsausschuss(state);
    const letzterLogEintrag = result.log[result.log.length - 1];
    expect(letzterLogEintrag.msg).toContain('schlecht');
    expect(letzterLogEintrag.msg).toContain('blockiert weiterhin');
  });

  it('benennt bei Scheitern bevorzugt eine Fraktion, die ein Trade-off-Angebot abgelehnt hat', () => {
    const law = {
      ...createBlockedLaw(),
      status: 'eingebracht' as const,
      blockiert: null as null,
      lobbyFraktionen: { gut: { pkInvestiert: false, tradeoffAblehnen: true } },
    };
    const state = createMockState({
      month: 14,
      gesetze: [law],
      vermittlungAktiv: { ee: 14 },
      vermittlungAusgang: { ee: 'scheitern' },
      // 'gut' hat die bessere Beziehung, lehnte aber explizit einen Trade-off für dieses Gesetz ab
      bundesratFraktionen: [createFraktion('gut', 80), createFraktion('schlecht', 60)],
    });

    const result = tickVermittlungsausschuss(state);
    const letzterLogEintrag = result.log[result.log.length - 1];
    expect(letzterLogEintrag.msg).toContain('gut');
  });

  it('benennt bei vollem Erfolg die Fraktion mit der besten Beziehung als Vermittlerin', () => {
    const law = { ...createBlockedLaw(), status: 'eingebracht' as const, blockiert: null as null };
    const state = createMockState({
      month: 14,
      gesetze: [law],
      vermittlungAktiv: { ee: 14 },
      vermittlungAusgang: { ee: 'erfolg' },
      bundesratFraktionen: [createFraktion('gut', 80), createFraktion('schlecht', 10)],
    });

    const result = tickVermittlungsausschuss(state);
    const letzterLogEintrag = result.log[result.log.length - 1];
    expect(letzterLogEintrag.msg).toContain('gut');
    expect(letzterLogEintrag.msg).toContain('hat vermittelt');
  });

  it('benennt bei Kompromiss beide beteiligten Fraktionen', () => {
    const law = { ...createBlockedLaw(), status: 'eingebracht' as const, blockiert: null as null };
    const state = createMockState({
      month: 14,
      gesetze: [law],
      vermittlungAktiv: { ee: 14 },
      vermittlungAusgang: { ee: 'kompromiss' },
      bundesratFraktionen: [createFraktion('gut', 80), createFraktion('schlecht', 10)],
    });

    const result = tickVermittlungsausschuss(state);
    const letzterLogEintrag = result.log[result.log.length - 1];
    expect(letzterLogEintrag.msg).toContain('gut');
    expect(letzterLogEintrag.msg).toContain('schlecht');
  });

  it('fällt ohne Fraktionsdaten auf die generische Meldung zurück', () => {
    const law = { ...createBlockedLaw(), status: 'eingebracht' as const, blockiert: null as null };
    const state = createMockState({
      month: 14,
      gesetze: [law],
      vermittlungAktiv: { ee: 14 },
      vermittlungAusgang: { ee: 'scheitern' },
      bundesratFraktionen: [],
    });

    const result = tickVermittlungsausschuss(state);
    const letzterLogEintrag = result.log[result.log.length - 1];
    expect(letzterLogEintrag.msg).toBe('Vermittlungsausschuss: EE-Beschleunigung gescheitert — der Bundesrat bleibt bei seiner Ablehnung');
  });
});

describe('Vermittlungsausschuss auf Anrufung des Bundesrats (#276 AC3)', () => {
  const fraktionen = () => [createFraktion('ostblock', 10), createFraktion('mitte', 50)];

  function laufendeBrVermittlung(month: number, lawOverrides: Partial<Law> = {}): GameState {
    const start = createMockState({ gesetze: [createBtPassedLaw(lawOverrides)], bundesratFraktionen: fraktionen() });
    return { ...bundesratRuftVermittlungAn(start, 'ee', 'ostblock'), month };
  }

  describe('berechneVermittlungsChancen', () => {
    it('gewichtet die Beziehung zur anrufenden Fraktion zusätzlich', () => {
      const ohneAnrufer = createMockState({ bundesratFraktionen: fraktionen() });
      const mitAnrufer = createMockState({ bundesratFraktionen: fraktionen(), vermittlungAnrufer: { ee: 'ostblock' } });
      // Ø Beziehung 30 → Score 0.30; mit Anrufer (Beziehung 10) zur Hälfte → Score 0.20
      expect(berechneVermittlungsChancen(ohneAnrufer, 'ee').erfolg).toBeCloseTo(0.15 + 0.6 * 0.3, 5);
      expect(berechneVermittlungsChancen(mitAnrufer, 'ee').erfolg).toBeCloseTo(0.15 + 0.6 * 0.2, 5);
    });

    it('bessere Beziehung zur anrufenden Fraktion verbessert die Chancen', () => {
      const schlecht = createMockState({ bundesratFraktionen: fraktionen(), vermittlungAnrufer: { ee: 'ostblock' } });
      const besser = createMockState({
        bundesratFraktionen: [createFraktion('ostblock', 18), createFraktion('mitte', 50)],
        vermittlungAnrufer: { ee: 'ostblock' },
      });
      const cSchlecht = berechneVermittlungsChancen(schlecht, 'ee');
      const cBesser = berechneVermittlungsChancen(besser, 'ee');
      expect(cBesser.erfolg).toBeGreaterThan(cSchlecht.erfolg);
      expect(cBesser.scheitern).toBeLessThan(cSchlecht.scheitern);
    });
  });

  describe('bundesratRuftVermittlungAn', () => {
    it('startet die Vermittlung ohne PK-Kosten und verschiebt die BR-Abstimmung um 2 Monate', () => {
      const spy = vi.spyOn(rng, 'nextRandom');
      const state = createMockState({ gesetze: [createBtPassedLaw()], bundesratFraktionen: fraktionen(), pk: 30 });

      const result = bundesratRuftVermittlungAn(state, 'ee', 'ostblock');

      expect(result.pk).toBe(30);
      expect(result.gesetze[0].status).toBe('bt_passed');
      expect(result.gesetze[0].brVoteMonth).toBe(15); // bisher 13, +2
      expect(result.vermittlungAktiv?.['ee']).toBe(15);
      expect(result.vermittlungAnrufer?.['ee']).toBe('ostblock');
      // Ausgang wird erst bei Fristende gewürfelt
      expect(result.vermittlungAusgang?.['ee']).toBeUndefined();
      expect(spy).not.toHaveBeenCalled();
      expect(result.log[0].msg).toBe('game:bundesrat.logVermittlungAngerufen');
      expect(result.log[0].params).toEqual({ anrufer: 'ostblock', gesetz: 'EE-Beschleunigung', monate: 3 });
    });

    it('ignoriert Gesetze, die nicht auf die Bundesratsabstimmung warten', () => {
      const state = createMockState({ gesetze: [createBlockedLaw()] });
      expect(bundesratRuftVermittlungAn(state, 'ee', 'ostblock')).toBe(state);
    });

    it('ignoriert Gesetze, die bereits in Vermittlung sind', () => {
      const state = createMockState({ gesetze: [createBtPassedLaw()], vermittlungAktiv: { ee: 15 } });
      expect(bundesratRuftVermittlungAn(state, 'ee', 'ostblock')).toBe(state);
    });

    it('bietet dem Spieler währenddessen keine eigene Vermittlung an', () => {
      expect(kannVermitteln(laufendeBrVermittlung(13), 'ee', 4)).toBe(false);
    });
  });

  describe('tickVermittlungsausschuss', () => {
    it('wartet bis zur Frist, ohne zu würfeln, und behält den Anrufer', () => {
      const spy = vi.spyOn(rng, 'nextRandom');
      const result = tickVermittlungsausschuss(laufendeBrVermittlung(14));
      expect(spy).not.toHaveBeenCalled();
      expect(result.vermittlungAktiv?.['ee']).toBe(15);
      expect(result.vermittlungAnrufer?.['ee']).toBe('ostblock');
      expect(result.gesetze[0].status).toBe('bt_passed');
    });

    it('Einigung: Gesetz geht mit vollen Effekten erneut in den Bundesrat (Abstimmung im selben Monat)', () => {
      vi.spyOn(rng, 'nextRandom').mockReturnValue(0.01);
      const result = tickVermittlungsausschuss(laufendeBrVermittlung(15));

      expect(result.gesetze[0].status).toBe('bt_passed');
      expect(result.gesetze[0].brVoteMonth).toBe(15);
      expect(result.gesetze[0].effekte).toEqual(createBlockedLaw().effekte);
      expect(result.vermittlungAktiv).toBeUndefined();
      expect(result.vermittlungAnrufer).toBeUndefined();
      expect(result.log[0].msg).toBe('game:bundesrat.logVermittlungEinigung');
      expect(result.log[0].params).toEqual({ gesetz: 'EE-Beschleunigung', anrufer: 'ostblock' });
    });

    it('Kompromiss: Gesetz geht mit halben Effekten erneut in den Bundesrat', () => {
      const state = laufendeBrVermittlung(15);
      const chancen = berechneVermittlungsChancen(state, 'ee');
      vi.spyOn(rng, 'nextRandom').mockReturnValue(chancen.erfolg + chancen.kompromiss / 2);

      const result = tickVermittlungsausschuss(state);

      expect(result.gesetze[0].status).toBe('bt_passed');
      expect(result.gesetze[0].brVoteMonth).toBe(15);
      expect(result.gesetze[0].effekte).toEqual({ al: -0.5, hh: -1, zf: 1.5, gi: -0.5 });
      expect(result.gesetze[0].wirkungFaktor).toBe(0.5);
      expect(result.log[0].msg).toBe('game:bundesrat.logVermittlungKompromiss');
    });

    it('Scheitern beim Zustimmungsgesetz: Bundesrat verweigert die Zustimmung (Blockade)', () => {
      vi.spyOn(rng, 'nextRandom').mockReturnValue(0.99);
      const result = tickVermittlungsausschuss(laufendeBrVermittlung(15, { zustimmungspflichtig: true }), { complexity: 4 });

      expect(result.gesetze[0].status).toBe('blockiert');
      expect(result.gesetze[0].blockiert).toBe('bundesrat');
      expect(result.gesetze[0].effekte).toEqual(createBlockedLaw().effekte);
      expect(result.vermittlungAktiv).toBeUndefined();
      expect(result.vermittlungAnrufer).toBeUndefined();
      expect(result.log[0].msg).toBe('game:bundesrat.logVermittlungGescheitert');
      // Der Spieler kann danach selbst den Vermittlungsausschuss anrufen
      expect(kannVermitteln(result, 'ee', 4)).toBe(true);
    });

    it('Scheitern beim Einspruchsgesetz: Bundesrat legt Einspruch ein (vom Bundestag überstimmbar)', () => {
      vi.spyOn(rng, 'nextRandom').mockReturnValue(0.99);
      const result = tickVermittlungsausschuss(laufendeBrVermittlung(15, { zustimmungspflichtig: false }), { complexity: 4 });

      expect(result.gesetze[0].status).toBe('br_einspruch');
      expect(result.gesetze[0].blockiert).toBeNull();
      expect(result.gesetze[0].brEinspruchEingelegt).toBe(true);
      expect(result.log[0].msg).toBe('game:bundesrat.logVermittlungGescheitertEinspruch');
    });

    it('würfelt erst bei Fristende: zwischenzeitlich verbesserte Beziehungen zählen', () => {
      const state = laufendeBrVermittlung(15);
      const verbessert: GameState = {
        ...state,
        bundesratFraktionen: state.bundesratFraktionen.map(f => (f.id === 'ostblock' ? { ...f, beziehung: 60 } : f)),
      };
      const cSchlecht = berechneVermittlungsChancen(state, 'ee');
      const cBesser = berechneVermittlungsChancen(verbessert, 'ee');
      const einigungSchlecht = cSchlecht.erfolg + cSchlecht.kompromiss;
      expect(cBesser.erfolg).toBeGreaterThan(einigungSchlecht);
      // Wurf zwischen beiden Schwellen: nur mit verbesserter Beziehung eine Einigung
      vi.spyOn(rng, 'nextRandom').mockReturnValue((einigungSchlecht + cBesser.erfolg) / 2);

      expect(tickVermittlungsausschuss(state).gesetze[0].status).toBe('blockiert');
      expect(tickVermittlungsausschuss(verbessert).gesetze[0].status).toBe('bt_passed');
    });
  });
});
