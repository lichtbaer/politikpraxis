/**
 * SMA-503: Koalitions-Agenda beim Spielstart aus Content ableiten (nicht wählbar).
 */
import type { AgendaZielContent, ContentBundle, GameState } from './types';

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
  // Stufe 1 hat seit #267 ebenfalls eine (kleine) Agenda — ohne sie gab es dort kein Ziel
  // außer „nichts kaputt machen“, und die Legislatur war praktisch unverlierbar.
  const soll = complexity <= 2 ? 2 : 3;
  return Math.min(soll, Math.max(0, verfuegbar));
}

/**
 * Spieler-Agendaziele, die auf dieser Stufe für diese Partei wählbar sind
 * (Onboarding und Balance-Simulation nutzen dieselbe Auswahl).
 */
export function waehlbareSpielerAgendaZiele(
  content: Pick<ContentBundle, 'agendaZiele'>,
  complexity: number,
  parteiId: string | null | undefined,
): AgendaZielContent[] {
  return (content.agendaZiele ?? []).filter((z) => {
    if (z.min_complexity > complexity) return false;
    if (z.partei_filter && z.partei_filter.length > 0 && parteiId) {
      if (!z.partei_filter.includes(parteiId)) return false;
    }
    return true;
  });
}

/**
 * Wählt N passende Koalitionsziele für den aktuellen Partner (deterministisch):
 * Gesetzesziele zuerst, dann die übrigen, jeweils nach ID (#475). Bisher galt nur die ID —
 * auf Stufe 2 war das einzige Koalitionsziel der Grünen damit ein Milieuziel.
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
    .sort((a, b) => {
      const gesetzA = a.bedingung_typ.startsWith('gesetz_') ? 0 : 1;
      const gesetzB = b.bedingung_typ.startsWith('gesetz_') ? 0 : 1;
      return gesetzA - gesetzB || a.id.localeCompare(b.id);
    })
    .map((z) => z.id);
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
