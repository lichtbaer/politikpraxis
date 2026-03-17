import type { GameState, LogEntry } from './types';

export function addLog(
  state: GameState,
  msg: string,
  type: string,
  params?: Record<string, string | number>,
): GameState {
  const yr = 2025 + Math.floor((state.month - 1) / 12);
  const mo = ((state.month - 1) % 12) + 1;
  const time = `${String(mo).padStart(2, '0')}/${yr}`;
  const entry: LogEntry = params ? { time, msg, type, params } : { time, msg, type };
  const log = [entry, ...state.log].slice(0, 60);
  return { ...state, log };
}
