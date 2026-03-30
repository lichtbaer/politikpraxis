import { describe, it, expect } from 'vitest';
import { berechneSVRNote, naechsterGutachtenMonat } from './sachverstaendigenrat';
import type { SVRNote } from './sachverstaendigenrat';

type KpiHistory = { al: number[]; hh: number[]; gi: number[]; zf: number[] };

function makeHistory(overrides: Partial<KpiHistory> = {}): KpiHistory {
  return {
    al: [5, 5],
    hh: [1, 1],
    gi: [30, 30],
    zf: [55, 55],
    ...overrides,
  };
}

describe('berechneSVRNote', () => {
  it('alle 4 KPIs verbessert → Note A', () => {
    const history = makeHistory({
      al: [8, 5],   // gesunken = besser
      hh: [1, 3],   // gestiegen = besser
      gi: [40, 35], // gesunken = besser
      zf: [50, 60], // gestiegen = besser
    });
    expect(berechneSVRNote(history)).toBe('A');
  });

  it('3 KPIs verbessert → Note B', () => {
    const history = makeHistory({
      al: [8, 5],   // besser
      hh: [1, 3],   // besser
      gi: [40, 35], // besser
      zf: [55, 55], // unverändert (delta=0 < 0.3)
    });
    expect(berechneSVRNote(history)).toBe('B');
  });

  it('2 KPIs verbessert → Note C', () => {
    const history = makeHistory({
      al: [8, 5],   // besser
      hh: [1, 3],   // besser
      gi: [30, 30], // unverändert
      zf: [55, 55], // unverändert
    });
    expect(berechneSVRNote(history)).toBe('C');
  });

  it('1 KPI verbessert → Note D', () => {
    const history = makeHistory({
      al: [8, 5],   // besser
      hh: [1, 1],   // unverändert
      gi: [30, 30], // unverändert
      zf: [55, 55], // unverändert
    });
    expect(berechneSVRNote(history)).toBe('D');
  });

  it('kein KPI verbessert → Note F', () => {
    const history = makeHistory({
      al: [5, 5], // unverändert
      hh: [1, 1], // unverändert
      gi: [30, 30],
      zf: [55, 55],
    });
    expect(berechneSVRNote(history)).toBe('F');
  });

  it('AL gestiegen → keine Verbesserung (höher ist schlechter)', () => {
    const history = makeHistory({
      al: [5, 8],   // gestiegen = schlechter → delta > 0 → kein Punkt
      hh: [1, 1],
      gi: [30, 30],
      zf: [55, 55],
    });
    expect(berechneSVRNote(history)).toBe('F');
  });

  it('GI gestiegen → keine Verbesserung (höher ist schlechter)', () => {
    const history = makeHistory({
      al: [5, 5],
      hh: [1, 1],
      gi: [30, 38], // gestiegen = schlechter
      zf: [55, 55],
    });
    expect(berechneSVRNote(history)).toBe('F');
  });

  it('Delta ≤ 0.3 zählt nicht als Verbesserung', () => {
    const history = makeHistory({
      al: [5, 4.8],  // delta = -0.2, unter Schwelle
      hh: [1, 1.2],  // delta = 0.2, unter Schwelle
      gi: [30, 30],
      zf: [55, 55],
    });
    expect(berechneSVRNote(history)).toBe('F');
  });

  it('Delta genau -0.31 zählt als Verbesserung für AL', () => {
    const history = makeHistory({
      al: [5, 4.69],  // delta = -0.31, über Schwelle
      hh: [1, 1],
      gi: [30, 30],
      zf: [55, 55],
    });
    expect(berechneSVRNote(history)).toBe('D');
  });

  it('Array mit weniger als 2 Einträgen → keine Verbesserung für diese KPI', () => {
    const history = makeHistory({
      al: [5],  // nur 1 Eintrag → skip
      hh: [1, 4],  // verbessert
      gi: [30, 25], // verbessert
      zf: [50, 60], // verbessert
    });
    // nur hh, gi, zf verbessert (al hat zu wenig Einträge) → 3 → Note B
    expect(berechneSVRNote(history)).toBe('B');
  });

  it('gibt gültige Note zurück (A/B/C/D/F)', () => {
    const validNotes: SVRNote[] = ['A', 'B', 'C', 'D', 'F'];
    const result = berechneSVRNote(makeHistory());
    expect(validNotes).toContain(result);
  });
});

describe('naechsterGutachtenMonat', () => {
  it('Monat 0 → nächster Gutachtenmonat ist 6', () => {
    expect(naechsterGutachtenMonat(0)).toBe(6);
  });

  it('Monat 5 → nächster Gutachtenmonat ist 6', () => {
    expect(naechsterGutachtenMonat(5)).toBe(6);
  });

  it('Monat 6 → nächster Gutachtenmonat ist 18 (6 ist überschritten)', () => {
    expect(naechsterGutachtenMonat(6)).toBe(18);
  });

  it('Monat 17 → nächster Gutachtenmonat ist 18', () => {
    expect(naechsterGutachtenMonat(17)).toBe(18);
  });

  it('Monat 18 → nächster Gutachtenmonat ist 30', () => {
    expect(naechsterGutachtenMonat(18)).toBe(30);
  });

  it('Monat 30 → nächster Gutachtenmonat ist 42', () => {
    expect(naechsterGutachtenMonat(30)).toBe(42);
  });

  it('Monat 42 → 99 (kein weiterer Gutachtenmonat)', () => {
    expect(naechsterGutachtenMonat(42)).toBe(99);
  });

  it('Monat 48 → 99 (Legislatur abgelaufen)', () => {
    expect(naechsterGutachtenMonat(48)).toBe(99);
  });
});
