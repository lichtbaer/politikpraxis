/**
 * SMA-502: Passives History-Tracking für Agenda-Evaluierung und Legislatur-Bilanz.
 * Läuft am Tick-Ende; keine Auswirkung auf Spielmechaniken.
 */

import type { GameState, MilieuHistoryStats } from '../types';
import {
  AGENDA_TRACKING_CHAR_MOOD_MAX,
  AGENDA_TRACKING_MEDIENKLIMA_SCHWELLE,
} from '../constants';

function updateMilieuHistory(
  state: GameState,
): Record<string, MilieuHistoryStats> | undefined {
  const z = state.milieuZustimmung;
  if (!z || Object.keys(z).length === 0) {
    return state.milieuHistory;
  }
  const prev = { ...(state.milieuHistory ?? {}) };
  for (const [id, val] of Object.entries(z)) {
    const cur = prev[id];
    if (cur == null) {
      prev[id] = { min: val, max: val, sum: val, months: 1 };
    } else {
      prev[id] = {
        min: Math.min(cur.min, val),
        max: Math.max(cur.max, val),
        sum: cur.sum + val,
        months: cur.months + 1,
      };
    }
  }
  return prev;
}

function updateCharMoodBelowCounts(state: GameState): Record<string, number> | undefined {
  if (!state.chars.length) {
    return state.charMoodHistory;
  }
  const prev = { ...(state.charMoodHistory ?? {}) };
  const thresh = AGENDA_TRACKING_CHAR_MOOD_MAX;
  for (const c of state.chars) {
    if (c.mood <= thresh) {
      prev[c.id] = (prev[c.id] ?? 0) + 1;
    }
  }
  return prev;
}

function updateKoalitionsbeziehungLegislatur(
  state: GameState,
): GameState['koalitionsbeziehungLegislatur'] {
  const kp = state.koalitionspartner;
  if (!kp) {
    return state.koalitionsbeziehungLegislatur;
  }
  const b = kp.beziehung;
  const cur = state.koalitionsbeziehungLegislatur;
  return {
    sum: (cur?.sum ?? 0) + b,
    months: (cur?.months ?? 0) + 1,
  };
}

/**
 * Aktualisiert Aggregat-Tracker nach abgeschlossenem Monat (finaler Spielzustand).
 * @param medienKlimaRounded gerundeter Medienklima-Index (wie in medienKlimaHistory)
 */
export function updateAgendaHistoryTrackers(
  state: GameState,
  medienKlimaRounded: number,
): GameState {
  const below =
    medienKlimaRounded < AGENDA_TRACKING_MEDIENKLIMA_SCHWELLE
      ? (state.medienklimaBelowMonths ?? 0) + 1
      : (state.medienklimaBelowMonths ?? 0);

  return {
    ...state,
    milieuHistory: updateMilieuHistory(state),
    medienklimaBelowMonths: below,
    charMoodHistory: updateCharMoodBelowCounts(state),
    koalitionsbeziehungLegislatur: updateKoalitionsbeziehungLegislatur(state),
  };
}
