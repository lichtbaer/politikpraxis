import { describe, it, expect } from 'vitest';
import { getMedienMultiplikator, getMedienPkZusatzkosten, berechneMedianklima } from './medienAkteure';
import type { GameState } from '../../types';

describe('getMedienMultiplikator (linear: 0→0.7, 50→1.0, 100→1.3)', () => {
  it('k = 0 → 0.7', () => {
    expect(getMedienMultiplikator(0)).toBe(0.7);
  });

  it('k = 50 → 1.0', () => {
    expect(getMedienMultiplikator(50)).toBe(1.0);
  });

  it('k = 100 → 1.3', () => {
    expect(getMedienMultiplikator(100)).toBe(1.3);
  });

  it('interpoliert linear zwischen Extremen', () => {
    expect(getMedienMultiplikator(25)).toBe(0.85);
    expect(getMedienMultiplikator(75)).toBe(1.15);
  });

  it('clamped auf 0–100', () => {
    expect(getMedienMultiplikator(-10)).toBe(0.7);
    expect(getMedienMultiplikator(110)).toBe(1.3);
  });
});

describe('berechneMedianklima (SMA-390)', () => {
  it('gewichteter Index aus Akteuren', () => {
    const G = {
      medienKlima: 50,
      medienAkteure: {
        a: { stimmung: 10, reichweite: 50 },
        b: { stimmung: -10, reichweite: 50 },
      },
    } as unknown as GameState;
    expect(berechneMedianklima(G)).toBe(50);
  });

  it('Alternativ >10% Reichweite: Malus −5', () => {
    const G = {
      medienKlima: 50,
      medienAkteure: {
        alternativ: { stimmung: 0, reichweite: 12 },
      },
    } as unknown as GameState;
    expect(berechneMedianklima(G)).toBe(45);
  });

  it('effektive Stimmung: Buff bis bisMonat (SMA-392)', () => {
    const G = {
      month: 5,
      medienKlima: 50,
      medienAkteure: {
        boulevard: { stimmung: 0, reichweite: 100 },
      },
      medienAkteurBuffs: {
        boulevard: { stimmung: 10, bisMonat: 5 },
      },
    } as unknown as GameState;
    expect(berechneMedianklima(G)).toBe(55);
  });

  it('SMA-409: gewichtete Berechnung wird ganzzahlig gerundet', () => {
    const G = {
      medienKlima: 50,
      medienAkteure: {
        a: { stimmung: 10, reichweite: 33 },
        b: { stimmung: -7, reichweite: 67 },
      },
    } as unknown as GameState;
    const raw = 50 + (10 * 33 / 100 + (-7) * 67 / 100) / 2;
    expect(raw).not.toBe(Math.round(raw));
    expect(berechneMedianklima(G)).toBe(Math.round(raw));
  });
});

describe('getMedienPkZusatzkosten', () => {
  it('medienKlima >= 20 → 0', () => {
    expect(getMedienPkZusatzkosten(20)).toBe(0);
    expect(getMedienPkZusatzkosten(55)).toBe(0);
  });

  it('medienKlima < 20 → 3', () => {
    expect(getMedienPkZusatzkosten(19)).toBe(3);
    expect(getMedienPkZusatzkosten(0)).toBe(3);
  });
});
