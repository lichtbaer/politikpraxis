import type { Ideologie as IdeologieType, Law, Milieu, GameState, GameEvent } from './types';

const DEFAULT_IDEOLOGIE: IdeologieType = { wirtschaft: 0, gesellschaft: 0, staat: 0 };

/**
 * Berechnet den Gesamt-Extremismus-Malus (SMA-280).
 * Formel pro Achse: ((|achsenwert| - 65) / 10)² × 4, Summe über alle 3 Achsen.
 * Nur Werte mit |achsenwert| > 65 tragen bei.
 */
export function getGesamtExtremismusMalus(ideologie: IdeologieType): number {
  const p = ideologie ?? DEFAULT_IDEOLOGIE;
  let malus = 0;
  for (const key of ['wirtschaft', 'gesellschaft', 'staat'] as const) {
    const v = p[key];
    const abs = Math.abs(v);
    if (abs > 65) {
      malus += Math.pow((abs - 65) / 10, 2) * 4;
    }
  }
  return Math.round(malus * 100) / 100;
}

/**
 * Berechnet die Kongruenz zwischen zwei Ideologie-Profilen.
 * Gewichtung: Wirtschaft 40%, Gesellschaft 35%, Staat 25%.
 * @returns Kongruenz-Score 0–100 (100 = identisch)
 */
export function berechneKongruenz(profil1: IdeologieType, profil2: IdeologieType): number {
  const p1 = profil1 ?? DEFAULT_IDEOLOGIE;
  const p2 = profil2 ?? DEFAULT_IDEOLOGIE;
  const distanz =
    (Math.abs(p1.wirtschaft - p2.wirtschaft) * 0.4 +
      Math.abs(p1.gesellschaft - p2.gesellschaft) * 0.35 +
      Math.abs(p1.staat - p2.staat) * 0.25) /
    2;
  return Math.round(100 - distanz);
}

/** Kongruenz Spieler (Ausrichtung) ↔ Gesetz */
export function gesetzKongruenz(
  spielerIdeologie: IdeologieType,
  gesetz: Law | undefined,
): number {
  if (!gesetz?.ideologie) return 50; // Neutral bei fehlendem Profil
  return berechneKongruenz(spielerIdeologie, gesetz.ideologie);
}

/** Kongruenz Milieu ↔ Gesetz (für Milieu-Reaktion) */
export function milieuGesetzKongruenz(milieu: Milieu, gesetz: Law): number {
  return berechneKongruenz(milieu.ideologie, gesetz.ideologie ?? DEFAULT_IDEOLOGIE);
}

/** Ideologie-Achse → Politikfeld-ID (für Verfassungsgericht, SMA-280) */
const ACHSE_TO_POLITIKFELD: Record<keyof IdeologieType, string> = {
  wirtschaft: 'wirtschaft_finanzen',
  gesellschaft: 'arbeit_soziales',
  staat: 'innere_sicherheit',
};

/**
 * Tick für Extremismus-Druck (SMA-280).
 * Triggert Events wenn getGesamtExtremismusMalus(ausrichtung) Schwellen überschreitet.
 * @returns Neuer State mit ggf. activeEvent
 */
export function tickExtremismusDruck(
  state: GameState,
  ausrichtung: IdeologieType,
  extremismusEvents: GameEvent[],
  complexity: number = 4,
): GameState {
  if (!extremismusEvents.length) return state;
  if (state.activeEvent) return state;

  const malus = getGesamtExtremismusMalus(ausrichtung);

  // Koalitionspartner-Warnung (einmalig ab Malus > 8, min_complexity 2)
  if (malus > 8 && !state.extremismusWarnung) {
    const ev = extremismusEvents.find((e) => e.id === 'koalitionspartner_extremismus_warnung');
    if (ev && (ev.min_complexity ?? 1) <= complexity) {
      return {
        ...state,
        extremismusWarnung: true,
        firedEvents: [...(state.firedEvents ?? []), ev.id],
        activeEvent: ev,
        speed: 0,
      };
    }
  }

  // Verfassungsgericht (einmalig ab Malus > 20, min_complexity 3)
  if (malus > 20 && !state.verfassungsgerichtAktiv) {
    const ev = extremismusEvents.find((e) => e.id === 'verfassungsgericht_klage');
    if (ev && (ev.min_complexity ?? 1) <= complexity) {
      const betroffeneFelder: string[] = [];
      const p = ausrichtung ?? DEFAULT_IDEOLOGIE;
      for (const key of ['wirtschaft', 'gesellschaft', 'staat'] as const) {
        if (Math.abs(p[key]) > 65) {
          betroffeneFelder.push(ACHSE_TO_POLITIKFELD[key]);
        }
      }
      if (betroffeneFelder.length === 0) {
        betroffeneFelder.push('wirtschaft_finanzen');
      }
      return {
        ...state,
        verfassungsgerichtAktiv: true,
        verfassungsgerichtVerfahrenBisMonat: state.month + 3,
        verfassungsgerichtPolitikfeldIds: betroffeneFelder,
        firedEvents: [...(state.firedEvents ?? []), ev.id],
        activeEvent: ev,
        speed: 0,
      };
    }
  }

  return state;
}
