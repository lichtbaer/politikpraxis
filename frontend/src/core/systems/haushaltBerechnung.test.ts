import { describe, it, expect } from 'vitest';
import { berechneEinnahmen, berechnePflichtausgaben } from './haushaltBerechnung';
import { makeState } from '../test-helpers';
import { EINNAHMEN_BASIS, PFLICHTAUSGABEN_BASIS } from '../constants';

describe('berechneEinnahmen', () => {
  it('gibt EINNAHMEN_BASIS zurück wenn kein haushalt vorhanden', () => {
    const state = makeState({ haushalt: undefined as never });
    expect(berechneEinnahmen(state)).toBe(EINNAHMEN_BASIS);
  });

  it('gibt gerundeten numerischen Wert zurück', () => {
    const state = makeState();
    const result = berechneEinnahmen(state);
    expect(typeof result).toBe('number');
    expect(Number.isInteger(result)).toBe(true);
  });

  it('höhere Arbeitslosigkeit reduziert Einnahmen', () => {
    const stateLowAl = makeState({ kpi: { al: 3, hh: 0, gi: 30, zf: 55 } });
    const stateHighAl = makeState({ kpi: { al: 12, hh: 0, gi: 30, zf: 55 } });
    expect(berechneEinnahmen(stateLowAl)).toBeGreaterThan(berechneEinnahmen(stateHighAl));
  });

  it('positiver konjunkturIndex erhöht Einnahmen', () => {
    const stateGood = makeState({ haushalt: { ...makeState().haushalt!, konjunkturIndex: 3 } });
    const stateBad = makeState({ haushalt: { ...makeState().haushalt!, konjunkturIndex: -3 } });
    expect(berechneEinnahmen(stateGood)).toBeGreaterThan(berechneEinnahmen(stateBad));
  });

  it('steuerpolitikModifikator 1.1 erhöht Einnahmen gegenüber 0.9', () => {
    const stateHigh = makeState({ haushalt: { ...makeState().haushalt!, steuerpolitikModifikator: 1.1 } });
    const stateLow = makeState({ haushalt: { ...makeState().haushalt!, steuerpolitikModifikator: 0.9 } });
    expect(berechneEinnahmen(stateHigh)).toBeGreaterThan(berechneEinnahmen(stateLow));
  });

  it('bei Referenz-AL und konjunkturIndex=0 und Modifikator=1 gibt EINNAHMEN_BASIS zurück', () => {
    const state = makeState({
      kpi: { al: 5, hh: 0, gi: 30, zf: 55 }, // al=5 ist EINNAHMEN_AL_REFERENZ
      haushalt: { ...makeState().haushalt!, konjunkturIndex: 0, steuerpolitikModifikator: 1.0 },
    });
    expect(berechneEinnahmen(state)).toBe(EINNAHMEN_BASIS);
  });
});

describe('berechnePflichtausgaben', () => {
  it('gibt gerundeten numerischen Wert zurück', () => {
    const state = makeState();
    const result = berechnePflichtausgaben(state);
    expect(typeof result).toBe('number');
    expect(Number.isInteger(result)).toBe(true);
  });

  it('ohne AL-Überschreitung und ohne beschlossene Gesetze gibt PFLICHTAUSGABEN_BASIS zurück', () => {
    const state = makeState({
      kpi: { al: 5, hh: 0, gi: 30, zf: 55 }, // al=5 ≤ 6 → kein Aufschlag
      gesetze: [],
    });
    expect(berechnePflichtausgaben(state)).toBe(PFLICHTAUSGABEN_BASIS);
  });

  it('AL > 6 fügt Aufschlag hinzu', () => {
    const stateHighAl = makeState({ kpi: { al: 10, hh: 0, gi: 30, zf: 55 }, gesetze: [] });
    const stateNormalAl = makeState({ kpi: { al: 5, hh: 0, gi: 30, zf: 55 }, gesetze: [] });
    expect(berechnePflichtausgaben(stateHighAl)).toBeGreaterThan(berechnePflichtausgaben(stateNormalAl));
  });

  it('AL-Aufschlag ist proportional: (al - 6) × 2', () => {
    const state = makeState({
      kpi: { al: 9, hh: 0, gi: 30, zf: 55 }, // al=9 → (9-6) × 2 = 6
      gesetze: [],
    });
    expect(berechnePflichtausgaben(state)).toBe(PFLICHTAUSGABEN_BASIS + 6);
  });

  it('beschlossene Gesetze mit pflichtausgaben_delta werden akkumuliert', () => {
    const state = makeState({
      kpi: { al: 5, hh: 0, gi: 30, zf: 55 },
      gesetze: [
        makeState().gesetze[0] ? makeState().gesetze[0] : {
          id: 'g1', titel: 'T', kurz: 'K', desc: 'D', tags: ['bund'],
          ja: 55, nein: 45, effekte: {}, lag: 3, status: 'beschlossen' as const,
          expanded: false, route: null, rprog: 0, rdur: 0, blockiert: null,
          pflichtausgaben_delta: 10,
        },
      ].filter(g => g.status === 'beschlossen' || true).map(g => ({
        ...g,
        status: 'beschlossen' as const,
        pflichtausgaben_delta: 10,
      })),
    });
    const result = berechnePflichtausgaben(state);
    // Jedes beschlossene Gesetz mit delta=10 sollte addiert werden
    expect(result).toBeGreaterThan(PFLICHTAUSGABEN_BASIS);
  });

  it('nur beschlossene Gesetze zählen (nicht aktiv/entwurf)', () => {
    const stateWithEntwurf = makeState({
      kpi: { al: 5, hh: 0, gi: 30, zf: 55 },
      gesetze: [{
        id: 'g1', titel: 'T', kurz: 'K', desc: 'D', tags: ['bund'],
        ja: 55, nein: 45, effekte: {}, lag: 3, status: 'entwurf' as const,
        expanded: false, route: null, rprog: 0, rdur: 0, blockiert: null,
        pflichtausgaben_delta: 99,
      }],
    });
    expect(berechnePflichtausgaben(stateWithEntwurf)).toBe(PFLICHTAUSGABEN_BASIS);
  });
});
