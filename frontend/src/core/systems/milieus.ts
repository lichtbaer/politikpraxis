import type { GameState } from '../types';
import { milieuGesetzKongruenz } from '../ideologie';
import { featureActive } from './features';

/**
 * Wendet Milieu-Effekte nach einem Gesetzesbeschluss an.
 * Nur bei featureActive('milieus_voll').
 * Delta: Score ≥75: +3, ≥55: +1, ≥25: -1, <25: -3
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

  for (const milieu of milieus) {
    if (milieu.min_complexity > complexity) continue;

    const score = milieuGesetzKongruenz(milieu, gesetz);
    let delta = 0;
    if (score >= 75) delta = 3;
    else if (score >= 55) delta = 1;
    else if (score >= 25) delta = -1;
    else delta = -3;

    const current = milieuZustimmung[milieu.id] ?? 50;
    milieuZustimmung[milieu.id] = Math.max(0, Math.min(100, current + delta));
  }

  return { ...state, milieuZustimmung };
}
