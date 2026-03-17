/**
 * SMA-295: Differenziertes Auto-Pause für Events.
 *
 * - always: Immer pausieren (Events mit Choices, Abstimmungen, TV-Duell, Verfassungsgericht)
 * - fast_only: Nur bei 3× pausieren (Ticker, Monatswechsel, Passiv-Events)
 * - never: Nie pausieren (nur im Log)
 */
import type { GameState, GameEvent } from './types';

export type AutoPauseLevel = 'always' | 'fast_only' | 'never';

export function shouldPauseForEvent(state: GameState, level: AutoPauseLevel): boolean {
  if (level === 'never') return false;
  if (level === 'always') return true;
  if (level === 'fast_only') return state.speed === 2; // 3×
  return false;
}

/** Liefert speed/speedBeforePause wenn pausiert werden soll, sonst {}. */
export function withPause(
  state: GameState,
  level: AutoPauseLevel = 'always',
): Partial<Pick<GameState, 'speed' | 'speedBeforePause'>> {
  if (!shouldPauseForEvent(state, level)) return {};
  return { speed: 0, speedBeforePause: state.speed };
}

/** Default: Events mit Choices → always, sonst fast_only. */
export function getAutoPauseLevel(event: GameEvent): AutoPauseLevel {
  if (event.auto_pause) return event.auto_pause;
  return event.choices?.length ? 'always' : 'fast_only';
}
