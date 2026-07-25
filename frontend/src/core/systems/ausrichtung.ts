import type { GameState } from '../types';
import { addZustOffset } from './economics/economy';

export interface Ausrichtung {
  wirtschaft: number;   // -100 Umverteilung … +100 Wachstum
  gesellschaft: number; // -100 Offenheit … +100 Ordnung
  staat: number;       // -100 Gemeinschaft … +100 Eigenverantwortung
}

/**
 * Wendet die politische Ausrichtung einmalig auf den Spielstart-State an.
 * Segment-Änderungen gehen zusätzlich in zustOffsets, damit sie den ersten
 * recalcApproval-Tick überleben und über mehrere Monate abklingen.
 */
export function applyAusrichtung(state: GameState, ausrichtung: Ausrichtung): GameState {
  let next = { ...state };

  const bumpSegment = (s: GameState, segment: 'arbeit' | 'mitte' | 'prog', delta: number): GameState => ({
    ...s,
    zust: {
      ...s.zust,
      [segment]: Math.max(0, Math.min(100, s.zust[segment] + delta)),
    },
    zustOffsets: addZustOffset(s.zustOffsets, segment, delta),
  });

  // Wirtschaft: Umverteilung (negativ) vs Wachstum (positiv)
  if (ausrichtung.wirtschaft < 0) {
    const scale = Math.abs(ausrichtung.wirtschaft) / 100;
    next = bumpSegment(bumpSegment(next, 'arbeit', 8 * scale), 'mitte', -5 * scale);
    next = {
      ...next,
      chars: next.chars.map((c) =>
        c.ressort === 'finanzen' ? { ...c, loyalty: Math.max(0, Math.min(5, Math.round(c.loyalty - 1 * scale))) } : c
      ),
    };
  } else if (ausrichtung.wirtschaft > 0) {
    const scale = ausrichtung.wirtschaft / 100;
    next = bumpSegment(bumpSegment(next, 'mitte', 8 * scale), 'arbeit', -5 * scale);
    next = {
      ...next,
      chars: next.chars.map((c) =>
        c.ressort === 'wirtschaft' ? { ...c, loyalty: Math.min(5, Math.round(c.loyalty + 1 * scale)) } : c
      ),
    };
  }

  // Gesellschaft: Offenheit (negativ) vs Ordnung (positiv)
  if (ausrichtung.gesellschaft < 0) {
    const scale = Math.abs(ausrichtung.gesellschaft) / 100;
    next = bumpSegment(next, 'prog', 10 * scale);
    next = {
      ...next,
      chars: next.chars.map((c) => {
        if (c.ressort === 'innen') return { ...c, mood: Math.max(0, Math.round(c.mood - 1 * scale)) };
        if (c.ressort === 'justiz') return { ...c, mood: Math.min(4, Math.round(c.mood + 1 * scale)) };
        return c;
      }),
    };
  } else if (ausrichtung.gesellschaft > 0) {
    const scale = ausrichtung.gesellschaft / 100;
    next = bumpSegment(next, 'prog', -8 * scale);
    next = {
      ...next,
      chars: next.chars.map((c) =>
        c.ressort === 'innen' ? { ...c, mood: Math.min(4, Math.round(c.mood + 1 * scale)) } : c
      ),
    };
  }

  // Staat: Gemeinschaft (negativ) vs Eigenverantwortung (positiv)
  if (ausrichtung.staat < 0) {
    const scale = Math.abs(ausrichtung.staat) / 100;
    next = {
      ...next,
      bundesratFraktionen: next.bundesratFraktionen.map((f) => {
        if (f.id === 'koalitionstreue') return { ...f, beziehung: Math.min(100, f.beziehung + 8 * scale) };
        if (f.id === 'ostblock') return { ...f, beziehung: Math.min(100, f.beziehung + 5 * scale) };
        return f;
      }),
    };
  } else if (ausrichtung.staat > 0) {
    const scale = ausrichtung.staat / 100;
    next = {
      ...next,
      bundesratFraktionen: next.bundesratFraktionen.map((f) => {
        if (f.id === 'konservativer_block') return { ...f, beziehung: Math.min(100, f.beziehung + 10 * scale) };
        if (f.id === 'pragmatische_mitte') return { ...f, beziehung: Math.min(100, f.beziehung + 5 * scale) };
        return f;
      }),
    };
  }

  return next;
}
