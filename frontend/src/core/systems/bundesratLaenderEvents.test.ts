import { describe, it, expect } from 'vitest';
import { checkBundesratLaenderEvents, flushPendingBundesratLandEvent } from './bundesratLaenderEvents';
import { makeState, makeEvent } from '../test-helpers';
import type { ContentBundle, GameEvent } from '../types';

function makeContentWithBrEvents(events: GameEvent[]): ContentBundle {
  return { bundesratEvents: events } as unknown as ContentBundle;
}

const COMPLEXITY_WITH_DETAIL = 3; // bundesrat_detail ist ab Stufe 3 aktiv
const COMPLEXITY_WITHOUT_DETAIL = 1;

const ostlaenderEvent = makeEvent({ id: 'ostlaender_abhaengung', type: 'danger', min_complexity: 3 });
const nrwEvent = makeEvent({ id: 'nrw_strukturwandel', type: 'info', min_complexity: 3 });
const bayernEvent = makeEvent({ id: 'bayern_umwelt_konflikt', type: 'danger', min_complexity: 3 });

describe('checkBundesratLaenderEvents', () => {
  it('gibt state unverändert zurück wenn bundesrat_detail Feature nicht aktiv', () => {
    const state = makeState({
      month: 12,
      firedBundesratEvents: [],
      haushalt: { ...makeState().haushalt!, konjunkturIndex: -15 },
    });
    const content = makeContentWithBrEvents([ostlaenderEvent, nrwEvent, bayernEvent]);
    const result = checkBundesratLaenderEvents(state, content, COMPLEXITY_WITHOUT_DETAIL);
    expect(result.activeEvent).toBeNull();
  });

  it('gibt state unverändert zurück wenn bereits ein activeEvent läuft', () => {
    const state = makeState({
      month: 12,
      activeEvent: makeEvent({ id: 'other' }),
      firedBundesratEvents: [],
      haushalt: { ...makeState().haushalt!, konjunkturIndex: -15 },
    });
    const content = makeContentWithBrEvents([nrwEvent]);
    const result = checkBundesratLaenderEvents(state, content, COMPLEXITY_WITH_DETAIL);
    expect(result.activeEvent?.id).toBe('other');
  });

  it('Ostländer-Event wird ausgelöst wenn konjunkturIndex <= -10', () => {
    const state = makeState({
      month: 5,
      firedBundesratEvents: [],
      activeEvent: null,
      haushalt: { ...makeState().haushalt!, konjunkturIndex: -10 },
    });
    const content = makeContentWithBrEvents([ostlaenderEvent]);
    const result = checkBundesratLaenderEvents(state, content, COMPLEXITY_WITH_DETAIL);
    expect(result.activeEvent?.id).toBe('ostlaender_abhaengung');
  });

  it('Ostländer-Event wird NICHT ausgelöst wenn konjunkturIndex > -10', () => {
    const state = makeState({
      month: 5,
      firedBundesratEvents: [],
      activeEvent: null,
      haushalt: { ...makeState().haushalt!, konjunkturIndex: -9 },
    });
    const content = makeContentWithBrEvents([ostlaenderEvent]);
    const result = checkBundesratLaenderEvents(state, content, COMPLEXITY_WITH_DETAIL);
    expect(result.activeEvent).toBeNull();
  });

  it('Ostländer-Event wird nicht erneut ausgelöst wenn bereits gefired', () => {
    const state = makeState({
      month: 5,
      firedBundesratEvents: ['ostlaender_abhaengung'],
      activeEvent: null,
      haushalt: { ...makeState().haushalt!, konjunkturIndex: -15 },
    });
    const content = makeContentWithBrEvents([ostlaenderEvent]);
    const result = checkBundesratLaenderEvents(state, content, COMPLEXITY_WITH_DETAIL);
    expect(result.activeEvent).toBeNull();
  });

  it('NRW-Event wird genau an Monat 12 ausgelöst', () => {
    const state = makeState({
      month: 12,
      firedBundesratEvents: [],
      activeEvent: null,
      haushalt: { ...makeState().haushalt!, konjunkturIndex: 0 },
    });
    const content = makeContentWithBrEvents([nrwEvent]);
    const result = checkBundesratLaenderEvents(state, content, COMPLEXITY_WITH_DETAIL);
    expect(result.activeEvent?.id).toBe('nrw_strukturwandel');
  });

  it('NRW-Event wird NICHT an Monat 11 ausgelöst', () => {
    const state = makeState({
      month: 11,
      firedBundesratEvents: [],
      activeEvent: null,
      haushalt: { ...makeState().haushalt!, konjunkturIndex: 0 },
    });
    const content = makeContentWithBrEvents([nrwEvent]);
    const result = checkBundesratLaenderEvents(state, content, COMPLEXITY_WITH_DETAIL);
    expect(result.activeEvent).toBeNull();
  });

  it('Bayern-Event wird ausgelöst wenn Umwelt-Gesetz in bt_passed Status', () => {
    const umweltGesetz = {
      ...makeState().gesetze[0],
      id: 'umwelt_g1',
      status: 'bt_passed' as const,
      brVoteMonth: 15,
      politikfeldId: 'umwelt_energie',
    };
    const state = makeState({
      firedBundesratEvents: [],
      activeEvent: null,
      gesetze: [umweltGesetz],
      haushalt: { ...makeState().haushalt!, konjunkturIndex: 0 },
    });
    const content = makeContentWithBrEvents([bayernEvent]);
    const result = checkBundesratLaenderEvents(state, content, COMPLEXITY_WITH_DETAIL);
    expect(result.activeEvent?.id).toBe('bayern_umwelt_konflikt');
  });

  it('Bayern-Event wird NICHT ausgelöst wenn kein Umwelt-Gesetz in bt_passed', () => {
    const state = makeState({
      firedBundesratEvents: [],
      activeEvent: null,
      gesetze: [],
      haushalt: { ...makeState().haushalt!, konjunkturIndex: 0 },
    });
    const content = makeContentWithBrEvents([bayernEvent]);
    const result = checkBundesratLaenderEvents(state, content, COMPLEXITY_WITH_DETAIL);
    expect(result.activeEvent).toBeNull();
  });

  it('gefiredetes Event wird zu firedBundesratEvents hinzugefügt', () => {
    const state = makeState({
      month: 12,
      firedBundesratEvents: [],
      activeEvent: null,
      haushalt: { ...makeState().haushalt!, konjunkturIndex: 0 },
    });
    const content = makeContentWithBrEvents([nrwEvent]);
    const result = checkBundesratLaenderEvents(state, content, COMPLEXITY_WITH_DETAIL);
    expect(result.firedBundesratEvents).toContain('nrw_strukturwandel');
  });

  it('gibt state zurück ohne Event wenn keine Bedingung erfüllt', () => {
    const state = makeState({
      month: 5,
      firedBundesratEvents: [],
      activeEvent: null,
      gesetze: [],
      haushalt: { ...makeState().haushalt!, konjunkturIndex: 0 },
    });
    const content = makeContentWithBrEvents([ostlaenderEvent, nrwEvent, bayernEvent]);
    const result = checkBundesratLaenderEvents(state, content, COMPLEXITY_WITH_DETAIL);
    expect(result.activeEvent).toBeNull();
  });
});

describe('flushPendingBundesratLandEvent', () => {
  it('gibt state unverändert zurück wenn kein pendingBundesratLandEvent', () => {
    const state = makeState({ pendingBundesratLandEvent: undefined });
    const result = flushPendingBundesratLandEvent(state, []);
    expect(result).toBe(state);
  });

  it('gibt state unverändert zurück wenn bereits ein activeEvent läuft', () => {
    const state = makeState({
      pendingBundesratLandEvent: 'nrw_strukturwandel',
      activeEvent: makeEvent({ id: 'other' }),
    });
    const result = flushPendingBundesratLandEvent(state, [nrwEvent]);
    expect(result.activeEvent?.id).toBe('other');
  });

  it('setzt activeEvent und löscht pendingBundesratLandEvent wenn Event gefunden', () => {
    const state = makeState({
      pendingBundesratLandEvent: 'nrw_strukturwandel',
      activeEvent: null,
      firedBundesratEvents: [],
    });
    const result = flushPendingBundesratLandEvent(state, [nrwEvent]);
    expect(result.activeEvent?.id).toBe('nrw_strukturwandel');
    expect(result.pendingBundesratLandEvent).toBeUndefined();
  });

  it('löscht pendingBundesratLandEvent wenn Event nicht in Content gefunden', () => {
    const state = makeState({
      pendingBundesratLandEvent: 'nicht_vorhanden',
      activeEvent: null,
    });
    const result = flushPendingBundesratLandEvent(state, []);
    expect(result.pendingBundesratLandEvent).toBeUndefined();
    expect(result.activeEvent).toBeNull();
  });

  it('fügt Event zu firedBundesratEvents hinzu beim Flush', () => {
    const state = makeState({
      pendingBundesratLandEvent: 'nrw_strukturwandel',
      activeEvent: null,
      firedBundesratEvents: ['existing'],
    });
    const result = flushPendingBundesratLandEvent(state, [nrwEvent]);
    expect(result.firedBundesratEvents).toContain('nrw_strukturwandel');
    expect(result.firedBundesratEvents).toContain('existing');
  });
});
