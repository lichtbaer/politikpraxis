import { describe, it, expect } from 'vitest';
import { createInitialState } from '../state';
import { DEFAULT_CONTENT } from '../../data/defaults/scenarios';
import { TV_DUELL_EVENT, KOALITIONSPARTNER_ALLEINGANG_EVENT } from '../../data/defaults/wahlkampfEvents';
import {
  checkWahlkampfBeginn,
  checkTVDuell,
  checkKoalitionspartnerAlleingang,
  berechneLegislaturBilanz,
  berechneBilanzNote,
  finalisiereLegislaturBilanzAmSpielende,
  berechneWahlergebnis,
  resolveTVDuell,
  triggerWahlnacht,
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
    expect(['tief', 'mittel', 'flach']).toContain(bilanz.reformTiefe);
    expect(['harmonisch', 'angespannt', 'kritisch']).toContain(bilanz.koalitionsBilanz);
    expect(bilanz.bilanzPunkte).toBeUndefined();
  });

  it('berechneBilanzNote: Summe der Teilscores ≤ 100 und Note passt zu Schwellen', () => {
    const state = createInitialState(content, complexity);
    const bilanz = berechneLegislaturBilanz(state, content);
    const scored = berechneBilanzNote(bilanz, state);
    expect(scored.bilanzPunkte).toBeGreaterThanOrEqual(0);
    expect(scored.bilanzPunkte).toBeLessThanOrEqual(100);
    const d = scored.bilanzPunkteDetail;
    const sum =
      d.gesetze +
      d.politikfelder +
      d.haushalt +
      d.stabilitaet +
      d.koalition +
      d.zusammenhalt +
      d.reformTiefe;
    expect(sum).toBe(scored.bilanzPunkte);
    if (scored.bilanzPunkte >= 80) expect(scored.bilanzNote).toBe('A');
    else if (scored.bilanzPunkte >= 60) expect(scored.bilanzNote).toBe('B');
    else if (scored.bilanzPunkte >= 40) expect(scored.bilanzNote).toBe('C');
    else if (scored.bilanzPunkte >= 20) expect(scored.bilanzNote).toBe('D');
    else expect(scored.bilanzNote).toBe('F');
  });

  it('finalisiereLegislaturBilanzAmSpielende setzt bilanzPunkte und bilanzNote', () => {
    let state = createInitialState(content, complexity);
    state = { ...state, month: 48, wahlkampfAktiv: true };
    const full = finalisiereLegislaturBilanzAmSpielende(state, content);
    expect(full.bilanzPunkte).toBeDefined();
    expect(full.bilanzNote).toBeDefined();
    expect(full.bilanzPunkteDetail).toBeDefined();
  });

  it('triggerWahlnacht finalisiert Legislatur-Bilanz bei Wahlkampf', () => {
    let state = createInitialState(content, complexity);
    state = {
      ...state,
      month: 48,
      wahlkampfAktiv: true,
      wahlprognose: 45,
      gameOver: false,
    };
    const after = triggerWahlnacht(state, content, complexity);
    expect(after.gameOver).toBe(true);
    expect(after.legislaturBilanz?.bilanzNote).toBeDefined();
    expect(after.legislaturBilanz?.bilanzPunkte).toBeDefined();
    expect(after.spielziel).toBeDefined();
    expect(after.wahlUeberHuerde).toBeDefined();
    expect(typeof after.legislaturErfolg).toBe('boolean');
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
