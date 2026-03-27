import { describe, it, expect } from 'vitest';
import { formatMedienklima, formatStimmung } from './medienDisplay';

describe('formatMedienklima (SMA-409/410)', () => {
  it('rundet und clamped 0–100', () => {
    expect(formatMedienklima(600 / 11)).toBe('55');
    expect(formatMedienklima(54.4)).toBe('54');
    expect(formatMedienklima(-5)).toBe('0');
    expect(formatMedienklima(105)).toBe('100');
  });
  it('behandelt -0 wie 0', () => {
    expect(formatMedienklima(-0)).toBe('0');
  });
});

describe('formatStimmung', () => {
  it('rundet Stimmung', () => {
    expect(formatStimmung(12.7)).toBe('13');
    expect(formatStimmung(-0)).toBe('0');
  });
});
