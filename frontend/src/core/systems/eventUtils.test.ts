import { describe, it, expect } from 'vitest';
import {
  isOnCooldown,
  isEventAvailable,
  recordEventFired,
  pruneExpiredCooldowns,
} from './eventUtils';
import { makeState, makeEvent } from '../test-helpers';

describe('isOnCooldown', () => {
  it('gibt false zurück für nicht-repeatable Events', () => {
    const state = makeState({ month: 10, eventCooldowns: { some_event: 20 } });
    const event = makeEvent({ id: 'some_event', repeatable: false });
    expect(isOnCooldown(state, event)).toBe(false);
  });

  it('gibt false zurück wenn kein Cooldown gesetzt', () => {
    const state = makeState({ month: 10, eventCooldowns: {} });
    const event = makeEvent({ id: 'test_event', repeatable: true });
    expect(isOnCooldown(state, event)).toBe(false);
  });

  it('gibt true zurück wenn Cooldown noch nicht abgelaufen', () => {
    const state = makeState({ month: 10, eventCooldowns: { test_event: 15 } });
    const event = makeEvent({ id: 'test_event', repeatable: true });
    expect(isOnCooldown(state, event)).toBe(true);
  });

  it('gibt false zurück wenn Cooldown genau abgelaufen (month >= cooldownUntil)', () => {
    const state = makeState({ month: 15, eventCooldowns: { test_event: 15 } });
    const event = makeEvent({ id: 'test_event', repeatable: true });
    expect(isOnCooldown(state, event)).toBe(false);
  });

  it('gibt false zurück wenn Cooldown undefined', () => {
    const state = makeState({ month: 10, eventCooldowns: undefined });
    const event = makeEvent({ id: 'test_event', repeatable: true });
    expect(isOnCooldown(state, event)).toBe(false);
  });
});

describe('isEventAvailable', () => {
  it('gibt false zurück wenn Event nicht im aktiven Pool', () => {
    const state = makeState({
      activeEventPool: ['other_event', 'another_event'],
      firedEvents: [],
    });
    const event = makeEvent({ id: 'test_event', repeatable: false });
    expect(isEventAvailable(state, event)).toBe(false);
  });

  it('gibt true zurück wenn activeEventPool leer (kein Filter)', () => {
    const state = makeState({ activeEventPool: [], firedEvents: [] });
    const event = makeEvent({ id: 'test_event', repeatable: false });
    expect(isEventAvailable(state, event)).toBe(true);
  });

  it('gibt true zurück wenn Event im Pool', () => {
    const state = makeState({ activeEventPool: ['test_event'], firedEvents: [] });
    const event = makeEvent({ id: 'test_event', repeatable: false });
    expect(isEventAvailable(state, event)).toBe(true);
  });

  it('nicht-repeatable Event das bereits gefired wurde ist nicht verfügbar', () => {
    const state = makeState({ firedEvents: ['test_event'], activeEventPool: [] });
    const event = makeEvent({ id: 'test_event', repeatable: false });
    expect(isEventAvailable(state, event)).toBe(false);
  });

  it('nicht-repeatable Event das nicht gefired wurde ist verfügbar', () => {
    const state = makeState({ firedEvents: ['other_event'], activeEventPool: [] });
    const event = makeEvent({ id: 'test_event', repeatable: false });
    expect(isEventAvailable(state, event)).toBe(true);
  });

  it('repeatable Event auf Cooldown ist nicht verfügbar', () => {
    const state = makeState({ month: 5, eventCooldowns: { test_event: 10 }, activeEventPool: [] });
    const event = makeEvent({ id: 'test_event', repeatable: true });
    expect(isEventAvailable(state, event)).toBe(false);
  });

  it('repeatable Event ohne Cooldown ist verfügbar', () => {
    const state = makeState({ month: 15, eventCooldowns: { test_event: 10 }, activeEventPool: [] });
    const event = makeEvent({ id: 'test_event', repeatable: true });
    expect(isEventAvailable(state, event)).toBe(true);
  });

  it('nutzt firedEventsSet für O(1) Lookup (nicht-repeatable)', () => {
    const state = makeState({ firedEvents: [], activeEventPool: [] });
    const event = makeEvent({ id: 'test_event', repeatable: false });
    const fired = new Set(['test_event']);
    expect(isEventAvailable(state, event, fired)).toBe(false);
    expect(isEventAvailable(state, event, new Set())).toBe(true);
  });
});

describe('recordEventFired', () => {
  it('fügt nicht-repeatable Event zu firedEvents hinzu', () => {
    const state = makeState({ firedEvents: ['existing'] });
    const event = makeEvent({ id: 'new_event', repeatable: false });
    const patch = recordEventFired(state, event);
    expect(patch.firedEvents).toContain('new_event');
    expect(patch.firedEvents).toContain('existing');
  });

  it('setzt Cooldown für repeatable Event', () => {
    const state = makeState({ month: 10, eventCooldowns: {} });
    const event = makeEvent({ id: 'rep_event', repeatable: true, cooldownMonths: 12 });
    const patch = recordEventFired(state, event);
    expect(patch.eventCooldowns).toBeDefined();
    expect(patch.eventCooldowns!['rep_event']).toBe(22); // month(10) + cooldownMonths(12)
  });

  it('nutzt Standard-Cooldown 12 wenn cooldownMonths nicht gesetzt', () => {
    const state = makeState({ month: 5, eventCooldowns: {} });
    const event = makeEvent({ id: 'rep_event', repeatable: true });
    const patch = recordEventFired(state, event);
    expect(patch.eventCooldowns!['rep_event']).toBe(17); // 5 + 12
  });

  it('nicht-repeatable Event verändert nicht eventCooldowns', () => {
    const state = makeState({ firedEvents: [] });
    const event = makeEvent({ id: 'test', repeatable: false });
    const patch = recordEventFired(state, event);
    expect(patch.eventCooldowns).toBeUndefined();
  });
});

describe('pruneExpiredCooldowns', () => {
  it('entfernt abgelaufene Cooldowns', () => {
    const state = makeState({
      month: 20,
      eventCooldowns: { expired: 10, active: 30 },
    });
    const result = pruneExpiredCooldowns(state);
    expect(result.eventCooldowns).not.toHaveProperty('expired');
    expect(result.eventCooldowns).toHaveProperty('active', 30);
  });

  it('gibt denselben state zurück wenn nichts abgelaufen ist', () => {
    const state = makeState({
      month: 5,
      eventCooldowns: { active1: 10, active2: 20 },
    });
    const result = pruneExpiredCooldowns(state);
    expect(result).toBe(state); // referenzidentisch wenn kein Änderungs-Flag
  });

  it('gibt state unverändert zurück wenn eventCooldowns undefined', () => {
    const state = makeState({ eventCooldowns: undefined });
    const result = pruneExpiredCooldowns(state);
    expect(result).toBe(state);
  });

  it('leeres Objekt bleibt leer', () => {
    const state = makeState({ month: 10, eventCooldowns: {} });
    const result = pruneExpiredCooldowns(state);
    expect(result.eventCooldowns).toEqual({});
  });

  it('Cooldown genau am aktuellen Monat gilt als abgelaufen', () => {
    const state = makeState({
      month: 15,
      eventCooldowns: { borderline: 15 },
    });
    const result = pruneExpiredCooldowns(state);
    expect(result.eventCooldowns).not.toHaveProperty('borderline');
  });
});
