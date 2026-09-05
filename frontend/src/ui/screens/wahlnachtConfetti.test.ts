/**
 * #284: Wahlnacht Feier-Inszenierung — reines CSS-Konfetti bei Wahlsieg, keine neue Abhängigkeit.
 */
import { describe, it, expect } from 'vitest';
import { generateConfettiPieces } from './wahlnachtConfetti';

describe('generateConfettiPieces', () => {
  it('erzeugt 18 Konfetti-Teile', () => {
    expect(generateConfettiPieces()).toHaveLength(18);
  });

  it('jedes Teil hat gültige Werte für Position, Timing und Rotation', () => {
    for (const piece of generateConfettiPieces()) {
      expect(piece.left).toBeGreaterThanOrEqual(-3);
      expect(piece.left).toBeLessThanOrEqual(103);
      expect(piece.delay).toBeGreaterThanOrEqual(0);
      expect(piece.delay).toBeLessThan(0.5);
      expect(piece.duration).toBeGreaterThanOrEqual(2.1);
      expect(piece.duration).toBeLessThan(3.4);
      expect(piece.rotateTo).toBeGreaterThan(piece.rotateFrom);
      expect(typeof piece.color).toBe('string');
    }
  });

  it('generiert bei jedem Aufruf neue Zufallswerte (keine feste Fixture)', () => {
    const a = generateConfettiPieces();
    const b = generateConfettiPieces();
    expect(a.map((p) => p.left)).not.toEqual(b.map((p) => p.left));
  });
});
