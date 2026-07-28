import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  kannVermitteln,
  vermittlungsausschuss,
  tickVermittlungsausschuss,
  berechneVermittlungsChancen,
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
});
