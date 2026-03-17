import { describe, it, expect } from 'vitest';
import { staedtebuendnis, kommunalKonferenz, laenderGipfel, pilotBeschleunigen } from './ebeneActions';
import { createInitialState } from '../state';
import { DEFAULT_CONTENT } from '../../data/defaults/scenarios';
import type { GameState } from '../types';

function makeState(overrides: Partial<GameState> = {}): GameState {
  const base = createInitialState(DEFAULT_CONTENT, 4);
  return { ...base, pk: 50, month: 6, ...overrides };
}

describe('staedtebuendnis', () => {
  it('kostet 10 PK und setzt staedtebuendnisBisMonat', () => {
    const state = makeState();
    const result = staedtebuendnis(state, 4);
    expect(result.pk).toBe(state.pk - 10);
    expect(result.staedtebuendnisBisMonat).toBeDefined();
  });

  it('wird nicht ausgeführt bei zu wenig PK', () => {
    const state = makeState({ pk: 5 });
    const result = staedtebuendnis(state, 4);
    expect(result).toBe(state);
  });

  it('wird nicht ausgeführt wenn Feature nicht aktiv (complexity 1)', () => {
    const state = makeState();
    const result = staedtebuendnis(state, 1);
    expect(result).toBe(state);
  });

  it('berechnet bisMonat korrekt (bis Jahresende)', () => {
    const state = makeState({ month: 15 });
    const result = staedtebuendnis(state, 4);
    // month 15: floor(15/12)*12 = 12, bisMonat = 12+11 = 23
    expect(result.staedtebuendnisBisMonat).toBe(23);
  });
});

describe('kommunalKonferenz', () => {
  it('kostet 8 PK und senkt Druck in 2 Politikfeldern', () => {
    const state = makeState({
      politikfeldDruck: { umwelt_energie: 70, wirtschaft_finanzen: 60, bildung_forschung: 30 },
    });
    const result = kommunalKonferenz(state, 4);
    expect(result.pk).toBe(state.pk - 8);
    expect(result.politikfeldDruck!['umwelt_energie']).toBe(60); // 70 - 10
    expect(result.politikfeldDruck!['wirtschaft_finanzen']).toBe(50); // 60 - 10
    expect(result.politikfeldDruck!['bildung_forschung']).toBe(30); // unverändert
  });

  it('wird nicht ausgeführt bei zu wenig PK', () => {
    const state = makeState({ pk: 5 });
    const result = kommunalKonferenz(state, 4);
    expect(result).toBe(state);
  });

  it('kann nur 1× pro Jahr genutzt werden', () => {
    const state = makeState({
      politikfeldDruck: { umwelt_energie: 70 },
      kommunalKonferenzJahr: 0, // aktuelles Jahr (month=6 → floor(6/12)=0)
    });
    const result = kommunalKonferenz(state, 4);
    expect(result).toBe(state);
  });

  it('funktioniert ohne politikfeldDruck', () => {
    const state = makeState();
    const result = kommunalKonferenz(state, 4);
    // Kein Druck → kein Effekt, gibt state zurück
    expect(result).toBe(state);
  });
});

describe('laenderGipfel', () => {
  it('kostet 12 PK und verbessert Bundesrat-Beziehungen', () => {
    const state = makeState({
      bundesratFraktionen: [
        { id: 'f1', name: 'F1', sprecher: { name: '', partei: '', land: '', initials: '', color: '', bio: '' }, laender: ['NW'], basisBereitschaft: 50, beziehung: 40, tradeoffPool: [] },
        { id: 'f2', name: 'F2', sprecher: { name: '', partei: '', land: '', initials: '', color: '', bio: '' }, laender: ['BY'], basisBereitschaft: 50, beziehung: 60, tradeoffPool: [] },
      ],
    });
    const result = laenderGipfel(state, 4);
    expect(result.pk).toBe(state.pk - 12);
    expect(result.bundesratFraktionen[0].beziehung).toBe(50); // 40 + 10
    expect(result.bundesratFraktionen[1].beziehung).toBe(70); // 60 + 10
  });

  it('wird nicht ausgeführt bei zu wenig PK', () => {
    const state = makeState({ pk: 5 });
    const result = laenderGipfel(state, 4);
    expect(result).toBe(state);
  });

  it('wird nicht ausgeführt ohne Bundesrat-Fraktionen', () => {
    const state = makeState({ bundesratFraktionen: [] });
    const result = laenderGipfel(state, 4);
    expect(result).toBe(state);
  });

  it('clampt Beziehung auf max 100', () => {
    const state = makeState({
      bundesratFraktionen: [
        { id: 'f1', name: 'F1', sprecher: { name: '', partei: '', land: '', initials: '', color: '', bio: '' }, laender: ['NW'], basisBereitschaft: 50, beziehung: 95, tradeoffPool: [] },
      ],
    });
    const result = laenderGipfel(state, 4);
    expect(result.bundesratFraktionen[0].beziehung).toBe(100);
  });
});

describe('pilotBeschleunigen', () => {
  it('kostet 6 PK und erhöht vorstufeBonusMonate', () => {
    const state = makeState({
      gesetze: [{ id: 'g1', titel: 'G1', kurz: 'G1', desc: '', tags: ['bund' as const], status: 'entwurf' as const, ja: 50, nein: 50, effekte: {}, lag: 3, expanded: false, route: null, rprog: 0, rdur: 0, blockiert: null }],
      gesetzProjekte: {
        g1: {
          gesetzId: 'g1', status: 'vorbereitung',
          aktiveVorstufen: [{ typ: 'kommunal', startMonat: 1, dauerMonate: 6, fortschritt: 30, erfolgschance: 70, abgeschlossen: false }],
          boni: { btStimmenBonus: 0, pkKostenRabatt: 0, kofinanzierung: 0, bundesratBonus: 0, medienRueckhalt: 0 },
        },
      },
    });
    const result = pilotBeschleunigen(state, 'g1', 'kommunal', 4);
    expect(result.pk).toBe(state.pk - 6);
    expect(result.vorstufeBonusMonate!['g1']).toBe(1);
  });

  it('wird nicht ausgeführt bei zu wenig PK', () => {
    const state = makeState({ pk: 3 });
    const result = pilotBeschleunigen(state, 'g1', 'kommunal', 4);
    expect(result).toBe(state);
  });

  it('wird nicht ausgeführt ohne Projekt', () => {
    const state = makeState();
    const result = pilotBeschleunigen(state, 'nonexistent', 'kommunal', 4);
    expect(result).toBe(state);
  });

  it('wird nicht ausgeführt wenn Vorstufe bereits abgeschlossen', () => {
    const state = makeState({
      gesetzProjekte: {
        g1: {
          gesetzId: 'g1', status: 'vorbereitung',
          aktiveVorstufen: [{ typ: 'kommunal', startMonat: 1, dauerMonate: 6, fortschritt: 100, erfolgschance: 70, abgeschlossen: true }],
          boni: { btStimmenBonus: 0, pkKostenRabatt: 0, kofinanzierung: 0, bundesratBonus: 0, medienRueckhalt: 0 },
        },
      },
    });
    const result = pilotBeschleunigen(state, 'g1', 'kommunal', 4);
    expect(result).toBe(state);
  });
});
