/**
 * Utility helpers for the repeatable-event system.
 * Extracted to avoid circular dependencies between events.ts and other systems.
 */
import type { GameState, GameEvent } from '../types';

/** Check if a repeatable event is currently on cooldown */
export function isOnCooldown(state: GameState, event: GameEvent): boolean {
  if (!event.repeatable) return false;
  const cooldowns = state.eventCooldowns ?? {};
  const cooldownUntil = cooldowns[event.id];
  return cooldownUntil != null && state.month < cooldownUntil;
}

/** Check if an event is available (not fired for non-repeatable, not on cooldown for repeatable, in active pool) */
export function isEventAvailable(state: GameState, event: GameEvent): boolean {
  // Event-Pool-Filter: wenn Pool definiert und nicht leer, nur Events im Pool zulassen
  if (state.activeEventPool?.length && !state.activeEventPool.includes(event.id)) {
    return false;
  }
  if (event.repeatable) {
    return !isOnCooldown(state, event);
  }
  return !state.firedEvents.includes(event.id);
}

/** Record that an event has fired: update cooldowns for repeatable, firedEvents for non-repeatable */
export function recordEventFired(state: GameState, event: GameEvent): Partial<GameState> {
  if (event.repeatable) {
    const cooldowns = { ...(state.eventCooldowns ?? {}) };
    cooldowns[event.id] = state.month + (event.cooldownMonths ?? 12);
    return { eventCooldowns: cooldowns };
  }
  return { firedEvents: [...state.firedEvents, event.id] };
}
