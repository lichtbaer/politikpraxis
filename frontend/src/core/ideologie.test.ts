import { describe, it, expect } from 'vitest';
import { berechneKongruenz, getGesamtExtremismusMalus } from './ideologie';

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

describe('getGesamtExtremismusMalus', () => {
  it('gibt 0 bei neutraler Ausrichtung', () => {
    expect(getGesamtExtremismusMalus({ wirtschaft: 0, gesellschaft: 0, staat: 0 })).toBe(0);
  });

  it('gibt 0 bei Werten unter 65', () => {
    expect(getGesamtExtremismusMalus({ wirtschaft: 60, gesellschaft: -50, staat: 40 })).toBe(0);
  });

  it('berechnet Malus bei wirtschaft 75', () => {
    // ((75-65)/10)² × 4 = 1² × 4 = 4
    expect(getGesamtExtremismusMalus({ wirtschaft: 75, gesellschaft: 0, staat: 0 })).toBe(4);
  });

  it('berechnet Malus bei mehreren Achsen > 65', () => {
    // wirtschaft 75: ((75-65)/10)²×4 = 4, gesellschaft -80: ((80-65)/10)²×4 = 9, staat 70: ((70-65)/10)²×4 = 1
    // Summe: 4 + 9 + 1 = 14
    const malus = getGesamtExtremismusMalus({ wirtschaft: 75, gesellschaft: -80, staat: 70 });
    expect(malus).toBeGreaterThan(8);
    expect(malus).toBeGreaterThanOrEqual(14);
  });
});
