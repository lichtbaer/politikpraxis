import type { GameState } from '../types';

export function updateCoalitionStability(state: GameState): GameState {
  const avgMood = state.chars.reduce((s, c) => s + c.mood, 0) / state.chars.length;
  const avgLoy = state.chars.reduce((s, c) => s + c.loyalty, 0) / state.chars.length;
  const coalition = Math.round(Math.min(100, Math.max(0, (avgMood / 4) * 50 + (avgLoy / 5) * 50)));
  return { ...state, coalition };
}
