import { describe, expect, it } from 'vitest';
import { berechneMedienSpielerPerspektive } from './medienSpielerPerspektive';

describe('berechneMedienSpielerPerspektive', () => {
  it('alternativ: positives Delta (Reichweite) = negativ für Spieler', () => {
    expect(berechneMedienSpielerPerspektive('alternativ', 1)).toBe('negativ');
    expect(berechneMedienSpielerPerspektive('alternativ', 0.5)).toBe('negativ');
  });

  it('alternativ: negatives Delta = positiv für Spieler', () => {
    expect(berechneMedienSpielerPerspektive('alternativ', -1)).toBe('positiv');
  });

  it('konservativ: positives Delta = negativ für Spieler', () => {
    expect(berechneMedienSpielerPerspektive('konservativ', 2)).toBe('negativ');
  });

  it('konservativ: negatives Delta = positiv für Spieler', () => {
    expect(berechneMedienSpielerPerspektive('konservativ', -2)).toBe('positiv');
  });

  it('boulevard: Vorzeichen entspricht Spieler-Perspektive', () => {
    expect(berechneMedienSpielerPerspektive('boulevard', 3)).toBe('positiv');
    expect(berechneMedienSpielerPerspektive('boulevard', -2)).toBe('negativ');
  });

  it('öffentlich / Qualität / Social wie Boulevard', () => {
    expect(berechneMedienSpielerPerspektive('oeffentlich', 1)).toBe('positiv');
    expect(berechneMedienSpielerPerspektive('qualitaet', -1)).toBe('negativ');
    expect(berechneMedienSpielerPerspektive('social', 4)).toBe('positiv');
  });
});
