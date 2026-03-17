import { describe, it, expect } from 'vitest';
import { generateKPIVariation, shuffleMoods } from './procgen';
import type { KPI, Character } from '../types';

const BASE_KPI: KPI = { al: 5.2, hh: 0.3, gi: 31.2, zf: 62 };

describe('generateKPIVariation', () => {
  it('gibt KPI mit gleichen Schlüsseln zurück', () => {
    const result = generateKPIVariation(BASE_KPI, 42);
    expect(result).toHaveProperty('al');
    expect(result).toHaveProperty('hh');
    expect(result).toHaveProperty('gi');
    expect(result).toHaveProperty('zf');
  });

  it('variiert Werte um die Basis herum', () => {
    const result = generateKPIVariation(BASE_KPI, 42);
    // Werte sollten innerhalb definierter Ranges liegen
    expect(result.al).toBeGreaterThanOrEqual(2);
    expect(result.al).toBeLessThanOrEqual(12);
    expect(result.hh).toBeGreaterThanOrEqual(-2);
    expect(result.hh).toBeLessThanOrEqual(1.5);
    expect(result.gi).toBeGreaterThanOrEqual(25);
    expect(result.gi).toBeLessThanOrEqual(38);
    expect(result.zf).toBeGreaterThanOrEqual(40);
    expect(result.zf).toBeLessThanOrEqual(75);
  });

  it('ist deterministisch mit gleichem Seed', () => {
    const r1 = generateKPIVariation(BASE_KPI, 123);
    const r2 = generateKPIVariation(BASE_KPI, 123);
    expect(r1).toEqual(r2);
  });

  it('erzeugt unterschiedliche Ergebnisse mit verschiedenen Seeds', () => {
    const r1 = generateKPIVariation(BASE_KPI, 1);
    const r2 = generateKPIVariation(BASE_KPI, 9999);
    // Mindestens ein Wert sollte sich unterscheiden
    expect(r1.al !== r2.al || r1.hh !== r2.hh || r1.gi !== r2.gi || r1.zf !== r2.zf).toBe(true);
  });
});

describe('shuffleMoods', () => {
  const chars: Character[] = [
    {
      id: 'fm', name: 'FM', role: 'FM', initials: 'FM', color: '#000', mood: 2, loyalty: 3,
      bio: '', interests: [], bonus: { trigger: '', desc: '', applies: '' },
      ultimatum: { moodThresh: 0, event: '' },
    },
    {
      id: 'wm', name: 'WM', role: 'WM', initials: 'WM', color: '#000', mood: 3, loyalty: 4,
      bio: '', interests: [], bonus: { trigger: '', desc: '', applies: '' },
      ultimatum: { moodThresh: 0, event: '' },
    },
  ];

  it('gibt gleiche Anzahl Characters zurück', () => {
    const result = shuffleMoods(chars, 42);
    expect(result).toHaveLength(2);
  });

  it('clampt Mood auf 0-4', () => {
    const result = shuffleMoods(chars, 42);
    for (const c of result) {
      expect(c.mood).toBeGreaterThanOrEqual(0);
      expect(c.mood).toBeLessThanOrEqual(4);
    }
  });

  it('clampt Loyalty auf 0-5', () => {
    const result = shuffleMoods(chars, 42);
    for (const c of result) {
      expect(c.loyalty).toBeGreaterThanOrEqual(0);
      expect(c.loyalty).toBeLessThanOrEqual(5);
    }
  });

  it('ist deterministisch mit gleichem Seed', () => {
    const r1 = shuffleMoods(chars, 123);
    const r2 = shuffleMoods(chars, 123);
    expect(r1).toEqual(r2);
  });

  it('behält andere Character-Felder bei', () => {
    const result = shuffleMoods(chars, 42);
    expect(result[0].id).toBe('fm');
    expect(result[0].name).toBe('FM');
    expect(result[1].id).toBe('wm');
  });
});
