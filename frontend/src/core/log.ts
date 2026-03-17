import type { GameState, LogEntry } from './types';

export function addLog(
  state: GameState,
  msg: string,
  type: string,
  params?: Record<string, string | number>,
): GameState {
  const time = `Monat ${state.month}`;
  const entry: LogEntry = params ? { time, msg, type, params } : { time, msg, type };
  const log = [entry, ...state.log].slice(0, 60);
  return { ...state, log };
}
