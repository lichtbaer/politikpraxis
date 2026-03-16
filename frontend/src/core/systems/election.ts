import type { GameState } from '../types';

const DEFAULT_ELECTION_THRESHOLD = 40;

export function checkGameEnd(state: GameState): GameState {
  if (state.month > 48) {
    const threshold = state.electionThreshold ?? DEFAULT_ELECTION_THRESHOLD;
    const won = state.zust.g >= threshold;
    return { ...state, gameOver: true, won, speed: 0 };
  }

  if (state.coalition < 15) {
    return { ...state, gameOver: true, won: false, speed: 0 };
  }

  return state;
}
