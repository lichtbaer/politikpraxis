import { describe, it, expect } from 'vitest';
import { createInitialState } from '../../state';
import { DEFAULT_CONTENT } from '../../../data/defaults/scenarios';
import {
  berechneWahlnachtParteienErgebnis,
  berechneWahlnachtKoalitionsoptionen,
  WAHLNACHT_SPERRKLAUSEL_PROZENT,
} from './wahlnachtParteien';

describe('wahlnachtParteien', () => {
  const content = DEFAULT_CONTENT;
  const complexity = 4;

  it('liefert leeres Ergebnis ohne Spielerpartei', () => {
    let state = createInitialState(content, complexity);
    state = { ...state, spielerPartei: undefined };
    expect(berechneWahlnachtParteienErgebnis(state, 45)).toEqual([]);
  });

  it('Stimmenanteile aller Parteien summieren sich exakt auf 100', () => {
    const state = createInitialState(content, complexity);
    const ergebnisse = berechneWahlnachtParteienErgebnis(state, 42);
    const summe = ergebnisse.reduce((s, e) => s + e.stimmenanteil, 0);
    expect(Math.round(summe * 10) / 10).toBe(100);
    // Spielerpartei + Koalitionspartner + 3 übrige Parteien + Sonstige
    expect(ergebnisse).toHaveLength(6);
  });

  it('enthält genau eine Regierungspartei und einen Koalitionspartner', () => {
    const state = createInitialState(content, complexity);
    const ergebnisse = berechneWahlnachtParteienErgebnis(state, 42);
    expect(ergebnisse.filter((e) => e.rolle === 'regierung')).toHaveLength(1);
    expect(ergebnisse.filter((e) => e.rolle === 'koalitionspartner')).toHaveLength(1);
    const regierung = ergebnisse.find((e) => e.rolle === 'regierung')!;
    expect(regierung.id).toBe(state.spielerPartei!.id);
    const partner = ergebnisse.find((e) => e.rolle === 'koalitionspartner')!;
    expect(partner.id).toBe(state.koalitionspartner!.id);
  });

  it('„Sonstige“ ist konzeptionell nie über der Sperrklausel', () => {
    const state = createInitialState(content, complexity);
    const ergebnisse = berechneWahlnachtParteienErgebnis(state, 42);
    const sonstige = ergebnisse.find((e) => e.id === 'sonstige')!;
    expect(sonstige.ueberHuerde).toBe(false);
    expect(sonstige.sitzanteil).toBe(0);
  });

  it('Parteien unter der Sperrklausel erhalten 0 Sitzanteil, alle Sitzanteile über der Hürde summieren auf 100', () => {
    const state = createInitialState(content, complexity);
    const ergebnisse = berechneWahlnachtParteienErgebnis(state, 42);
    for (const e of ergebnisse) {
      if (e.stimmenanteil < WAHLNACHT_SPERRKLAUSEL_PROZENT) {
        expect(e.ueberHuerde).toBe(false);
        expect(e.sitzanteil).toBe(0);
      }
    }
    const sitzSumme = ergebnisse.filter((e) => e.ueberHuerde).reduce((s, e) => s + e.sitzanteil, 0);
    expect(Math.round(sitzSumme)).toBe(100);
  });

  it('hoher Wahlerfolg vergrößert den Stimmenanteil der Spielerpartei gegenüber niedrigem', () => {
    const state = createInitialState(content, complexity);
    const schwach = berechneWahlnachtParteienErgebnis(state, 20);
    const stark = berechneWahlnachtParteienErgebnis(state, 48);
    const anteilSchwach = schwach.find((e) => e.rolle === 'regierung')!.stimmenanteil;
    const anteilStark = stark.find((e) => e.rolle === 'regierung')!.stimmenanteil;
    expect(anteilStark).toBeGreaterThan(anteilSchwach);
  });

  it('berechneWahlnachtKoalitionsoptionen liefert nur Optionen aus Parteien über der Sperrklausel', () => {
    const state = createInitialState(content, complexity);
    const ergebnisse = berechneWahlnachtParteienErgebnis(state, 42);
    const optionen = berechneWahlnachtKoalitionsoptionen(ergebnisse);
    expect(optionen.length).toBeGreaterThan(0);
    const ueberHuerdeIds = new Set(
      ergebnisse.filter((e) => e.ueberHuerde && e.rolle !== 'regierung').map((e) => e.id),
    );
    for (const option of optionen) {
      for (const id of option.partnerIds) {
        expect(ueberHuerdeIds.has(id)).toBe(true);
      }
    }
  });

  it('mindestens eine mehrheitsfähige Koalitionsoption existiert bei starkem Wahlergebnis', () => {
    const state = createInitialState(content, complexity);
    const ergebnisse = berechneWahlnachtParteienErgebnis(state, 48);
    const optionen = berechneWahlnachtKoalitionsoptionen(ergebnisse);
    expect(optionen.some((o) => o.mehrheitsfaehig)).toBe(true);
  });

  it('leere Parteienliste liefert leere Koalitionsoptionen', () => {
    expect(berechneWahlnachtKoalitionsoptionen([])).toEqual([]);
  });
});
