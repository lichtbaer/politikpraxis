import type { GameState } from '../types';
import { milieuGesetzKongruenz } from '../ideologie';
import { featureActive } from './features';
import { getMedienMultiplikator } from './medienklima';

/**
 * Wendet Milieu-Effekte nach einem Gesetzesbeschluss an.
 * Nur bei featureActive('milieus_voll').
 * Delta: Score ≥75: +3, ≥55: +1, ≥25: -1, <25: -3
 * SMA-277: getMedienMultiplikator() moduliert Delta; bei medienKlima > 75: +20%
 */
export function applyMilieuEffekte(
  state: GameState,
  gesetzId: string,
  milieus: { id: string; ideologie: { wirtschaft: number; gesellschaft: number; staat: number }; min_complexity: number }[],
  complexity: number,
): GameState {
  if (!featureActive(complexity, 'milieus_voll') || milieus.length === 0) return state;

  const gesetz = state.gesetze.find((g) => g.id === gesetzId);
  if (!gesetz) return state;

  const milieuZustimmung = { ...(state.milieuZustimmung ?? {}) };
  const milieuGesetzReaktionen = { ...(state.milieuGesetzReaktionen ?? {}) };
  const medienKlima = state.medienKlima ?? 55;
  let multiplikator = getMedienMultiplikator(medienKlima);
  if (medienKlima > 75) multiplikator *= 1.2;

  for (const milieu of milieus) {
    if (milieu.min_complexity > complexity) continue;

    const score = milieuGesetzKongruenz(milieu, gesetz);
    let delta = 0;
    if (score >= 75) delta = 3;
    else if (score >= 55) delta = 1;
    else if (score >= 25) delta = -1;
    else delta = -3;

    delta = Math.round(delta * multiplikator);
    const current = milieuZustimmung[milieu.id] ?? 50;
    milieuZustimmung[milieu.id] = Math.max(0, Math.min(100, current + delta));

    // SMA-297: Letzte 3 Reaktionen pro Milieu speichern
    const reaktionen = milieuGesetzReaktionen[milieu.id] ?? [];
    milieuGesetzReaktionen[milieu.id] = [...reaktionen, { gesetzId, delta }].slice(-3);
  }

  return { ...state, milieuZustimmung, milieuGesetzReaktionen };
}
