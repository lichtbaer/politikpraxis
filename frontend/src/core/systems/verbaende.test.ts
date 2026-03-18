import { describe, it, expect } from 'vitest';
import { checkVerbandsKonflikt, verbandTradeoff } from './verbaende';
import type { GameState, Verband } from '../types';

function createMockState(overrides: Partial<GameState> = {}): GameState {
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
    verbandsBeziehungen: { bdi: 60, uvb: 50 },
    politikfeldDruck: {},
    ...overrides,
  } as GameState;
}

const verbaende: Verband[] = [
  { id: 'bdi', kurz: 'BDI', politikfeld_id: 'wirtschaft_finanzen', beziehung_start: 50, tradeoffs: [{ key: 't1', effekte: { hh: -0.2 }, feld_druck_delta: 5 }] },
  { id: 'uvb', kurz: 'UVB', politikfeld_id: 'umwelt_energie', beziehung_start: 50, tradeoffs: [] },
];

describe('checkVerbandsKonflikt', () => {
  it('Malus auf Konflikt-Partner bei Beziehung >= 40', () => {
    const state = createMockState({ verbandsBeziehungen: { bdi: 60, uvb: 45 } });
    const result = checkVerbandsKonflikt(state, 'bdi', 'tradeoff_accepted', verbaende);
    expect(result.verbandsBeziehungen?.['uvb']).toBeLessThan(45);
  });
});

describe('verbandTradeoff', () => {
  it('feld_druck_delta korrekt angewendet', () => {
    const state = createMockState();
    const result = verbandTradeoff(state, 'bdi', 't1', verbaende, 3);
    expect(result.politikfeldDruck?.['wirtschaft_finanzen']).toBe(5);
  });

  it('SMA-319: cost_pk > 0 → PK abziehen, verband_effekte anwenden', () => {
    const verbaendeWithCost: Verband[] = [
      { id: 'dwv', kurz: 'DWV', politikfeld_id: 'digital', beziehung_start: 50, tradeoffs: [{ key: 'dwv_ki', cost_pk: 15, effekte: {}, feld_druck_delta: 0, verband_effekte: { bdi: 5 } }] },
    ];
    const state = createMockState({ pk: 20, verbandsBeziehungen: { dwv: 50, bdi: 40 } });
    const result = verbandTradeoff(state, 'dwv', 'dwv_ki', verbaendeWithCost, 3);
    expect(result.pk).toBe(5);
    expect(result.verbandsBeziehungen?.['dwv']).toBe(65);
    expect(result.verbandsBeziehungen?.['bdi']).toBe(45);
  });

  it('SMA-319: cost_pk > 0 und pk < cost_pk → State unverändert', () => {
    const verbaendeWithCost: Verband[] = [
      { id: 'dwv', kurz: 'DWV', politikfeld_id: 'digital', beziehung_start: 50, tradeoffs: [{ key: 'dwv_ki', cost_pk: 15, effekte: {}, feld_druck_delta: 0 }] },
    ];
    const state = createMockState({ pk: 10 });
    const result = verbandTradeoff(state, 'dwv', 'dwv_ki', verbaendeWithCost, 3);
    expect(result.pk).toBe(10);
  });
});
