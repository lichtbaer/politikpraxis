/**
 * Utility helpers for the repeatable-event system.
 * Extracted to avoid circular dependencies between events.ts and other systems.
 */
import type { GameState, GameEvent } from '../../types';

const fortsetzungsZieleCache = new WeakMap<readonly GameEvent[], Set<string>>();

/**
 * IDs aller Events, die eine Option eines anderen Events als Follow-up ansteuert.
 * Solche Fortsetzungen (Arc-Stufen, Ketten wie haushalt → verfassungsklage_schulden)
 * setzen ihre Vorgeschichte voraus und werden nie eigenständig zufällig gezogen,
 * sondern nur über `pendingFollowups` erreicht. Pro Pool-Array gecacht.
 */
export function fortsetzungsZiele(events: readonly GameEvent[]): Set<string> {
  let ziele = fortsetzungsZieleCache.get(events);
  if (!ziele) {
    ziele = new Set(
      events.flatMap(e => e.choices.map(c => c.followup_event_id).filter((id): id is string => !!id)),
    );
    fortsetzungsZieleCache.set(events, ziele);
  }
  return ziele;
}

/** Ob ein Event eigenständig in den Zufalls-Pool darf (Arc-Einstieg ja, Fortsetzung nein). */
export function istEigenstaendigesEvent(event: GameEvent, ziele: Set<string>): boolean {
  return (event.arcStage ?? 1) <= 1 && !ziele.has(event.id);
}

/** Check if a repeatable event is currently on cooldown */
export function isOnCooldown(state: GameState, event: GameEvent): boolean {
  if (!event.repeatable) return false;
  const cooldowns = state.eventCooldowns ?? {};
  const cooldownUntil = cooldowns[event.id];
  return cooldownUntil != null && state.month < cooldownUntil;
}

/**
 * Check if an event is available (not fired for non-repeatable, not on cooldown for repeatable, in active pool).
 * Accepts an optional pre-built Set of firedEvents for O(1) lookups instead of O(n) Array.includes.
 */
export function isEventAvailable(state: GameState, event: GameEvent, firedEventsSet?: Set<string>): boolean {
  // Event-Pool-Filter: wenn Pool definiert und nicht leer, nur Events im Pool zulassen
  if (state.activeEventPool?.length && !state.activeEventPool.includes(event.id)) {
    return false;
  }
  if (event.repeatable) {
    return !isOnCooldown(state, event);
  }
  if (firedEventsSet) {
    return !firedEventsSet.has(event.id);
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

/** Remove expired cooldown entries to prevent unbounded growth of eventCooldowns */
export function pruneExpiredCooldowns(state: GameState): GameState {
  const cooldowns = state.eventCooldowns;
  if (!cooldowns) return state;
  const pruned: Record<string, number> = {};
  let changed = false;
  for (const [id, until] of Object.entries(cooldowns)) {
    if (state.month < until) {
      pruned[id] = until;
    } else {
      changed = true;
    }
  }
  return changed ? { ...state, eventCooldowns: pruned } : state;
}
