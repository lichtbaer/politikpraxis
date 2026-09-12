/**
 * SMA-503: Koalitions-Agenda beim Spielstart aus Content ableiten (nicht wählbar).
 */
import type { ContentBundle, GameState } from './types';

/** Anzahl fixer Koalitionsziele je Komplexitätsstufe (Design SMA-503). */
export function koalitionsAgendaZielAnzahl(complexity: number): number {
  if (complexity <= 1) return 0;
  if (complexity === 2) return 1;
  if (complexity === 3) return 2;
  return 3;
}

/**
 * Anzahl frei wählbarer Spieler-Agendaziele je Komplexitätsstufe.
 *
 * `verfuegbar` deckelt die Vorgabe auf das, was der geladene Content tatsächlich anbietet.
 * Ohne diese Deckelung lässt sich das Onboarding nicht abschließen, wenn der Zielpool
 * kleiner ist als die Stufenvorgabe — genau das passierte im Offline-Fallback
 * (2 Ziele im Bundle, 3 gefordert).
 */
export function spielerAgendaZielAnzahl(complexity: number, verfuegbar: number): number {
  const soll = complexity === 2 ? 2 : complexity >= 3 ? 3 : 0;
  return Math.min(soll, Math.max(0, verfuegbar));
}

/**
 * Wählt die ersten N passenden Koalitionsziele für den aktuellen Partner (deterministisch nach ID).
 */
export function pickInitialKoalitionsAgenda(
  state: GameState,
  content: ContentBundle,
  complexity: number,
): string[] {
  const n = koalitionsAgendaZielAnzahl(complexity);
  if (n <= 0) return [];
  const partnerId = state.koalitionspartner?.id;
  const alle = content.koalitionsZiele ?? [];
  if (!partnerId || alle.length === 0) return [];
  const pool = alle
    .filter((z) => z.partner_profil === partnerId && z.min_complexity <= complexity)
    .map((z) => z.id)
    .sort((a, b) => a.localeCompare(b));
  return pool.slice(0, n);
}

export function withInitialKoalitionsAgenda(
  state: GameState,
  content: ContentBundle,
  complexity: number,
): GameState {
  const ids = pickInitialKoalitionsAgenda(state, content, complexity);
  if (ids.length === 0) return state;
  return { ...state, koalitionsAgenda: ids };
}
