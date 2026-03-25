import type { GameState } from '../types';

/**
 * Berechnet Koalitionsstabilität aus:
 * - Durchschnittlicher Minister-Stimmung (35%)
 * - Durchschnittlicher Minister-Loyalität (35%)
 * - Koalitionspartner-Beziehung (30%, wenn vorhanden)
 *
 * Zusätzlich: Warnung im Log wenn Stabilität unter Krisengrenze fällt (< 30)
 * und noch kein Koalitionsbruch läuft.
 */
export function updateCoalitionStability(state: GameState): GameState {
  const kabinett = state.chars.filter((c) => !c.ist_kanzler);
  const count = kabinett.length || state.chars.length;
  const chars = count === kabinett.length ? kabinett : state.chars;

  const avgMood = chars.reduce((s, c) => s + c.mood, 0) / count;
  const avgLoy = chars.reduce((s, c) => s + c.loyalty, 0) / count;

  const partnerBeziehung = state.koalitionspartner?.beziehung;
  let coalition: number;

  if (partnerBeziehung != null) {
    // Mit Koalitionspartner: Mood 35% + Loyalität 35% + Beziehung 30%
    coalition = Math.round(
      (avgMood / 4) * 35 +
      (avgLoy / 5) * 35 +
      (partnerBeziehung / 100) * 30,
    );
  } else {
    // Ohne Partner: Mood 50% + Loyalität 50%
    coalition = Math.round((avgMood / 4) * 50 + (avgLoy / 5) * 50);
  }

  coalition = Math.min(100, Math.max(0, coalition));
  return { ...state, coalition };
}
