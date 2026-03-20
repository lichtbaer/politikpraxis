/**
 * PK (Politik-Kapital) Hilfsfunktionen.
 * Zentralisiert, um Duplikate in gesetzLebenszyklus, koalition, eu zu vermeiden.
 */
import type { GameState } from './types';

/** Verbraucht PK wenn genug vorhanden, sonst null. Rückgabe: neuer State oder null. */
export function verbrauchePK(state: GameState, cost: number): GameState | null {
  if (state.pk < cost) return null;
  const prev = state.pkVerbrauchtGesamt ?? 0;
  return { ...state, pk: state.pk - cost, pkVerbrauchtGesamt: prev + cost };
}
