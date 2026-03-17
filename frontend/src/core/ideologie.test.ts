import { describe, it, expect } from 'vitest';
import { berechneKongruenz } from './ideologie';

describe('berechneKongruenz', () => {
  it('gibt 100 bei identischen Profilen', () => {
    const p = { wirtschaft: 50, gesellschaft: -20, staat: 0 };
    expect(berechneKongruenz(p, p)).toBe(100);
  });

  it('gibt 100 bei identischen Profilen (0,0,0)', () => {
    const p = { wirtschaft: 0, gesellschaft: 0, staat: 0 };
    expect(berechneKongruenz(p, p)).toBe(100);
  });

  it('gibt niedrigeren Score bei größerer Distanz', () => {
    const p1 = { wirtschaft: 0, gesellschaft: 0, staat: 0 };
    const p2 = { wirtschaft: 50, gesellschaft: 0, staat: 0 };
    const p3 = { wirtschaft: 100, gesellschaft: 0, staat: 0 };
    expect(berechneKongruenz(p1, p2)).toBeGreaterThan(berechneKongruenz(p1, p3));
  });

  it('berücksichtigt Gewichtung (Wirtschaft 40%, Gesellschaft 35%, Staat 25%)', () => {
    const p1 = { wirtschaft: 0, gesellschaft: 0, staat: 0 };
    const p2a = { wirtschaft: 50, gesellschaft: 0, staat: 0 };
    const p2b = { wirtschaft: 0, gesellschaft: 50, staat: 0 };
    const p2c = { wirtschaft: 0, gesellschaft: 0, staat: 50 };
    const scoreA = berechneKongruenz(p1, p2a);
    const scoreB = berechneKongruenz(p1, p2b);
    const scoreC = berechneKongruenz(p1, p2c);
    expect(scoreA).toBeLessThan(scoreB);
    expect(scoreB).toBeLessThan(scoreC);
  });

  it('gibt 0 bei maximaler Distanz (-100 vs +100)', () => {
    const p1 = { wirtschaft: -100, gesellschaft: -100, staat: -100 };
    const p2 = { wirtschaft: 100, gesellschaft: 100, staat: 100 };
    const score = berechneKongruenz(p1, p2);
    expect(score).toBe(0);
  });

  it('rundet auf ganze Zahl', () => {
    const p1 = { wirtschaft: 10, gesellschaft: 20, staat: 30 };
    const p2 = { wirtschaft: 15, gesellschaft: 25, staat: 35 };
    const score = berechneKongruenz(p1, p2);
    expect(Number.isInteger(score)).toBe(true);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});
