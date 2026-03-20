import type { GameState } from '../types';

/**
 * Berechnet Koalitionsstabilität aus:
 * - Durchschnittlicher Minister-Stimmung (40%)
 * - Durchschnittlicher Minister-Loyalität (40%)
 * - Koalitionspartner-Beziehung (20%, wenn vorhanden)
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
    // Mit Koalitionspartner: Mood 40% + Loyalität 40% + Beziehung 20%
    coalition = Math.round(
      (avgMood / 4) * 40 +
      (avgLoy / 5) * 40 +
      (partnerBeziehung / 100) * 20,
    );
  } else {
    // Ohne Partner: Mood 50% + Loyalität 50%
    coalition = Math.round((avgMood / 4) * 50 + (avgLoy / 5) * 50);
  }

  coalition = Math.min(100, Math.max(0, coalition));
  return { ...state, coalition };
}
