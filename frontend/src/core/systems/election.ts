import type { GameState } from '../types';
import { DEFAULT_ELECTION_THRESHOLD, LEGISLATUR_MONATE, MIN_KOALITION_FORTGANG } from '../constants';

export function checkGameEnd(state: GameState): GameState {
  if (state.month > LEGISLATUR_MONATE) {
    const threshold = state.electionThreshold ?? DEFAULT_ELECTION_THRESHOLD;
    const won = state.zust.g >= threshold;
    return { ...state, gameOver: true, won, speed: 0 };
  }

  if (state.coalition < MIN_KOALITION_FORTGANG) {
    return { ...state, gameOver: true, won: false, speed: 0 };
  }

  return state;
}
