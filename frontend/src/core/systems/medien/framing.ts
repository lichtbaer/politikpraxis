/**
 * Framing beim Gesetz-Einbringen (SMA-277). Extrahiert aus medienklima.ts (#235).
 */
import type { GameState, ContentBundle } from '../../types';
import { addLog } from '../../engine';
import { featureActive } from '../features';
import { clamp } from '../../constants';
import { adjustMedienKlimaGlobal } from './medienAkteure';

/** Wendet Framing beim Gesetz-Einbringen an */
export function applyFraming(
  state: GameState,
  gesetzId: string,
  framingKey: string | null,
  complexity: number,
  content?: ContentBundle,
): GameState {
  if (!framingKey || !featureActive(complexity, 'framing')) return state;

  const gesetz = state.gesetze.find((g) => g.id === gesetzId);
  const framingOptionen = gesetz?.framing_optionen ?? [];
  const framing = framingOptionen.find((f) => f.key === framingKey);
  if (!framing) return state;

  let newState = { ...state };

  if (framing.milieu_effekte && Object.keys(framing.milieu_effekte).length > 0) {
    const milieuZustimmung = { ...(newState.milieuZustimmung ?? {}) };
    for (const [milieuId, delta] of Object.entries(framing.milieu_effekte)) {
      const current = milieuZustimmung[milieuId] ?? 50;
      milieuZustimmung[milieuId] = clamp(current + (delta as number), 0, 100);
    }
    newState = { ...newState, milieuZustimmung };
  }

  if (framing.verband_effekte && Object.keys(framing.verband_effekte).length > 0) {
    const verbandsBeziehungen = { ...(newState.verbandsBeziehungen ?? {}) };
    for (const [verbandId, delta] of Object.entries(framing.verband_effekte)) {
      const current = verbandsBeziehungen[verbandId] ?? 50;
      verbandsBeziehungen[verbandId] = clamp(current + (delta as number), 0, 100);
    }
    newState = { ...newState, verbandsBeziehungen };
  }

  newState = adjustMedienKlimaGlobal(newState, framing.medienklima_delta, complexity, content);

  if (framing.effekte && Object.keys(framing.effekte).length > 0) {
    const gesetze = newState.gesetze.map((g) => {
      if (g.id !== gesetzId) return g;
      const merged = { ...g.effekte };
      for (const [k, v] of Object.entries(framing.effekte!)) {
        if (v != null) {
          const prev = (merged as Record<string, number>)[k] ?? 0;
          (merged as Record<string, number>)[k] = +(prev + v).toFixed(2);
        }
      }
      return { ...g, effekte: merged };
    });
    newState = { ...newState, gesetze };
  }

  const label = framing.label ?? framing.key;
  if (framing.key === 'standard' || framing.key === 'keine' || !label || label === 'Kein Framing') {
    return newState;
  }
  return addLog(newState, `Framing „${label}" angewendet`, 'hi');
}
