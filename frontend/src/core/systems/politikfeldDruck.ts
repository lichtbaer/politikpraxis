import type { GameState, GameEvent } from '../types';
import { featureActive } from './features';
import { withPause, getAutoPauseLevel } from '../eventPause';

/** Politikfeld mit Verbands-Zuordnung und optionalem Druck-Event */
interface PolitikfeldForDruck {
  id: string;
  verbandId: string | null;
  druckEventId?: string | null;
}

/**
 * Erhöht Politikfeld-Druck pro Monat ohne Gesetz (+3/Monat).
 * Bei Druck >50: Verband-Beziehung -5.
 * Bei Druck >70: Druck-Event triggern (einmalig).
 */
export function checkPolitikfeldDruck(
  state: GameState,
  politikfelder: PolitikfeldForDruck[],
  complexity: number,
  eventPool?: GameEvent[],
): GameState {
  if (!featureActive(complexity, 'politikfeld_druck') || politikfelder.length === 0) return state;
  if (state.activeEvent) return state;

  const s = state;
  const politikfeldDruck = { ...(s.politikfeldDruck ?? {}) };
  const politikfeldLetzterBeschluss = { ...(s.politikfeldLetzterBeschluss ?? {}) };
  const verbandsBeziehungen = { ...(s.verbandsBeziehungen ?? {}) };
  const firedEvents = [...(s.firedEvents ?? [])];
  let activeEvent: GameEvent | null = null;

  for (const feld of politikfelder) {
    const letzter = politikfeldLetzterBeschluss[feld.id] ?? 0;
    const monateSeit = s.month - letzter;

    if (monateSeit > 0) {
      politikfeldDruck[feld.id] = Math.min(
        100,
        (politikfeldDruck[feld.id] ?? 0) + 3,
      );
    }

    const druck = politikfeldDruck[feld.id] ?? 0;

    if (druck > 50 && druck <= 53 && feld.verbandId) {
      verbandsBeziehungen[feld.verbandId] = Math.max(
        0,
        (verbandsBeziehungen[feld.verbandId] ?? 50) - 5,
      );
    }

    if (druck > 70 && feld.druckEventId && !firedEvents.includes(`druck_${feld.id}`) && eventPool && !activeEvent) {
      const ev = eventPool.find((e) => e.id === feld.druckEventId);
      if (ev) {
        activeEvent = ev;
        firedEvents.push(`druck_${feld.id}`);
      }
    }
  }

  return {
    ...s,
    politikfeldDruck,
    politikfeldLetzterBeschluss,
    verbandsBeziehungen,
    firedEvents,
    ...(activeEvent ? { activeEvent, ...withPause(s, getAutoPauseLevel(activeEvent)) } : {}),
  };
}

/** Setzt politikfeldLetzterBeschluss beim Gesetzesbeschluss */
export function setPolitikfeldBeschluss(
  state: GameState,
  politikfeldId: string,
): GameState {
  const politikfeldLetzterBeschluss = {
    ...(state.politikfeldLetzterBeschluss ?? {}),
    [politikfeldId]: state.month,
  };
  return { ...state, politikfeldLetzterBeschluss };
}
