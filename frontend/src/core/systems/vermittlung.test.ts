import { describe, it, expect } from 'vitest';
import { kannVermitteln, vermittlungsausschuss, tickVermittlungsausschuss } from './vermittlung';
import type { GameState, Law } from '../types';

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
