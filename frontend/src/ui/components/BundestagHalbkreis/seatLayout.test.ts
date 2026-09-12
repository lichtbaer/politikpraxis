import { describe, it, expect } from 'vitest';
import { buildSeatLayout, seatRadius, type SeatLayoutOptions } from './seatLayout';

const OPTS: SeatLayoutOptions = { cx: 200, cy: 205, rInner: 92, rOuter: 178, rows: 11 };

describe('buildSeatLayout', () => {
  it('erzeugt exakt einen Punkt pro Sitz', () => {
    for (const total of [1, 7, 120, 598, 600, 736]) {
      expect(buildSeatLayout(total, OPTS)).toHaveLength(total);
    }
  });

  it('sortiert von links (π) nach rechts (0) — der Sitzordnung entsprechend', () => {
    const seats = buildSeatLayout(300, OPTS);
    for (let i = 1; i < seats.length; i++) {
      expect(seats[i].angle).toBeLessThanOrEqual(seats[i - 1].angle);
    }
    expect(seats[0].x).toBeLessThan(seats[seats.length - 1].x);
  });

  it('hält alle Punkte in der oberen Halbebene innerhalb der Radien', () => {
    for (const s of buildSeatLayout(600, OPTS)) {
      const d = Math.hypot(s.x - OPTS.cx, s.y - OPTS.cy);
      expect(d).toBeGreaterThanOrEqual(OPTS.rInner - 0.01);
      expect(d).toBeLessThanOrEqual(OPTS.rOuter + 0.01);
      expect(s.y).toBeLessThanOrEqual(OPTS.cy + 0.01);
    }
  });

  it('legt äußere Reihen dichter mit Sitzen als innere', () => {
    const seats = buildSeatLayout(600, OPTS);
    const proRadius = new Map<number, number>();
    for (const s of seats) {
      const d = Math.round(Math.hypot(s.x - OPTS.cx, s.y - OPTS.cy));
      proRadius.set(d, (proRadius.get(d) ?? 0) + 1);
    }
    const reihen = [...proRadius.entries()].sort((a, b) => a[0] - b[0]);
    expect(reihen).toHaveLength(OPTS.rows);
    expect(reihen[reihen.length - 1][1]).toBeGreaterThan(reihen[0][1]);
  });

  it('liefert nichts bei leerem Parlament', () => {
    expect(buildSeatLayout(0, OPTS)).toEqual([]);
    expect(buildSeatLayout(-5, OPTS)).toEqual([]);
  });

  it('wählt einen Punktradius, der Reihenabstand und Bogenabstand respektiert', () => {
    const r = seatRadius(OPTS, 600);
    const rowGap = (OPTS.rOuter - OPTS.rInner) / (OPTS.rows - 1);
    expect(r).toBeGreaterThan(1);
    expect(r * 2).toBeLessThanOrEqual(rowGap);
  });
});
