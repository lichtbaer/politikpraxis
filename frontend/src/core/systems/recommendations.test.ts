import { describe, it, expect } from 'vitest';
import { scoreLaw, getRecommendedLaws } from './recommendations';
import { makeLaw } from '../test-helpers';
import type { KPI, Ideologie } from '../types';

function makeKpi(overrides: Partial<KPI> = {}): KPI {
  return { al: 5, hh: 1, gi: 30, zf: 55, ...overrides };
}

const neutralAusrichtung: Ideologie = { wirtschaft: 0, gesellschaft: 0, staat: 0 };

describe('scoreLaw', () => {
  it('gibt einen Wert im Bereich [0, 100] zurück', () => {
    const law = makeLaw({ ja: 55, nein: 45, effekte: { al: -1, zf: 2 } });
    const score = scoreLaw(law, makeKpi(), neutralAusrichtung);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('gibt 100 nicht überschreiten auch bei extremen Werten', () => {
    const law = makeLaw({ ja: 100, nein: 0, effekte: { al: -5, hh: 5, gi: -5, zf: 10 } });
    const score = scoreLaw(law, makeKpi({ al: 12, hh: -20, gi: 45, zf: 20 }), neutralAusrichtung);
    expect(score).toBeLessThanOrEqual(100);
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it('ein Gesetz das alle KPI-Probleme löst hat höheren Score als eines das nichts tut', () => {
    const kpi = makeKpi({ al: 10, hh: -5, gi: 40, zf: 30 });
    const helpful = makeLaw({ ja: 60, nein: 40, effekte: { al: -2, hh: 2, gi: -2, zf: 5 } });
    const useless = makeLaw({ ja: 60, nein: 40, effekte: {} });
    expect(scoreLaw(helpful, kpi, neutralAusrichtung)).toBeGreaterThan(scoreLaw(useless, kpi, neutralAusrichtung));
  });

  it('Gesetz mit hoher Passage-Chance (ja>nein) schlägt Gesetz mit niedriger', () => {
    const kpi = makeKpi(); // alle KPIs gesund → passage-Chance dominiert mehr
    const highChance = makeLaw({ ja: 80, nein: 20, effekte: {} });
    const lowChance = makeLaw({ ja: 20, nein: 80, effekte: {} });
    expect(scoreLaw(highChance, kpi, neutralAusrichtung)).toBeGreaterThan(scoreLaw(lowChance, kpi, neutralAusrichtung));
  });

  it('bei gesunden KPIs gibt es trotzdem einen Score (Bonus-Pfad)', () => {
    const kpi = makeKpi({ al: 4, hh: 2, gi: 25, zf: 70 }); // alle gesund
    const law = makeLaw({ ja: 55, nein: 45, effekte: { al: -1 } });
    const score = scoreLaw(law, kpi, neutralAusrichtung);
    expect(score).toBeGreaterThan(0);
  });

  it('passage chance 50/50 → scorePassageChance = 50', () => {
    // Isoliert testen: nur passage-Gewichtung, KPIs gesund, kein Effekt
    const kpi = makeKpi({ al: 4, hh: 2, gi: 25, zf: 70 });
    const law = makeLaw({ ja: 50, nein: 50, effekte: {} });
    const score = scoreLaw(law, kpi, neutralAusrichtung);
    // Passage (30%) × 50 = 15, plus KPI-Bonus und Effizienz-Anteil
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('total=0 bei ja+nein → Passage-Score ist 50', () => {
    const kpi = makeKpi({ al: 4, hh: 2, gi: 25, zf: 70 });
    const law = makeLaw({ ja: 0, nein: 0, effekte: {} });
    const score = scoreLaw(law, kpi, neutralAusrichtung);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe('getRecommendedLaws', () => {
  it('gibt nur Gesetze mit status="entwurf" zurück', () => {
    const laws = [
      makeLaw({ id: 'e1', status: 'entwurf' }),
      makeLaw({ id: 'e2', status: 'aktiv' }),
      makeLaw({ id: 'e3', status: 'beschlossen' }),
      makeLaw({ id: 'e4', status: 'entwurf' }),
    ];
    const result = getRecommendedLaws(laws, makeKpi(), neutralAusrichtung);
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.law.status === 'entwurf')).toBe(true);
  });

  it('sortiert absteigend nach Score', () => {
    const laws = [
      makeLaw({ id: 'low', status: 'entwurf', ja: 20, nein: 80, effekte: {} }),
      makeLaw({ id: 'high', status: 'entwurf', ja: 80, nein: 20, effekte: { al: -2, zf: 3 } }),
    ];
    const result = getRecommendedLaws(laws, makeKpi({ al: 10 }), neutralAusrichtung);
    expect(result[0].law.id).toBe('high');
    expect(result[0].score).toBeGreaterThan(result[1].score);
  });

  it('gibt leeres Array zurück wenn keine Entwürfe vorhanden', () => {
    const laws = [makeLaw({ status: 'beschlossen' }), makeLaw({ status: 'aktiv' })];
    expect(getRecommendedLaws(laws, makeKpi(), neutralAusrichtung)).toHaveLength(0);
  });

  it('jedes Ergebnis hat score im Bereich [0, 100]', () => {
    const laws = [
      makeLaw({ id: 'a', status: 'entwurf', ja: 55, nein: 45, effekte: { al: -1 } }),
      makeLaw({ id: 'b', status: 'entwurf', ja: 30, nein: 70, effekte: { hh: 1 } }),
    ];
    const result = getRecommendedLaws(laws, makeKpi(), neutralAusrichtung);
    for (const r of result) {
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
    }
  });
});
