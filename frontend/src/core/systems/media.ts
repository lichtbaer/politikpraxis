import type { GameState } from '../types';
import { addLog } from '../engine';

export type MilieuKey = 'arbeit' | 'mitte' | 'prog';

const MILIEU_LABELS: Record<MilieuKey, string> = {
  arbeit: 'Arbeitsmilieu',
  mitte: 'Mitte',
  prog: 'Progressive',
};

/**
 * Milieu-Mapping: SimpleKey → volle milieuZustimmung-IDs.
 * Primäre Milieus (Index 0) bekommen vollen Gain, sekundäre halben Gain.
 */
const MILIEU_KEY_MAP: Record<MilieuKey, string[]> = {
  arbeit: ['arbeit', 'soziale_mitte', 'prekaere'],
  mitte: ['buergerliche_mitte', 'soziale_mitte', 'leistungstraeger'],
  prog: ['postmaterielle', 'soziale_mitte'],
};

/**
 * Medienkampagne: 10 PK → Milieu-Zustimmung boost.
 *
 * Basis-Gain: 2–5 (identisch zur alten Logik für Rückwärtskompatibilität).
 * Medienklima-Bonus:
 * - mk >= 60: +2 zusätzlicher Gain (Rückenwind)
 * - mk 30–59: kein Bonus
 * - mk < 30: -1 Gain (Gegenwind) + 25% Skandal-Risiko (-5 Medienklima)
 *
 * Aktualisiert immer zust[milieu] (einfaches System) UND
 * milieuZustimmung (volles System) wenn vorhanden.
 */
export function medienkampagne(state: GameState, milieu: MilieuKey): GameState {
  if (state.pk < 10) return state;

  const mk = state.medienKlima ?? 55;

  // Basis-Gain 2–5 (altes Verhalten) + Medienklima-Modifikator
  const baseGain = Math.floor(Math.random() * 4) + 2;
  const mkBonus = mk >= 60 ? 2 : mk < 30 ? -1 : 0;
  const gain = Math.max(1, baseGain + mkBonus);

  let newState: GameState = { ...state, pk: state.pk - 10 };

  // 1. Immer: einfaches zust-System aktualisieren
  const zust = { ...newState.zust };
  zust[milieu] = Math.min(90, zust[milieu] + gain);
  newState = { ...newState, zust };

  // 2. Zusätzlich: erweitertes milieuZustimmung-System wenn vorhanden
  if (newState.milieuZustimmung) {
    const milieuZustimmung = { ...newState.milieuZustimmung };
    for (let i = 0; i < MILIEU_KEY_MAP[milieu].length; i++) {
      const milieuId = MILIEU_KEY_MAP[milieu][i];
      const current = milieuZustimmung[milieuId] ?? 50;
      const effectiveGain = i === 0 ? gain : Math.floor(gain / 2);
      milieuZustimmung[milieuId] = Math.min(100, current + effectiveGain);
    }
    newState = { ...newState, milieuZustimmung };
  }

  // Skandal-Risiko bei schlechtem Medienklima (< 30, 25% Chance)
  if (mk < 30 && Math.random() < 0.25) {
    const newMk = Math.max(0, mk - 5);
    newState = addLog(
      { ...newState, medienKlima: newMk },
      `Medienkampagne unter Beschuss: Medienklima -5 (war bereits bei ${mk})`,
      'r',
    );
  }

  return addLog(
    newState,
    `Medienkampagne: ${MILIEU_LABELS[milieu]} +${gain}%`,
    'hi',
  );
}
