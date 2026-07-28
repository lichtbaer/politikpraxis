import { describe, it, expect } from 'vitest';
import { createInitialState } from '../../state';
import { DEFAULT_CONTENT } from '../../../data/defaults/scenarios';
import { HUNDERT_TAGE_BILANZ_EVENT } from '../../../data/defaults/dramaturgieEvents';
import { checkHundertTageBilanz } from './dramaturgie';

describe('dramaturgie', () => {
  const content = DEFAULT_CONTENT;
  const complexity = 4;

  it('checkHundertTageBilanz triggert nur in Monat 3', () => {
    let state = createInitialState(content, complexity);
    state = { ...state, month: 2 };
    expect(checkHundertTageBilanz(state, content, complexity).firedEvents).not.toContain('hundert_tage_bilanz');

    state = { ...state, month: 3 };
    const result = checkHundertTageBilanz(state, content, complexity);
    expect(result.firedEvents).toContain('hundert_tage_bilanz');
  });

  it('checkHundertTageBilanz feuert nur einmal (firedEvents-Gate)', () => {
    let state = createInitialState(content, complexity);
    state = { ...state, month: 3 };
    const first = checkHundertTageBilanz(state, content, complexity);
    const second = checkHundertTageBilanz({ ...first, activeEvent: null }, content, complexity);
    expect(second.log.filter((l) => l.msg.startsWith('100-Tage-Bilanz')).length).toBe(1);
  });

  it('aktive Regierung (viele eingebrachte Gesetze + PK) erhält positiven Impuls', () => {
    let state = createInitialState(content, complexity);
    state = {
      ...state,
      month: 3,
      pkVerbrauchtGesamt: 40,
      gesetze: state.gesetze.map((g, i) => (i < 3 ? { ...g, status: 'eingebracht' } : g)),
    };
    const medienVorher = state.medienKlima ?? 55;
    const result = checkHundertTageBilanz(state, content, complexity);
    expect(result.medienKlima ?? 55).toBeGreaterThan(medienVorher);
    expect(result.zustOffsets?.arbeit ?? 0).toBeGreaterThan(0);
  });

  it('passive Regierung (keine Gesetze, kein PK verbraucht) erhält negativen Impuls', () => {
    let state = createInitialState(content, complexity);
    state = { ...state, month: 3, pkVerbrauchtGesamt: 0 };
    const medienVorher = state.medienKlima ?? 55;
    const result = checkHundertTageBilanz(state, content, complexity);
    expect(result.medienKlima ?? 55).toBeLessThan(medienVorher);
    expect(result.zustOffsets?.arbeit ?? 0).toBeLessThan(0);
  });

  it('öffnet das Info-Event, wenn im Content vorhanden', () => {
    const contentWithEvent = { ...content, events: [HUNDERT_TAGE_BILANZ_EVENT] };
    let state = createInitialState(contentWithEvent, complexity);
    state = { ...state, month: 3 };
    const result = checkHundertTageBilanz(state, contentWithEvent, complexity);
    expect(result.activeEvent?.id).toBe('hundert_tage_bilanz');
  });

  it('wendet den Impuls auch ohne begleitendes Info-Event im Content an (Balance-Sim)', () => {
    let state = createInitialState(content, complexity);
    state = { ...state, month: 3, pkVerbrauchtGesamt: 0 };
    const result = checkHundertTageBilanz(state, content, complexity);
    expect(result.activeEvent).toBeFalsy();
    expect(result.firedEvents).toContain('hundert_tage_bilanz');
  });
});
