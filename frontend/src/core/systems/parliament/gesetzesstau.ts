import type { GameState } from '../../types';
import { addLog } from '../../log';

/**
 * SMA-268: "Gesetzesstau" — reines Durchpeitschen von Gesetzen ohne Koalitions-/
 * Kabinettspflege kostet Stimmung und Koalitionsbeziehung. Ab dem (SCHWELLE + 1)-ten
 * Gesetz in Folge ohne eine Pflege-Aktion (Koalitionsrunde, Kabinettsgespräch,
 * Verbandsgespräch, Prioritätsgespräch, Ländergipfel) greift der Malus — und zwar bei
 * jedem weiteren Einbringen erneut, bis wieder gepflegt wird.
 */
export const GESETZESSTAU_SCHWELLE = 2;
export const GESETZESSTAU_BEZIEHUNG_MALUS = 6;
export const GESETZESSTAU_MOOD_MALUS = 0.5;
/**
 * Verwaltungsmehrkosten (Mrd. EUR, saldoKumulativ) pro Gesetz über der Schwelle:
 * Eilverfahren, Rechtsgutachten und Nachbesserungen ohne politische Flankierung kosten echtes Geld.
 */
export const GESETZESSTAU_HAUSHALT_MALUS = 3;

/** Beim Einbringen eines Gesetzes aufzurufen: erhöht den Pflege-losen Streak und wendet ab der Schwelle den Malus an. */
export function registerGesetzEinbringung(state: GameState): GameState {
  const streak = state.gesetzeSeitLetzterPflege ?? 0;
  let next: GameState = { ...state, gesetzeSeitLetzterPflege: streak + 1 };

  if (streak < GESETZESSTAU_SCHWELLE) return next;

  if (next.koalitionspartner) {
    next = {
      ...next,
      koalitionspartner: {
        ...next.koalitionspartner,
        beziehung: Math.max(0, next.koalitionspartner.beziehung - GESETZESSTAU_BEZIEHUNG_MALUS),
      },
    };
  }

  const kabinett = next.chars.filter((c) => !c.ist_kanzler);
  if (kabinett.length > 0) {
    next = {
      ...next,
      chars: next.chars.map((c) =>
        c.ist_kanzler ? c : { ...c, mood: Math.max(0, c.mood - GESETZESSTAU_MOOD_MALUS) },
      ),
    };
  }

  if (next.haushalt) {
    next = {
      ...next,
      haushalt: {
        ...next.haushalt,
        saldoKumulativ: next.haushalt.saldoKumulativ - GESETZESSTAU_HAUSHALT_MALUS,
      },
    };
  }

  return addLog(
    next,
    'Gesetzesstau: Eilverfahren ohne Koalitions-/Kabinettspflege kosten Stimmung, Koalitionsbeziehung und Haushalt',
    'r',
  );
}

/** Von Pflege-Aktionen (Koalitionsrunde, Kabinettsgespräch, Verbandsgespräch, Prioritätsgespräch, Ländergipfel) aufzurufen. */
export function resetGesetzesstau(state: GameState): GameState {
  if (!state.gesetzeSeitLetzterPflege) return state;
  return { ...state, gesetzeSeitLetzterPflege: 0 };
}
