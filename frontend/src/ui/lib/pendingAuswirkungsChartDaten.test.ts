import { describe, expect, it } from 'vitest';
import { buildPendingAuswirkungsChartDaten } from './pendingAuswirkungsChartDaten';

describe('buildPendingAuswirkungsChartDaten', () => {
  it('füllt Monatslücken mit Nullen', () => {
    const pending = [
      { month: 5, key: 'al' as const, delta: -1, label: 'Gesetz A', gesetzId: 'g1' },
      { month: 7, key: 'al' as const, delta: 2, label: 'Gesetz A', gesetzId: 'g1' },
    ];
    const d = buildPendingAuswirkungsChartDaten(pending, 3);
    expect(d).not.toBeNull();
    expect(d!.monate).toEqual([5, 6, 7]);
    expect(d!.gesetze).toHaveLength(1);
    expect(d!.gesetze[0].effekte.al).toEqual([-1, 0, 2]);
    expect(d!.gesamteffekt.al).toEqual([-1, 0, 2]);
  });

  it('trennt zwei Gesetze und weist Farben zu', () => {
    const pending = [
      { month: 6, key: 'zf' as const, delta: 4, label: 'KIFG', gesetzId: 'kifg' },
      { month: 6, key: 'hh' as const, delta: 0.5, label: 'Anders', gesetzId: 'other' },
    ];
    const d = buildPendingAuswirkungsChartDaten(pending, 3);
    expect(d!.gesetze).toHaveLength(2);
    expect(d!.gesetze[0].farbe).toBe('#e74c3c');
    expect(d!.gesetze[1].farbe).toBe('#3498db');
    expect(d!.gesamteffekt.zf[0]).toBe(4);
    expect(d!.gesamteffekt.hh[0]).toBe(0.5);
  });

  it('nutzt getLawTitel für Anzeigenamen', () => {
    const pending = [
      { month: 4, key: 'al' as const, delta: 1, label: 'Kurz', gesetzId: 'law-1' },
    ];
    const d = buildPendingAuswirkungsChartDaten(pending, 1, (id) =>
      id === 'law-1' ? 'Langtitel' : undefined,
    );
    expect(d!.gesetze[0].titel_de).toBe('Langtitel');
  });
});
