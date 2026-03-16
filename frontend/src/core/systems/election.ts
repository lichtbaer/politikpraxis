import type { GameState } from '../types';

export function checkGameEnd(state: GameState): GameState {
  if (state.month > 48) {
    const won = state.zust.g >= 40;
    return { ...state, gameOver: true, won, speed: 0 };
  }

  if (state.coalition < 15) {
    return { ...state, gameOver: true, won: false, speed: 0 };
  }

  return state;
}
