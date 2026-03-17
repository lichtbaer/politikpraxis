import { describe, it, expect } from 'vitest';
import { startRoute, advanceRoutes, routeLabel, ROUTE_INFO } from './levels';
import { createInitialState } from '../state';
import { DEFAULT_CONTENT } from '../../data/defaults/scenarios';
import type { GameState, Law } from '../types';

function makeState(overrides: Partial<GameState> = {}): GameState {
  const base = createInitialState(DEFAULT_CONTENT, 4);
  return { ...base, pk: 50, month: 10, ...overrides };
}

function makeLaw(overrides: Partial<Law> = {}): Law {
  return {
    id: 'test_law',
    titel: 'Test',
    kurz: 'TL',
    desc: '',
    tags: ['bund'],
    status: 'blockiert',
    ja: 55,
    nein: 45,
    effekte: { zf: 2 },
    lag: 3,
    expanded: false,
    route: null,
    rprog: 0,
    rdur: 0,
    blockiert: 'bundestag',
    ...overrides,
  };
}

describe('routeLabel', () => {
  it('gibt korrekte Labels', () => {
    expect(routeLabel('eu')).toBe('EU-Ebene');
    expect(routeLabel('land')).toBe('Länder-Pilot');
    expect(routeLabel('kommune')).toBe('Städtebündnis');
  });
});

describe('ROUTE_INFO', () => {
  it('hat korrekte Kosten und Dauer', () => {
    expect(ROUTE_INFO.eu).toEqual({ cost: 28, dur: 8 });
    expect(ROUTE_INFO.land).toEqual({ cost: 18, dur: 5 });
    expect(ROUTE_INFO.kommune).toEqual({ cost: 10, dur: 4 });
  });
});

describe('startRoute', () => {
  it('startet Kommunal-Route mit korrekten Kosten', () => {
    const state = makeState({ gesetze: [makeLaw()] });
    const result = startRoute(state, 'test_law', 'kommune');
    expect(result.pk).toBe(40); // 50 - 10
    const law = result.gesetze.find(g => g.id === 'test_law')!;
    expect(law.status).toBe('ausweich');
    expect(law.route).toBe('kommune');
    expect(law.rdur).toBe(4);
    expect(law.rprog).toBe(0);
    expect(law.blockiert).toBeNull();
  });

  it('startet Land-Route mit korrekten Kosten', () => {
    const state = makeState({ gesetze: [makeLaw()] });
    const result = startRoute(state, 'test_law', 'land');
    expect(result.pk).toBe(32); // 50 - 18
  });

  it('startet EU-Route mit korrekten Kosten', () => {
    const state = makeState({ gesetze: [makeLaw()] });
    const result = startRoute(state, 'test_law', 'eu');
    expect(result.pk).toBe(22); // 50 - 28
  });

  it('nicht möglich bei zu wenig PK', () => {
    const state = makeState({ pk: 5, gesetze: [makeLaw()] });
    const result = startRoute(state, 'test_law', 'eu');
    expect(result).toBe(state);
  });

  it('nicht möglich bei unbekanntem Gesetz', () => {
    const state = makeState({ gesetze: [] });
    const result = startRoute(state, 'nonexistent', 'kommune');
    expect(result).toBe(state);
  });

  it('nutzt costOverride wenn angegeben', () => {
    const state = makeState({ gesetze: [makeLaw()] });
    const result = startRoute(state, 'test_law', 'kommune', { costOverride: 8 });
    expect(result.pk).toBe(42); // 50 - 8
  });

  it('nutzt route_overrides vom Gesetz', () => {
    const law = makeLaw({ route_overrides: { kommune: { cost: 5, dur: 2 } } });
    const state = makeState({ gesetze: [law] });
    const result = startRoute(state, 'test_law', 'kommune');
    expect(result.pk).toBe(45); // 50 - 5
    expect(result.gesetze.find(g => g.id === 'test_law')!.rdur).toBe(2);
  });
});

describe('advanceRoutes', () => {
  it('erhöht rprog um 1', () => {
    const law = makeLaw({ status: 'ausweich', route: 'kommune', rprog: 1, rdur: 4 });
    const state = makeState({ gesetze: [law] });
    const { state: result } = advanceRoutes(state);
    expect(result.gesetze[0].rprog).toBe(2);
  });

  it('setzt Status auf beschlossen wenn rprog >= rdur', () => {
    const law = makeLaw({ status: 'ausweich', route: 'kommune', rprog: 3, rdur: 4 });
    const state = makeState({ gesetze: [law] });
    const { state: result } = advanceRoutes(state);
    expect(result.gesetze[0].status).toBe('beschlossen');
    expect(result.gesetze[0].rprog).toBe(4);
  });

  it('lässt EU-Route unverändert wenn EU aktiv', () => {
    const law = makeLaw({ status: 'ausweich', route: 'eu', rprog: 1, rdur: 8 });
    const state = makeState({
      gesetze: [law],
      eu: {
        klima: {}, klimaSperre: {}, ratsvorsitz: false, ratsvorsitzStartMonat: 0,
        ratsvorsitzPrioritaeten: [], umsetzungsfristen: [], foerdermittelBeantragt: [],
        aktiveRoute: { gesetzId: 'test_law', phase: 1, startMonat: 5, dauer: 8, erfolgschance: 60, verwässert: false },
      },
    });
    const { state: result } = advanceRoutes(state);
    expect(result.gesetze[0].rprog).toBe(1); // Nicht erhöht (EU verwaltet eigene Route)
  });

  it('gibt completedVorstufe zurück bei abgeschlossener Nicht-EU-Route', () => {
    const law = makeLaw({ status: 'ausweich', route: 'kommune', rprog: 3, rdur: 4 });
    const state = makeState({ gesetze: [law] });
    const { completedVorstufe } = advanceRoutes(state);
    expect(completedVorstufe).toBeDefined();
    expect(completedVorstufe!.lawId).toBe('test_law');
    expect(completedVorstufe!.route).toBe('kommune');
  });

  it('lässt Gesetze mit anderem Status unverändert', () => {
    const law = makeLaw({ status: 'entwurf', route: null, rprog: 0, rdur: 0 });
    const state = makeState({ gesetze: [law] });
    const { state: result } = advanceRoutes(state);
    expect(result.gesetze[0].status).toBe('entwurf');
    expect(result.gesetze[0].rprog).toBe(0);
  });
});
