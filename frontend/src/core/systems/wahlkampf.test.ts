import { describe, it, expect } from 'vitest';
import { createInitialState } from '../state';
import { DEFAULT_CONTENT } from '../../data/defaults/scenarios';
import {
  checkWahlkampfBeginn,
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
});
