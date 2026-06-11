import { describe, it, expect } from 'vitest';
import { tick } from './engine';
import { makeState } from './test-helpers';
import { DEFAULT_CONTENT } from '../data/defaults/scenarios';
import type { ContentBundle } from './types';

/** Minimales ContentBundle für Engine-Tests ohne vollständige Daten */
const MINIMAL_CONTENT: ContentBundle = {
  ...DEFAULT_CONTENT,
  events: [],
  bundesratEvents: [],
  kommunalEvents: [],
  vorstufenEvents: [],
  extremismusEvents: [],
  steuerEvents: [],
  dynamicEvents: [],
};

describe('tick — Grundverhalten', () => {
  it('gibt denselben State zurück wenn gameOver === true', () => {
    const state = makeState({ gameOver: true });
    const result = tick(state, MINIMAL_CONTENT, 4);
    expect(result).toBe(state);
  });

  it('erhöht den Monat um 1', () => {
    const state = makeState({ month: 5 });
    const result = tick(state, MINIMAL_CONTENT, 4);
    expect(result.month).toBe(6);
  });

  it('gibt immer ein tickLog-Array zurück', () => {
    const state = makeState({ month: 1 });
    const result = tick(state, MINIMAL_CONTENT, 4);
    expect(Array.isArray(result.tickLog)).toBe(true);
  });

  it('setzt kpiPrev auf die KPI-Werte vor dem Tick', () => {
    const state = makeState({ month: 1, kpi: { al: 7, hh: 1, gi: 33, zf: 50 } });
    const result = tick(state, MINIMAL_CONTENT, 4);
    expect(result.kpiPrev).toMatchObject({ al: 7, hh: 1, gi: 33, zf: 50 });
  });

  it('gibt keinen gameOver-State zurück für einen normalen Tick (Monat 1)', () => {
    const state = makeState({ month: 1 });
    const result = tick(state, MINIMAL_CONTENT, 4);
    expect(result.gameOver).toBeFalsy();
  });

  it('gibt einen neuen State zurück (keine In-Place-Mutation)', () => {
    const state = makeState({ month: 3 });
    const result = tick(state, MINIMAL_CONTENT, 4);
    expect(result).not.toBe(state);
  });

  it('approvalHistory wächst nach jedem Tick', () => {
    const state = makeState({ month: 2, approvalHistory: [50, 51] });
    const result = tick(state, MINIMAL_CONTENT, 4);
    expect((result.approvalHistory ?? []).length).toBeGreaterThan((state.approvalHistory ?? []).length);
  });
});

describe('tick — zustOffsets (persistente Segment-Boosts)', () => {
  it('Offset wirkt auf Segmente und klingt über Ticks ab', () => {
    const ohneOffset = tick(makeState({ month: 5, rngSeed: 42 }), MINIMAL_CONTENT, 4);
    let s = makeState({ month: 5, rngSeed: 42, zustOffsets: { arbeit: 10, mitte: 0, prog: 0 } });
    s = tick(s, MINIMAL_CONTENT, 4);
    expect(s.zust.arbeit).toBeGreaterThan(ohneOffset.zust.arbeit);
    const ersterOffset = s.zustOffsets?.arbeit ?? 0;
    expect(ersterOffset).toBeGreaterThan(0);
    expect(ersterOffset).toBeLessThan(10);
    s = tick(s, MINIMAL_CONTENT, 4);
    expect(s.zustOffsets?.arbeit ?? 0).toBeLessThan(ersterOffset);
  });

  it('vollständig abgeklungene Offsets verschwinden aus dem State', () => {
    let s = makeState({ month: 5, zustOffsets: { arbeit: 0.5, mitte: 0, prog: 0 } });
    s = tick(s, MINIMAL_CONTENT, 4);
    expect(s.zustOffsets).toBeUndefined();
  });
});

describe('tick — Fehlertoleranz (safeSystem)', () => {
  it('stürzt nicht ab wenn Content-Felder undefined sind', () => {
    const state = makeState({ month: 1 });
    const minContent = {} as unknown as ContentBundle;
    expect(() => tick(state, minContent, 4)).not.toThrow();
  });

  it('gibt weiterhin einen gültigen State zurück auch bei leerem Content', () => {
    const state = makeState({ month: 1 });
    const minContent = {} as unknown as ContentBundle;
    const result = tick(state, minContent, 4);
    expect(result.month).toBe(2);
  });
});

describe('tick — Complexity-Stufen', () => {
  it('läuft bei Stufe 1 ohne Fehler durch', () => {
    const state = makeState({ month: 1 });
    expect(() => tick(state, MINIMAL_CONTENT, 1)).not.toThrow();
  });

  it('läuft bei Stufe 2 ohne Fehler durch', () => {
    const state = makeState({ month: 1 });
    expect(() => tick(state, MINIMAL_CONTENT, 2)).not.toThrow();
  });

  it('läuft bei Stufe 3 ohne Fehler durch', () => {
    const state = makeState({ month: 1 });
    expect(() => tick(state, MINIMAL_CONTENT, 3)).not.toThrow();
  });

  it('läuft bei Stufe 4 ohne Fehler durch', () => {
    const state = makeState({ month: 1 });
    expect(() => tick(state, MINIMAL_CONTENT, 4)).not.toThrow();
  });
});

describe('tick — Spielende (Monat 48)', () => {
  it('löst bei Monat 47 → 48 keine Exception aus', () => {
    const state = makeState({ month: 47, wahlkampfAktiv: false });
    expect(() => tick(state, MINIMAL_CONTENT, 4)).not.toThrow();
  });
});
