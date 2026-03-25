import { describe, it, expect } from 'vitest';
import { updateCoalitionStability } from './coalition';
import { makeState, makeChar } from '../test-helpers';

describe('updateCoalitionStability', () => {
  it('berechnet Stabilität basierend auf Mood und Loyalität', () => {
    const state = makeState({
      chars: [
        makeChar({ id: 'k', ist_kanzler: true, mood: 4, loyalty: 5 }),
        makeChar({ id: 'a', mood: 4, loyalty: 5 }),
        makeChar({ id: 'b', mood: 4, loyalty: 5 }),
      ],
      koalitionspartner: undefined,
    });
    const result = updateCoalitionStability(state);
    // Ohne Partner: (4/4)*50 + (5/5)*50 = 100
    expect(result.coalition).toBe(100);
  });

  it('niedrige Mood senkt Stabilität', () => {
    const highMood = makeState({
      chars: [
        makeChar({ id: 'k', ist_kanzler: true, mood: 4, loyalty: 3 }),
        makeChar({ id: 'a', mood: 4, loyalty: 3 }),
      ],
      koalitionspartner: undefined,
    });
    const lowMood = makeState({
      chars: [
        makeChar({ id: 'k', ist_kanzler: true, mood: 1, loyalty: 3 }),
        makeChar({ id: 'a', mood: 1, loyalty: 3 }),
      ],
      koalitionspartner: undefined,
    });
    expect(updateCoalitionStability(highMood).coalition)
      .toBeGreaterThan(updateCoalitionStability(lowMood).coalition);
  });

  it('berücksichtigt Koalitionspartner-Beziehung', () => {
    const ministers = [
      makeChar({ id: 'k', ist_kanzler: true, mood: 3, loyalty: 3 }),
      makeChar({ id: 'a', mood: 3, loyalty: 3 }),
    ];
    const goodPartner = makeState({
      chars: ministers,
      koalitionspartner: {
        id: 'gp',
        beziehung: 100,
        koalitionsvertragScore: 0,
        schluesselthemenErfuellt: [],
      },
    });
    const badPartner = makeState({
      chars: ministers,
      koalitionspartner: {
        id: 'gp',
        beziehung: 10,
        koalitionsvertragScore: 0,
        schluesselthemenErfuellt: [],
      },
    });
    expect(updateCoalitionStability(goodPartner).coalition)
      .toBeGreaterThan(updateCoalitionStability(badPartner).coalition);
  });

  it('clampt Ergebnis auf 0-100', () => {
    const maxState = makeState({
      chars: [
        makeChar({ id: 'k', ist_kanzler: true, mood: 4, loyalty: 5 }),
        makeChar({ id: 'a', mood: 4, loyalty: 5 }),
      ],
      koalitionspartner: {
        id: 'gp',
        beziehung: 100,
        koalitionsvertragScore: 0,
        schluesselthemenErfuellt: [],
      },
    });
    const result = updateCoalitionStability(maxState);
    expect(result.coalition).toBeLessThanOrEqual(100);
    expect(result.coalition).toBeGreaterThanOrEqual(0);
  });

  it('exkludiert Kanzler bei Berechnung (verwendet nur Kabinett)', () => {
    // Kanzler mit Mood 0, Minister mit Mood 4 → Kanzler sollte nicht zählen
    const state = makeState({
      chars: [
        makeChar({ id: 'k', ist_kanzler: true, mood: 0, loyalty: 0 }),
        makeChar({ id: 'a', mood: 4, loyalty: 5 }),
        makeChar({ id: 'b', mood: 4, loyalty: 5 }),
      ],
      koalitionspartner: undefined,
    });
    const result = updateCoalitionStability(state);
    // Nur Minister: (4/4)*50 + (5/5)*50 = 100
    expect(result.coalition).toBe(100);
  });

  it('verwendet alle Chars wenn kein Kabinett existiert', () => {
    const state = makeState({
      chars: [
        makeChar({ id: 'k', ist_kanzler: true, mood: 2, loyalty: 3 }),
      ],
      koalitionspartner: undefined,
    });
    // Nur Kanzler → filter gibt leeres Array → fallback auf alle chars
    const result = updateCoalitionStability(state);
    expect(result.coalition).toBeGreaterThanOrEqual(0);
    expect(result.coalition).toBeLessThanOrEqual(100);
  });
});
