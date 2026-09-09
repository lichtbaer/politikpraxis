import { describe, it, expect } from 'vitest';
import { createInitialState } from '../../state';
import { makeLaw } from '../../test-helpers';
import { DEFAULT_CONTENT } from '../../../data/defaults/scenarios';
import { HUNDERT_TAGE_BILANZ_EVENT, SOMMERLOCH_EVENTS, HALBZEITBILANZ_EVENT } from '../../../data/defaults/dramaturgieEvents';
import { checkHundertTageBilanz, checkSommerloch, checkHalbzeitbilanz, SOMMERLOCH_MONATE, HALBZEITBILANZ_MONAT } from './dramaturgie';

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

  describe('checkSommerloch', () => {
    it('triggert nur in den Sommerloch-Monaten', () => {
      let state = createInitialState(content, complexity);
      state = { ...state, month: 8 };
      expect(checkSommerloch(state, content, complexity).firedEvents).toEqual(state.firedEvents);

      for (const [i, monat] of SOMMERLOCH_MONATE.entries()) {
        state = { ...createInitialState(content, complexity), month: monat };
        const result = checkSommerloch(state, content, complexity);
        expect(result.firedEvents).toContain(`sommerloch_${i + 1}`);
      }
    });

    it('feuert pro Jahr nur einmal (firedEvents-Gate) und senkt das Medienklima leicht', () => {
      let state = createInitialState(content, complexity);
      state = { ...state, month: SOMMERLOCH_MONATE[0] };
      const medienVorher = state.medienKlima ?? 55;
      const first = checkSommerloch(state, content, complexity);
      expect(first.medienKlima ?? 55).toBeLessThan(medienVorher);

      const second = checkSommerloch({ ...first, activeEvent: null }, content, complexity);
      expect(second.log.filter((l) => l.msg.startsWith('Sommerloch')).length).toBe(1);
    });

    it('öffnet das passende Info-Event, wenn im Content vorhanden', () => {
      const contentWithEvents = { ...content, events: [...SOMMERLOCH_EVENTS] };
      let state = createInitialState(contentWithEvents, complexity);
      state = { ...state, month: SOMMERLOCH_MONATE[1] };
      const result = checkSommerloch(state, contentWithEvents, complexity);
      expect(result.activeEvent?.id).toBe('sommerloch_2');
    });
  });

  describe('checkHalbzeitbilanz', () => {
    it('triggert nur in Monat 24', () => {
      let state = createInitialState(content, complexity);
      state = { ...state, month: 23 };
      expect(checkHalbzeitbilanz(state, content, complexity).firedEvents).not.toContain('halbzeitbilanz');

      state = { ...state, month: HALBZEITBILANZ_MONAT };
      const result = checkHalbzeitbilanz(state, content, complexity);
      expect(result.firedEvents).toContain('halbzeitbilanz');
      expect(result.halbzeitBilanz).toBeTruthy();
    });

    it('feuert nur einmal (firedEvents-Gate)', () => {
      let state = createInitialState(content, complexity);
      state = { ...state, month: HALBZEITBILANZ_MONAT };
      const first = checkHalbzeitbilanz(state, content, complexity);
      const second = checkHalbzeitbilanz({ ...first, activeEvent: null }, content, complexity);
      expect(second.log.filter((l) => l.msg.startsWith('Halbzeitbilanz')).length).toBe(1);
    });

    it('stabile, aktive Regierung mit intaktem Koalitionsvertrag erhält positiven Medien-/Koalitionsimpuls', () => {
      let state = createInitialState(content, complexity);
      state = {
        ...state,
        month: HALBZEITBILANZ_MONAT,
        gesetze: [1, 2, 3, 4, 5].map((n) => makeLaw({ id: `gesetz_${n}`, status: 'beschlossen' })),
        lowApprovalMonths: 0,
        koalitionsbruchSeitMonat: undefined,
        koalitionspartner: state.koalitionspartner
          ? { ...state.koalitionspartner, beziehung: 70, koalitionsvertragScore: 70 }
          : state.koalitionspartner,
      };
      const medienVorher = state.medienKlima ?? 55;
      const beziehungVorher = state.koalitionspartner?.beziehung ?? 50;
      const result = checkHalbzeitbilanz(state, content, complexity);
      expect(result.medienKlima ?? 55).toBeGreaterThan(medienVorher);
      expect(result.koalitionspartner?.beziehung ?? 50).toBeGreaterThan(beziehungVorher);
    });

    it('untätige Regierung ohne Koalitionsvertrag erhält negativen Medien-/Koalitionsimpuls', () => {
      let state = createInitialState(content, complexity);
      state = { ...state, month: HALBZEITBILANZ_MONAT };
      const medienVorher = state.medienKlima ?? 55;
      const result = checkHalbzeitbilanz(state, content, complexity);
      expect(result.medienKlima ?? 55).toBeLessThan(medienVorher);
    });

    it('öffnet das Info-Event, wenn im Content vorhanden', () => {
      const contentWithEvent = { ...content, events: [HALBZEITBILANZ_EVENT] };
      let state = createInitialState(contentWithEvent, complexity);
      state = { ...state, month: HALBZEITBILANZ_MONAT };
      const result = checkHalbzeitbilanz(state, contentWithEvent, complexity);
      expect(result.activeEvent?.id).toBe('halbzeitbilanz');
    });

    it('wendet die Bilanz auch ohne begleitendes Info-Event im Content an (Balance-Sim)', () => {
      let state = createInitialState(content, complexity);
      state = { ...state, month: HALBZEITBILANZ_MONAT };
      const result = checkHalbzeitbilanz(state, content, complexity);
      expect(result.activeEvent).toBeFalsy();
      expect(result.firedEvents).toContain('halbzeitbilanz');
    });
  });
});
