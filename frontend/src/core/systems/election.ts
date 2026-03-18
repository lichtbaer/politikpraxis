import type { GameState } from '../types';
import { DEFAULT_ELECTION_THRESHOLD, LEGISLATUR_MONATE, MIN_KOALITION_FORTGANG } from '../constants';

/** Schwelle für Misstrauensvotum: Zustimmung unter diesem Wert zählt als "kritisch niedrig" */
const MISSTRAUENSVOTUM_APPROVAL_THRESHOLD = 20;
/** Monate mit kritisch niedriger Zustimmung bis Misstrauensvotum ausgelöst wird */
const MISSTRAUENSVOTUM_MONTHS = 6;

export function checkGameEnd(state: GameState): GameState {
  if (state.month > LEGISLATUR_MONATE) {
    const threshold = state.electionThreshold ?? DEFAULT_ELECTION_THRESHOLD;
    const won = state.zust.g >= threshold;
    return { ...state, gameOver: true, won, speed: 0 };
  }

  // Koalitionsbruch
  if (state.coalition < MIN_KOALITION_FORTGANG) {
    return { ...state, gameOver: true, won: false, speed: 0 };
  }

  // Misstrauensvotum: 6 aufeinanderfolgende Monate unter 20% Zustimmung (ab Monat 7)
  if (state.month > 6) {
    const lowMonths = state.lowApprovalMonths ?? 0;
    if (state.zust.g < MISSTRAUENSVOTUM_APPROVAL_THRESHOLD) {
      const newLowMonths = lowMonths + 1;
      if (newLowMonths >= MISSTRAUENSVOTUM_MONTHS) {
        return { ...state, gameOver: true, won: false, speed: 0, lowApprovalMonths: newLowMonths };
      }
      return { ...state, lowApprovalMonths: newLowMonths };
    }
    // Reset counter if approval recovered
    if (lowMonths > 0) {
      return { ...state, lowApprovalMonths: 0 };
    }
  }

  return state;
}
