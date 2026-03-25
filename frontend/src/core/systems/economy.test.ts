import { describe, it, expect } from 'vitest';
import { recalcApproval, applyPendingEffects, applyKPIDrift, scheduleEffects } from './economy';
import { createInitialState } from '../state';
import { DEFAULT_CONTENT } from '../../data/defaults/scenarios';
import type { GameState, KPI, Approval } from '../types';

function makeKpi(overrides: Partial<KPI> = {}): KPI {
  return { al: 5, hh: 1, gi: 30, zf: 55, ...overrides };
}

function makeApproval(overrides: Partial<Approval> = {}): Approval {
  return { g: 52, arbeit: 58, mitte: 54, prog: 44, ...overrides };
}

function makeState(overrides: Partial<GameState> = {}): GameState {
  const base = createInitialState(DEFAULT_CONTENT, 4);
  return { ...base, ...overrides };
}

describe('recalcApproval', () => {
  it('gibt alle vier Zustimmungswerte zurück', () => {
    const result = recalcApproval(makeKpi(), makeApproval());
    expect(result).toHaveProperty('g');
    expect(result).toHaveProperty('arbeit');
    expect(result).toHaveProperty('mitte');
    expect(result).toHaveProperty('prog');
  });

  it('niedrige Arbeitslosigkeit erhöht Gesamtzustimmung', () => {
    const lowAl = recalcApproval(makeKpi({ al: 3 }), makeApproval());
    const highAl = recalcApproval(makeKpi({ al: 12 }), makeApproval());
    expect(lowAl.g).toBeGreaterThan(highAl.g);
  });

  it('hoher Haushaltssaldo erhöht mitte-Segment', () => {
    const goodHh = recalcApproval(makeKpi({ hh: 5 }), makeApproval());
    const badHh = recalcApproval(makeKpi({ hh: -5 }), makeApproval());
    expect(goodHh.mitte).toBeGreaterThan(badHh.mitte);
  });

  it('hohe Ungleichheit senkt Gesamtzustimmung', () => {
    const lowGi = recalcApproval(makeKpi({ gi: 20 }), makeApproval());
    const highGi = recalcApproval(makeKpi({ gi: 55 }), makeApproval());
    expect(lowGi.g).toBeGreaterThan(highGi.g);
  });

  it('Werte werden auf gültige Bereiche geclampt', () => {
    const extreme = recalcApproval(makeKpi({ al: 0, hh: 10, gi: 10, zf: 100 }), makeApproval());
    expect(extreme.g).toBeLessThanOrEqual(100);
    expect(extreme.g).toBeGreaterThanOrEqual(0);
    expect(extreme.arbeit).toBeGreaterThanOrEqual(0);
    expect(extreme.mitte).toBeGreaterThanOrEqual(0);
    expect(extreme.prog).toBeGreaterThanOrEqual(0);
  });
});

describe('applyPendingEffects', () => {
  it('wendet fällige Effekte an und entfernt sie aus pending', () => {
    const state = makeState({
      month: 5,
      kpi: makeKpi({ al: 6 }),
      pending: [
        { month: 5, key: 'al', delta: -1, label: 'Arbeitsmarktreform' },
        { month: 8, key: 'hh', delta: 2, label: 'Sparpaket' },
      ],
    });
    const result = applyPendingEffects(state);
    expect(result.kpi.al).toBeCloseTo(5, 1);
    expect(result.pending).toHaveLength(1);
    expect(result.pending[0].key).toBe('hh');
  });

  it('wendet keine zukünftigen Effekte an', () => {
    const state = makeState({
      month: 3,
      kpi: makeKpi(),
      pending: [{ month: 5, key: 'al', delta: -1, label: 'Test' }],
    });
    const result = applyPendingEffects(state);
    expect(result.kpi.al).toBe(state.kpi.al);
    expect(result.pending).toHaveLength(1);
  });

  it('clampt KPI-Werte auf minimum 0', () => {
    const state = makeState({
      month: 5,
      kpi: makeKpi({ al: 0.5 }),
      pending: [{ month: 5, key: 'al', delta: -2, label: 'Test' }],
    });
    const result = applyPendingEffects(state);
    expect(result.kpi.al).toBe(0);
  });

  it('clampt ZF auf maximum 100', () => {
    const state = makeState({
      month: 5,
      kpi: makeKpi({ zf: 99 }),
      pending: [{ month: 5, key: 'zf', delta: 5, label: 'Test' }],
    });
    const result = applyPendingEffects(state);
    expect(result.kpi.zf).toBeLessThanOrEqual(100);
  });

  it('erzeugt Log-Einträge für angewandte Effekte', () => {
    const state = makeState({
      month: 5,
      kpi: makeKpi(),
      pending: [{ month: 5, key: 'al', delta: -1, label: 'Reform' }],
      log: [],
    });
    const result = applyPendingEffects(state);
    expect(result.log.length).toBeGreaterThan(0);
    expect(result.log[0].msg).toContain('Reform');
  });
});

describe('applyKPIDrift', () => {
  it('gibt ein neues KPI-Objekt zurück', () => {
    const kpi = makeKpi();
    const result = applyKPIDrift(kpi);
    expect(result).not.toBe(kpi);
  });

  it('ändert KPI-Werte nur innerhalb der Bounds', () => {
    // Wiederholte Aufrufe sollten nie Out-of-Bounds gehen
    let kpi = makeKpi({ al: 2, hh: -10, gi: 10, zf: 20 });
    for (let i = 0; i < 100; i++) {
      kpi = applyKPIDrift(kpi);
    }
    expect(kpi.al).toBeGreaterThanOrEqual(2);
    expect(kpi.al).toBeLessThanOrEqual(15);
    expect(kpi.hh).toBeGreaterThanOrEqual(-10);
    expect(kpi.hh).toBeLessThanOrEqual(10);
    expect(kpi.gi).toBeGreaterThanOrEqual(10);
    expect(kpi.gi).toBeLessThanOrEqual(60);
    expect(kpi.zf).toBeGreaterThanOrEqual(20);
    expect(kpi.zf).toBeLessThanOrEqual(80);
  });
});

describe('scheduleEffects', () => {
  it('fügt neue pending-Einträge hinzu', () => {
    const state = makeState({ month: 3, pending: [] });
    const law = { effekte: { al: -1, hh: 0.5 }, lag: 3, kurz: 'Testgesetz' };
    const result = scheduleEffects(state, law);
    expect(result.pending).toHaveLength(2);
    expect(result.pending[0]).toEqual({ month: 6, key: 'al', delta: -1, label: 'Testgesetz' });
    expect(result.pending[1]).toEqual({ month: 6, key: 'hh', delta: 0.5, label: 'Testgesetz' });
  });

  it('erhält bestehende pending-Einträge', () => {
    const existing = { month: 10, key: 'zf' as const, delta: 2, label: 'Alt' };
    const state = makeState({ month: 3, pending: [existing] });
    const law = { effekte: { al: -1 }, lag: 2, kurz: 'Neu' };
    const result = scheduleEffects(state, law);
    expect(result.pending).toHaveLength(2);
    expect(result.pending[0]).toEqual(existing);
  });
});
