import { describe, it, expect, vi, afterEach } from 'vitest';
import type { GameState, Law } from '../types';
import * as rng from '../rng';
import {
  berechneKlageWahrscheinlichkeit,
  checkNormenkontrollKlage,
  tickNormenkontrolle,
  setNormenkontrollReaktion,
} from './verfassungsgericht';

/**
 * Instead of mocking getGesetzIdeologie, we set `ideologie` directly on
 * the law object. getGesetzIdeologie returns `law.ideologie` when present.
 */

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    month: 10,
    speed: 0,
    pk: 50,
    view: 'agenda',
    kpi: { al: 5, hh: 0, gi: 50, zf: 50 },
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
    ...overrides,
  } as GameState;
}

function makeLaw(overrides: Partial<Law> = {}): Law {
  return {
    id: 'test_law',
    titel: 'Testgesetz',
    kurz: 'TG',
    desc: '',
    tags: ['bund'],
    status: 'beschlossen',
    ja: 55,
    nein: 45,
    effekte: { hh: -0.2, zf: 0.5 },
    lag: 4,
    expanded: false,
    route: null,
    rprog: 0,
    rdur: 0,
    blockiert: null,
    ideologie: { wirtschaft: 0, gesellschaft: 0, staat: 0 },
    ...overrides,
  };
}

// ── berechneKlageWahrscheinlichkeit ──────────────────────────────────

describe('berechneKlageWahrscheinlichkeit', () => {
  it('returns base probability of 5 with no modifiers', () => {
    const prob = berechneKlageWahrscheinlichkeit(makeLaw(), 0, []);
    expect(prob).toBe(5);
  });

  it('adds oppositionStaerke / 10 (floored)', () => {
    const law = makeLaw();
    expect(berechneKlageWahrscheinlichkeit(law, 35, [])).toBe(5 + 3);
    expect(berechneKlageWahrscheinlichkeit(law, 79, [])).toBe(5 + 7);
  });

  it('adds 15 when any ideology axis > 60', () => {
    const law = makeLaw({ ideologie: { wirtschaft: 70, gesellschaft: 0, staat: 0 } });
    const prob = berechneKlageWahrscheinlichkeit(law, 0, []);
    expect(prob).toBe(5 + 15);
  });

  it('adds 15 for negative ideology axis with abs > 60', () => {
    const law = makeLaw({ ideologie: { wirtschaft: 0, gesellschaft: -65, staat: 0 } });
    const prob = berechneKlageWahrscheinlichkeit(law, 0, []);
    expect(prob).toBe(5 + 15);
  });

  it('does not add ideology bonus when all axes <= 60', () => {
    const law = makeLaw({ ideologie: { wirtschaft: 60, gesellschaft: 60, staat: 60 } });
    const prob = berechneKlageWahrscheinlichkeit(law, 0, []);
    expect(prob).toBe(5);
  });

  it('adds 10 when any BR fraktion has beziehung < 25', () => {
    const fraktionen = [{ beziehung: 50 }, { beziehung: 20 }];
    const prob = berechneKlageWahrscheinlichkeit(makeLaw(), 0, fraktionen);
    expect(prob).toBe(5 + 10);
  });

  it('does not add BR bonus when all beziehung >= 25', () => {
    const fraktionen = [{ beziehung: 25 }, { beziehung: 80 }];
    const prob = berechneKlageWahrscheinlichkeit(makeLaw(), 0, fraktionen);
    expect(prob).toBe(5);
  });

  it('caps at 40 when all modifiers combined exceed 40', () => {
    const law = makeLaw({ ideologie: { wirtschaft: 80, gesellschaft: 0, staat: 0 } });
    // 5 base + 15 ideo + 10 opp + 10 BR = 40 (at cap)
    const fraktionen = [{ beziehung: 10 }];
    const prob = berechneKlageWahrscheinlichkeit(law, 100, fraktionen);
    expect(prob).toBe(40);
  });

  it('combines all modifiers correctly below cap', () => {
    const law = makeLaw({ ideologie: { wirtschaft: 0, gesellschaft: 0, staat: 75 } });
    // 5 + 15 (ideo) + 2 (opp 25/10) + 10 (BR) = 32
    const fraktionen = [{ beziehung: 24 }];
    const prob = berechneKlageWahrscheinlichkeit(law, 25, fraktionen);
    expect(prob).toBe(32);
  });
});

// ── checkNormenkontrollKlage ─────────────────────────────────────────

describe('checkNormenkontrollKlage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns unchanged state when complexity too low for normenkontrolle', () => {
    const state = makeState();
    const law = makeLaw();
    // normenkontrolle requires minLevel 3
    const result = checkNormenkontrollKlage(state, law, 2);
    expect(result).toBe(state);
  });

  it('returns unchanged state when activeEvent already exists', () => {
    const state = makeState({
      activeEvent: { id: 'existing', type: 'info', title: 'Test', choices: [] } as any,
    });
    const law = makeLaw();
    const result = checkNormenkontrollKlage(state, law, 3);
    expect(result).toBe(state);
  });

  it('returns unchanged state when random roll fails (prob too low)', () => {
    // nextRandom()*100 >= prob => keine Klage (prob ≈ 9 bei Opp 40)
    vi.spyOn(rng, 'nextRandom').mockReturnValue(0.9);
    const state = makeState({ activeEvent: null });
    const law = makeLaw();
    const result = checkNormenkontrollKlage(state, law, 3);
    expect(result).toBe(state);
  });

  it('creates event and Verfahren when roll succeeds', () => {
    // nextRandom: erster Wurf für Klage, zweiter für Dauer
    vi.spyOn(rng, 'nextRandom')
      .mockReturnValueOnce(0.01) // roll: 1 < prob
      .mockReturnValueOnce(0.5); // duration: 4 + floor(0.5*5) = 6
    const state = makeState({ activeEvent: null, month: 10 });
    const law = makeLaw({ id: 'klage_law', kurz: 'KL' });
    const result = checkNormenkontrollKlage(state, law, 3);

    expect(result.activeEvent).toBeDefined();
    expect(result.activeEvent!.id).toBe('normenkontrolle_klage_law');
    expect(result.normenkontrollVerfahren).toHaveLength(1);
    expect(result.normenkontrollVerfahren![0]).toMatchObject({
      gesetzId: 'klage_law',
      klagemonat: 10,
      urteilMonat: 16, // 10 + 6
    });
  });
});

// ── setNormenkontrollReaktion ────────────────────────────────────────

describe('setNormenkontrollReaktion', () => {
  it('sets spielerReaktion on matching Verfahren', () => {
    const state = makeState({
      normenkontrollVerfahren: [
        { gesetzId: 'law_a', klagemonat: 5, urteilMonat: 10 },
        { gesetzId: 'law_b', klagemonat: 6, urteilMonat: 12 },
      ],
    });
    const result = setNormenkontrollReaktion(state, 'law_a', 'nachbesserung');
    expect(result.normenkontrollVerfahren![0].spielerReaktion).toBe('nachbesserung');
    expect(result.normenkontrollVerfahren![1].spielerReaktion).toBeUndefined();
  });

  it('does not modify Verfahren with different gesetzId', () => {
    const state = makeState({
      normenkontrollVerfahren: [
        { gesetzId: 'law_x', klagemonat: 1, urteilMonat: 5 },
      ],
    });
    const result = setNormenkontrollReaktion(state, 'law_y', 'kritisieren');
    expect(result.normenkontrollVerfahren![0].spielerReaktion).toBeUndefined();
  });

  it('handles empty normenkontrollVerfahren', () => {
    const state = makeState({ normenkontrollVerfahren: undefined });
    const result = setNormenkontrollReaktion(state, 'law_a', 'akzeptieren');
    expect(result.normenkontrollVerfahren).toEqual([]);
  });
});

// ── tickNormenkontrolle ──────────────────────────────────────────────

describe('tickNormenkontrolle', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns unchanged state when complexity too low', () => {
    const state = makeState();
    const result = tickNormenkontrolle(state, 2);
    expect(result).toBe(state);
  });

  it('returns unchanged state when no Verfahren exist', () => {
    const state = makeState({ normenkontrollVerfahren: [] });
    const result = tickNormenkontrolle(state, 3);
    expect(result).toBe(state);
  });

  it('returns unchanged state when normenkontrollVerfahren is undefined', () => {
    const state = makeState({ normenkontrollVerfahren: undefined });
    const result = tickNormenkontrolle(state, 3);
    expect(result).toBe(state);
  });

  it('keeps running Verfahren when urteilMonat not yet reached', () => {
    const state = makeState({
      month: 8,
      normenkontrollVerfahren: [
        { gesetzId: 'law_a', klagemonat: 5, urteilMonat: 12 },
      ],
    });
    const result = tickNormenkontrolle(state, 3);
    expect(result.normenkontrollVerfahren).toHaveLength(1);
    expect(result.normenkontrollVerfahren![0].gesetzId).toBe('law_a');
  });

  it('resolves Verfahren when urteilMonat is reached (konform)', () => {
    vi.spyOn(rng, 'nextRandom').mockReturnValue(0.1); // wuerfleUrteil: < 40 => konform

    const law = makeLaw({ id: 'resolved_law', kurz: 'RL' });
    const state = makeState({
      month: 12,
      gesetze: [law],
      medienKlima: 50,
      normenkontrollVerfahren: [
        { gesetzId: 'resolved_law', klagemonat: 5, urteilMonat: 12 },
      ],
    });

    const result = tickNormenkontrolle(state, 3);
    // Verfahren should be removed (resolved)
    expect(result.normenkontrollVerfahren).toHaveLength(0);
    // Konform: medienKlima +5
    expect(result.medienKlima).toBe(55);

  });

  it('konform with akzeptieren reaction gives +3 bonus to medienKlima', () => {
    vi.spyOn(rng, 'nextRandom').mockReturnValue(0.1); // konform

    const law = makeLaw({ id: 'ak_law' });
    const state = makeState({
      month: 12,
      gesetze: [law],
      medienKlima: 50,
      normenkontrollVerfahren: [
        { gesetzId: 'ak_law', klagemonat: 5, urteilMonat: 12, spielerReaktion: 'akzeptieren' },
      ],
    });

    const result = tickNormenkontrolle(state, 3);
    // 50 + 5 + 3 = 58
    expect(result.medienKlima).toBe(58);
  });

  it('teilweise without nachbesserung adds pending effects (50% negated)', () => {
    vi.spyOn(rng, 'nextRandom').mockReturnValue(0.5); // teilweise (40–80)

    const law = makeLaw({ id: 'teil_law', effekte: { hh: -0.4, zf: 1.0 } });
    const state = makeState({
      month: 12,
      gesetze: [law],
      pending: [],
      normenkontrollVerfahren: [
        { gesetzId: 'teil_law', klagemonat: 5, urteilMonat: 12 },
      ],
    });

    const result = tickNormenkontrolle(state, 3);
    expect(result.normenkontrollVerfahren).toHaveLength(0);
    // Should have pending effects reversing 50% of original
    const hhPending = result.pending.find(p => p.key === 'hh');
    const zfPending = result.pending.find(p => p.key === 'zf');
    expect(hhPending).toBeDefined();
    expect(hhPending!.delta).toBe(0.2); // -(-0.4 * 0.5)
    expect(zfPending).toBeDefined();
    expect(zfPending!.delta).toBe(-0.5); // -(1.0 * 0.5)

  });

  it('teilweise with nachbesserung does not add pending effects', () => {
    vi.spyOn(rng, 'nextRandom').mockReturnValue(0.5); // teilweise

    const law = makeLaw({ id: 'nach_law', effekte: { hh: -0.4 } });
    const state = makeState({
      month: 12,
      gesetze: [law],
      pending: [],
      normenkontrollVerfahren: [
        { gesetzId: 'nach_law', klagemonat: 5, urteilMonat: 12, spielerReaktion: 'nachbesserung' },
      ],
    });

    const result = tickNormenkontrolle(state, 3);
    expect(result.pending).toHaveLength(0);
  });

  it('widrig reverses all effects and reduces medienKlima by 12', () => {
    vi.spyOn(rng, 'nextRandom').mockReturnValue(0.9); // widrig (>= 80)

    const law = makeLaw({ id: 'widrig_law', effekte: { hh: -0.2, zf: 0.5 } });
    const state = makeState({
      month: 12,
      gesetze: [law],
      medienKlima: 60,
      pending: [],
      normenkontrollVerfahren: [
        { gesetzId: 'widrig_law', klagemonat: 5, urteilMonat: 12 },
      ],
    });

    const result = tickNormenkontrolle(state, 3);
    expect(result.normenkontrollVerfahren).toHaveLength(0);
    expect(result.medienKlima).toBe(48); // 60 - 12

    const hhPending = result.pending.find(p => p.key === 'hh');
    const zfPending = result.pending.find(p => p.key === 'zf');
    expect(hhPending!.delta).toBe(0.2);  // -(-0.2) full reversal
    expect(zfPending!.delta).toBe(-0.5); // -(0.5)  full reversal

  });

  it('kritisieren reaction polarizes milieus', () => {
    vi.spyOn(rng, 'nextRandom').mockReturnValue(0.1); // konform

    const law = makeLaw({ id: 'krit_law' });
    const state = makeState({
      month: 12,
      gesetze: [law],
      medienKlima: 50,
      milieuZustimmung: { postmaterielle: 50, traditionelle: 50, soziale_mitte: 50 },
      normenkontrollVerfahren: [
        { gesetzId: 'krit_law', klagemonat: 5, urteilMonat: 12, spielerReaktion: 'kritisieren' },
      ],
    });

    const result = tickNormenkontrolle(state, 3);
    expect(result.milieuZustimmung!['postmaterielle']).toBe(53); // +3
    expect(result.milieuZustimmung!['traditionelle']).toBe(47);  // -3

  });
});
