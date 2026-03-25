import type { GameState, GesetzRelation } from '../types';
import { milieuGesetzKongruenz } from '../ideologie';
import { featureActive } from './features';
import { getMedienMultiplikator } from './medienklima';
import { berechneGesetzEffektMitSynergien } from '../gesetz';
import { clamp, MILIEU_SCORE_SCHWELLEN, MILIEU_DELTAS } from '../constants';

/**
 * Wendet Milieu-Effekte nach einem Gesetzesbeschluss an.
 * Nur bei featureActive('milieus_voll').
 * Delta: Score ≥75: +3, ≥55: +1, ≥25: -1, <25: -3
 * SMA-277: getMedienMultiplikator() moduliert Delta; bei medienKlima > 75: +20%
 * SMA-312: Synergieeffekte (enhances) multiplizieren Delta
 */
export function applyMilieuEffekte(
  state: GameState,
  gesetzId: string,
  milieus: { id: string; ideologie: { wirtschaft: number; gesellschaft: number; staat: number }; min_complexity: number }[],
  complexity: number,
  gesetzRelationen?: Record<string, GesetzRelation[]>,
): GameState {
  if (!featureActive(complexity, 'milieus_voll') || milieus.length === 0) return state;

  const gesetz = state.gesetze.find((g) => g.id === gesetzId);
  if (!gesetz) return state;

  const milieuZustimmung = { ...(state.milieuZustimmung ?? {}) };
  const milieuGesetzReaktionen = { ...(state.milieuGesetzReaktionen ?? {}) };
  const medienKlima = state.medienKlima ?? 55;
  let multiplikator = getMedienMultiplikator(medienKlima);
  if (medienKlima > 75) multiplikator *= 1.2;

  // SMA-312: Synergie-Faktor (enhances) — State vor Beschluss: Synergiegesetze bereits beschlossen
  const synergieFaktor = berechneGesetzEffektMitSynergien(state, gesetzId, 1.0, gesetzRelationen);

  for (const milieu of milieus) {
    if (milieu.min_complexity > complexity) continue;

    const score = milieuGesetzKongruenz(milieu, gesetz);
    let delta: number;
    if (score >= MILIEU_SCORE_SCHWELLEN[0]) delta = MILIEU_DELTAS[0];
    else if (score >= MILIEU_SCORE_SCHWELLEN[1]) delta = MILIEU_DELTAS[1];
    else if (score >= MILIEU_SCORE_SCHWELLEN[2]) delta = MILIEU_DELTAS[2];
    else delta = MILIEU_DELTAS[3];

    delta = Math.round(delta * multiplikator * synergieFaktor);
    const current = milieuZustimmung[milieu.id] ?? 50;
    milieuZustimmung[milieu.id] = clamp(current + delta, 0, 100);

    // SMA-297: Letzte 3 Reaktionen pro Milieu speichern
    const reaktionen = milieuGesetzReaktionen[milieu.id] ?? [];
    milieuGesetzReaktionen[milieu.id] = [...reaktionen, { gesetzId, delta }].slice(-3);
  }

  return { ...state, milieuZustimmung, milieuGesetzReaktionen };
}
