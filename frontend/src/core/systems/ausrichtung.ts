import type { GameState } from '../types';

export interface Ausrichtung {
  wirtschaft: number;   // -100 Umverteilung … +100 Wachstum
  gesellschaft: number; // -100 Offenheit … +100 Ordnung
  staat: number;       // -100 Gemeinschaft … +100 Eigenverantwortung
}

/** Wendet die politische Ausrichtung einmalig auf den Spielstart-State an. */
export function applyAusrichtung(state: GameState, ausrichtung: Ausrichtung): GameState {
  let next = { ...state };

  // Wirtschaft: Umverteilung (negativ) vs Wachstum (positiv)
  if (ausrichtung.wirtschaft < 0) {
    const scale = Math.abs(ausrichtung.wirtschaft) / 100;
    next = {
      ...next,
      zust: {
        ...next.zust,
        arbeit: Math.max(0, Math.min(100, next.zust.arbeit + 8 * scale)),
        mitte: Math.max(0, Math.min(100, next.zust.mitte - 5 * scale)),
      },
      chars: next.chars.map((c) =>
        (c.ressort === 'finanzen' || c.id === 'fm') ? { ...c, loyalty: Math.max(0, Math.min(5, Math.round(c.loyalty - 1 * scale))) } : c
      ),
    };
  } else if (ausrichtung.wirtschaft > 0) {
    const scale = ausrichtung.wirtschaft / 100;
    next = {
      ...next,
      zust: {
        ...next.zust,
        mitte: Math.max(0, Math.min(100, next.zust.mitte + 8 * scale)),
        arbeit: Math.max(0, Math.min(100, next.zust.arbeit - 5 * scale)),
      },
      chars: next.chars.map((c) =>
        (c.ressort === 'wirtschaft' || c.id === 'wm') ? { ...c, loyalty: Math.min(5, Math.round(c.loyalty + 1 * scale)) } : c
      ),
    };
  }

  // Gesellschaft: Offenheit (negativ) vs Ordnung (positiv)
  if (ausrichtung.gesellschaft < 0) {
    const scale = Math.abs(ausrichtung.gesellschaft) / 100;
    next = {
      ...next,
      zust: {
        ...next.zust,
        prog: Math.max(0, Math.min(100, next.zust.prog + 10 * scale)),
      },
      chars: next.chars.map((c) => {
        if (c.ressort === 'innen' || c.id === 'im') return { ...c, mood: Math.max(0, Math.round(c.mood - 1 * scale)) };
        if (c.ressort === 'justiz' || c.id === 'jm') return { ...c, mood: Math.min(4, Math.round(c.mood + 1 * scale)) };
        return c;
      }),
    };
  } else if (ausrichtung.gesellschaft > 0) {
    const scale = ausrichtung.gesellschaft / 100;
    next = {
      ...next,
      zust: {
        ...next.zust,
        prog: Math.max(0, Math.min(100, next.zust.prog - 8 * scale)),
      },
      chars: next.chars.map((c) =>
        (c.ressort === 'innen' || c.id === 'im') ? { ...c, mood: Math.min(4, Math.round(c.mood + 1 * scale)) } : c
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
