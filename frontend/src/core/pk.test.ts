import { describe, it, expect } from 'vitest';
import { verbrauchePK } from './pk';
import { makeState } from './test-helpers';
import { berechnePkRegen, PK_REGEN_BASE, PK_REGEN_CAP, PK_REGEN_FLOOR } from './constants';

describe('verbrauchePK', () => {
  it('gibt null zurück wenn pk kleiner als Kosten ist', () => {
    const state = makeState({ pk: 5 });
    expect(verbrauchePK(state, 10)).toBeNull();
  });

  it('gibt null zurück wenn pk exakt gleich null und Kosten > 0', () => {
    const state = makeState({ pk: 0 });
    expect(verbrauchePK(state, 1)).toBeNull();
  });

  it('gibt neuen State zurück mit reduziertem pk', () => {
    const state = makeState({ pk: 50 });
    const result = verbrauchePK(state, 20);
    expect(result).not.toBeNull();
    expect(result!.pk).toBe(30);
  });

  it('erlaubt Kosten von genau dem verfügbaren pk', () => {
    const state = makeState({ pk: 25 });
    const result = verbrauchePK(state, 25);
    expect(result).not.toBeNull();
    expect(result!.pk).toBe(0);
  });

  it('akkumuliert pkVerbrauchtGesamt korrekt', () => {
    const state = makeState({ pk: 100, pkVerbrauchtGesamt: 30 });
    const result = verbrauchePK(state, 20);
    expect(result!.pkVerbrauchtGesamt).toBe(50);
  });

  it('behandelt pkVerbrauchtGesamt === undefined (Initialzustand)', () => {
    const state = { ...makeState({ pk: 50 }), pkVerbrauchtGesamt: undefined };
    const result = verbrauchePK(state, 10);
    expect(result!.pkVerbrauchtGesamt).toBe(10);
  });

  it('mutiert den ursprünglichen State nicht', () => {
    const state = makeState({ pk: 80 });
    const original_pk = state.pk;
    verbrauchePK(state, 10);
    expect(state.pk).toBe(original_pk);
  });

  it('gibt neues State-Objekt zurück (keine In-Place-Mutation)', () => {
    const state = makeState({ pk: 50 });
    const result = verbrauchePK(state, 10);
    expect(result).not.toBe(state);
  });
});

describe('berechnePkRegen', () => {
  it('steigt mit der Zustimmung und respektiert Floor/Cap', () => {
    for (const stufe of [1, 2, 3, 4]) {
      const niedrig = berechnePkRegen(15, stufe);
      const mittel = berechnePkRegen(40, stufe);
      const hoch = berechnePkRegen(85, stufe);
      expect(niedrig).toBeLessThan(mittel);
      expect(mittel).toBeLessThan(hoch);
      expect(niedrig).toBeGreaterThanOrEqual(PK_REGEN_FLOOR);
      expect(hoch).toBeLessThanOrEqual(PK_REGEN_CAP[stufe]);
    }
  });

  it('liefert bei Referenz-Zustimmung 40 die Stufen-Basis', () => {
    expect(berechnePkRegen(40, 1)).toBe(PK_REGEN_BASE[1]);
    expect(berechnePkRegen(40, 4)).toBe(PK_REGEN_BASE[4]);
  });

  it('höhere Komplexität regeneriert nie mehr als niedrigere', () => {
    for (const zust of [10, 30, 50, 70, 90]) {
      expect(berechnePkRegen(zust, 4)).toBeLessThanOrEqual(berechnePkRegen(zust, 1));
    }
  });

  it('fällt nie unter den Floor, auch bei Zustimmung 0', () => {
    expect(berechnePkRegen(0, 4)).toBe(PK_REGEN_FLOOR);
  });
});
