import { describe, it, expect } from 'vitest';
import { createInitialState } from '../state';
import { DEFAULT_CONTENT } from '../../data/defaults/scenarios';
import { TV_DUELL_EVENT, KOALITIONSPARTNER_ALLEINGANG_EVENT } from '../../data/defaults/wahlkampfEvents';
import {
  checkWahlkampfBeginn,
  checkTVDuell,
  checkKoalitionspartnerAlleingang,
  berechneLegislaturBilanz,
  berechneWahlergebnis,
  resolveTVDuell,
} from './wahlkampf';

describe('wahlkampf', () => {
  const content = DEFAULT_CONTENT;
  const complexity = 4;

  it('checkWahlkampfBeginn aktiviert Wahlkampf in Monat 43', () => {
    let state = createInitialState(content, complexity);
    state = { ...state, month: 43 };
    const result = checkWahlkampfBeginn(state, content, complexity);
    expect(result.wahlkampfAktiv).toBe(true);
    expect(result.legislaturBilanz).toBeDefined();
    expect(result.legislaturBilanz?.gesetzeBeschlossen).toBeDefined();
  });

  it('berechneLegislaturBilanz liefert alle Felder', () => {
    const state = createInitialState(content, complexity);
    const bilanz = berechneLegislaturBilanz(state, content);
    expect(bilanz.gesetzeBeschlossen).toBeGreaterThanOrEqual(0);
    expect(['stark', 'moderat', 'schwach']).toContain(bilanz.reformStaerke);
    expect(['stabil', 'turbulent', 'krise']).toContain(bilanz.stabilitaet);
    expect(['positiv', 'neutral', 'negativ']).toContain(bilanz.wirtschaftsBilanz);
  });

  it('berechneWahlergebnis liefert Zahl', () => {
    let state = createInitialState(content, complexity);
    state = {
      ...state,
      wahlkampfAktiv: true,
      wahlprognose: 45,
      legislaturBilanz: berechneLegislaturBilanz(state, content),
    };
    const ergebnis = berechneWahlergebnis(state);
    expect(typeof ergebnis).toBe('number');
    expect(ergebnis).toBeGreaterThanOrEqual(0);
    expect(ergebnis).toBeLessThanOrEqual(100);
  });

  it('resolveTVDuell setzt tvDuellAbgehalten und tvDuellGewonnen', () => {
    let state = createInitialState(content, complexity);
    state = { ...state, medienKlima: 60, wahlprognose: 45 };
    const result = resolveTVDuell(state, true);
    expect(result.tvDuellAbgehalten).toBe(true);
    expect(result.tvDuellGewonnen).toBeDefined();
    expect(typeof result.tvDuellGewonnen).toBe('boolean');
  });

  it('checkTVDuell triggert nur in Monat 45 oder 46 (SMA-296)', () => {
    const contentWithTVDuell = { ...content, events: [TV_DUELL_EVENT] };
    let state = createInitialState(contentWithTVDuell, complexity);
    state = { ...state, month: 3, wahlkampfAktiv: true, tvDuellAbgehalten: false };

    const resultMonth3 = checkTVDuell(state, contentWithTVDuell, complexity);
    expect(resultMonth3.activeEvent).toBeFalsy();

    state = { ...state, month: 45 };
    const resultMonth45 = checkTVDuell(state, contentWithTVDuell, complexity);
    expect(resultMonth45.activeEvent?.id).toBe('tv_duell');
  });

  it('checkKoalitionspartnerAlleingang triggert nur in Monat 43–48 (SMA-296)', () => {
    const contentWithEvent = { ...content, events: [KOALITIONSPARTNER_ALLEINGANG_EVENT] };
    let state = createInitialState(contentWithEvent, complexity);
    state = {
      ...state,
      month: 3,
      wahlkampfAktiv: true,
      koalitionspartner: { ...state.koalitionspartner!, beziehung: 30 },
    };

    const resultMonth3 = checkKoalitionspartnerAlleingang(state, contentWithEvent, complexity);
    expect(resultMonth3.activeEvent).toBeFalsy();

    state = { ...state, month: 42 };
    const resultMonth42 = checkKoalitionspartnerAlleingang(state, contentWithEvent, complexity);
    expect(resultMonth42.activeEvent).toBeFalsy();
  });
});
