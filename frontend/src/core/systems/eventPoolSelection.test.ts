import { describe, it, expect, vi, afterEach } from 'vitest';
import { selectEventPool } from './eventPoolSelection';
import { makeEvent } from '../test-helpers';
import type { GameEvent } from '../types';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('selectEventPool', () => {
  it('gibt leeres Array zurück bei leerem Input', () => {
    expect(selectEventPool([])).toHaveLength(0);
  });

  it('always_include Events sind immer im Pool', () => {
    const alwaysEvents: GameEvent[] = [
      makeEvent({ id: 'always1', always_include: true }),
      makeEvent({ id: 'always2', always_include: true }),
    ];
    const optionalEvents: GameEvent[] = [
      makeEvent({ id: 'opt1' }),
      makeEvent({ id: 'opt2' }),
    ];
    const pool = selectEventPool([...alwaysEvents, ...optionalEvents]);
    expect(pool).toContain('always1');
    expect(pool).toContain('always2');
  });

  it('selektiert ~65% der optionalen Events', () => {
    const optional: GameEvent[] = Array.from({ length: 20 }, (_, i) =>
      makeEvent({ id: `opt${i}` }),
    );
    const pool = selectEventPool(optional);
    // 65% von 20 = 13, Math.ceil(20 * 0.65) = 13
    expect(pool).toHaveLength(13);
  });

  it('bei nur always_include Events sind alle im Pool', () => {
    const events: GameEvent[] = [
      makeEvent({ id: 'a1', always_include: true }),
      makeEvent({ id: 'a2', always_include: true }),
      makeEvent({ id: 'a3', always_include: true }),
    ];
    const pool = selectEventPool(events);
    expect(pool).toHaveLength(3);
    expect(pool).toContain('a1');
    expect(pool).toContain('a2');
    expect(pool).toContain('a3');
  });

  it('bei nur optionalen Events: Anzahl = Math.ceil(n × 0.65)', () => {
    for (const n of [1, 5, 10, 15, 20]) {
      const events = Array.from({ length: n }, (_, i) => makeEvent({ id: `e${i}` }));
      const pool = selectEventPool(events);
      expect(pool).toHaveLength(Math.ceil(n * 0.65));
    }
  });

  it('gibt Array von Event-IDs (strings) zurück', () => {
    const events = [makeEvent({ id: 'evt1' }), makeEvent({ id: 'evt2', always_include: true })];
    const pool = selectEventPool(events);
    expect(pool.every((id) => typeof id === 'string')).toBe(true);
  });

  it('enthält keine Duplikate', () => {
    const events: GameEvent[] = [
      makeEvent({ id: 'always', always_include: true }),
      ...Array.from({ length: 10 }, (_, i) => makeEvent({ id: `opt${i}` })),
    ];
    const pool = selectEventPool(events);
    const unique = new Set(pool);
    expect(unique.size).toBe(pool.length);
  });

  it('verschiedene Aufrufe können unterschiedliche Subsets liefern (Randomness)', () => {
    const events = Array.from({ length: 20 }, (_, i) => makeEvent({ id: `e${i}` }));
    const pool1 = selectEventPool(events);
    const pool2 = selectEventPool(events);
    // In der Praxis sollten sich die Pools unterscheiden (statistisch sehr wahrscheinlich)
    // Wir prüfen nur, dass beide valide Länge haben
    expect(pool1).toHaveLength(Math.ceil(20 * 0.65));
    expect(pool2).toHaveLength(Math.ceil(20 * 0.65));
  });

  it('mock Math.random → deterministisch — always_include unabhängig von Zufall', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const events: GameEvent[] = [
      makeEvent({ id: 'always', always_include: true }),
      makeEvent({ id: 'opt1' }),
      makeEvent({ id: 'opt2' }),
    ];
    const pool = selectEventPool(events);
    expect(pool).toContain('always');
  });
});
