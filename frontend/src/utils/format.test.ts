/**
 * SMA-317: Tests für formatMrd / formatMrdSaldo — -0 abfangen
 */
import { describe, it, expect } from 'vitest';
import { formatMrd, formatMrdSaldo, formatMedienklimaDisplay, normalizeZero } from './format';

describe('format', () => {
  describe('normalizeZero', () => {
    it('wandelt -0 in 0 um', () => {
      expect(normalizeZero(-0)).toBe(0);
      expect(Object.is(normalizeZero(-0), -0)).toBe(false);
    });
    it('lässt 0 und andere Werte unverändert', () => {
      expect(normalizeZero(0)).toBe(0);
      expect(normalizeZero(5)).toBe(5);
      expect(normalizeZero(-3)).toBe(-3);
    });
  });

  describe('formatMrd', () => {
    it('zeigt "0,0 Mrd. €" für 0 und -0 (kein "-0.0 Mrd.")', () => {
      expect(formatMrd(0)).toBe('0,0 Mrd. €');
      expect(formatMrd(-0)).toBe('0,0 Mrd. €');
    });
    it('formatiert positive Werte mit +', () => {
      expect(formatMrd(12.5)).toBe('+12.5 Mrd. €');
    });
    it('formatiert negative Werte mit −', () => {
      expect(formatMrd(-8.3)).toBe('−8.3 Mrd. €');
    });
  });

  describe('formatMrdSaldo', () => {
    it('zeigt "0,0 Mrd." für 0 und -0', () => {
      expect(formatMrdSaldo(0)).toBe('0,0 Mrd.');
      expect(formatMrdSaldo(-0)).toBe('0,0 Mrd.');
    });
    it('zeigt "0 Mrd." für 0 mit decimals=0', () => {
      expect(formatMrdSaldo(0, 0)).toBe('0 Mrd.');
      expect(formatMrdSaldo(-0, 0)).toBe('0 Mrd.');
    });
    it('formatiert positive und negative Werte', () => {
      expect(formatMrdSaldo(10.2)).toBe('+10.2 Mrd.');
      expect(formatMrdSaldo(-5.1)).toBe('−5.1 Mrd.');
    });
  });

  describe('formatMedienklimaDisplay (SMA-409)', () => {
    it('rundet und clamped 0–100', () => {
      expect(formatMedienklimaDisplay(600 / 11)).toBe('55'); // periodischer Float (≈54.545…)
      expect(formatMedienklimaDisplay(54.4)).toBe('54');
      expect(formatMedienklimaDisplay(-5)).toBe('0');
      expect(formatMedienklimaDisplay(105)).toBe('100');
    });
    it('behandelt -0 wie 0', () => {
      expect(formatMedienklimaDisplay(-0)).toBe('0');
    });
  });
});
