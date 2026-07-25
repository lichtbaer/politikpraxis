import { describe, it, expect } from 'vitest';
import {
  registerGesetzEinbringung,
  resetGesetzesstau,
  GESETZESSTAU_SCHWELLE,
  GESETZESSTAU_BEZIEHUNG_MALUS,
  GESETZESSTAU_HAUSHALT_MALUS,
} from './gesetzesstau';
import { makeState, makeChar } from '../test-helpers';
import { createInitialHaushalt } from './economics/haushalt';

describe('registerGesetzEinbringung', () => {
  it('erhöht den Streak, ohne unterhalb der Schwelle einen Malus anzuwenden', () => {
    let state = makeState({
      koalitionspartner: { id: 'gp', beziehung: 65, koalitionsvertragScore: 50, schluesselthemenErfuellt: [] },
    });

    for (let i = 0; i < GESETZESSTAU_SCHWELLE; i++) {
      state = registerGesetzEinbringung(state);
    }

    expect(state.gesetzeSeitLetzterPflege).toBe(GESETZESSTAU_SCHWELLE);
    expect(state.koalitionspartner?.beziehung).toBe(65);
  });

  it('senkt Koalitionsbeziehung und Haushaltssaldo ab der Schwelle', () => {
    const haushalt = createInitialHaushalt(makeState());
    let state = makeState({
      koalitionspartner: { id: 'gp', beziehung: 65, koalitionsvertragScore: 50, schluesselthemenErfuellt: [] },
      haushalt: { ...haushalt, saldoKumulativ: 10 },
    });

    // Schwelle + 1 Aufrufe, damit der Malus greift
    for (let i = 0; i <= GESETZESSTAU_SCHWELLE; i++) {
      state = registerGesetzEinbringung(state);
    }

    expect(state.gesetzeSeitLetzterPflege).toBe(GESETZESSTAU_SCHWELLE + 1);
    expect(state.koalitionspartner?.beziehung).toBe(65 - GESETZESSTAU_BEZIEHUNG_MALUS);
    expect(state.haushalt?.saldoKumulativ).toBe(10 - GESETZESSTAU_HAUSHALT_MALUS);
  });

  it('senkt Kabinettsstimmung ab der Schwelle, lässt den Kanzler unangetastet', () => {
    const kanzler = makeChar({ id: 'kanzler', ist_kanzler: true, mood: 3 });
    const minister = makeChar({ id: 'fm', mood: 4 });
    let state = makeState({ chars: [kanzler, minister] });

    for (let i = 0; i <= GESETZESSTAU_SCHWELLE; i++) {
      state = registerGesetzEinbringung(state);
    }

    const kanzlerNach = state.chars.find((c) => c.id === 'kanzler');
    const ministerNach = state.chars.find((c) => c.id === 'fm');
    expect(kanzlerNach?.mood).toBe(3);
    expect(ministerNach?.mood).toBeLessThan(4);
  });

  it('wendet den Malus bei jedem weiteren Einbringen erneut an, bis wieder gepflegt wird', () => {
    const haushalt = createInitialHaushalt(makeState());
    let state = makeState({ haushalt: { ...haushalt, saldoKumulativ: 100 } });

    for (let i = 0; i < GESETZESSTAU_SCHWELLE + 3; i++) {
      state = registerGesetzEinbringung(state);
    }
    const nachMehrerenMali = state.haushalt?.saldoKumulativ ?? 0;
    expect(nachMehrerenMali).toBe(100 - 3 * GESETZESSTAU_HAUSHALT_MALUS);

    state = resetGesetzesstau(state);
    expect(state.gesetzeSeitLetzterPflege).toBe(0);

    // Direkt nach der Pflege greift der Malus wieder erst ab der Schwelle
    state = registerGesetzEinbringung(state);
    expect(state.haushalt?.saldoKumulativ).toBe(nachMehrerenMali);
  });
});

describe('resetGesetzesstau', () => {
  it('ist ein No-Op, wenn kein Streak existiert', () => {
    const state = makeState();
    expect(resetGesetzesstau(state)).toBe(state);
  });
});
