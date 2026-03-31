import { describe, it, expect } from 'vitest';
import {
  kannGesetzEingebracht,
  berechneGesetzEffektMitSynergien,
  getFehlendeRequires,
  getAusschliessendeExcludes,
  getAktiveEnhances,
} from './gesetz';
import { makeState, makeLaw } from './test-helpers';
import type { GesetzRelation } from './types';

function stateWithBeschlossene(ids: string[]) {
  const gesetze = ids.map((id) => makeLaw({ id, status: 'beschlossen' }));
  return makeState({ gesetze });
}

function makeRelation(overrides: Partial<GesetzRelation> & { typ: GesetzRelation['typ']; targetId: string }): GesetzRelation {
  return {
    gesetzId: 'test_law',
    targetId: overrides.targetId,
    typ: overrides.typ,
    enhancesFaktor: overrides.enhancesFaktor,
  };
}

describe('kannGesetzEingebracht', () => {
  it('gibt true zurück wenn keine Relationen definiert sind', () => {
    const state = makeState();
    expect(kannGesetzEingebracht(state, 'irgendein_gesetz', {})).toBe(true);
  });

  it('gibt true zurück wenn requires erfüllt ist', () => {
    const state = stateWithBeschlossene(['voraussetzung']);
    const relationen = {
      zielgesetz: [makeRelation({ typ: 'requires', targetId: 'voraussetzung' })],
    };
    expect(kannGesetzEingebracht(state, 'zielgesetz', relationen)).toBe(true);
  });

  it('gibt false zurück wenn requires nicht erfüllt ist', () => {
    const state = makeState({ gesetze: [] });
    const relationen = {
      zielgesetz: [makeRelation({ typ: 'requires', targetId: 'voraussetzung' })],
    };
    expect(kannGesetzEingebracht(state, 'zielgesetz', relationen)).toBe(false);
  });

  it('gibt false zurück wenn excludes zutrifft (kollidierendes Gesetz beschlossen)', () => {
    const state = stateWithBeschlossene(['konkurrenzgesetz']);
    const relationen = {
      zielgesetz: [makeRelation({ typ: 'excludes', targetId: 'konkurrenzgesetz' })],
    };
    expect(kannGesetzEingebracht(state, 'zielgesetz', relationen)).toBe(false);
  });

  it('gibt true zurück wenn excludes nicht zutrifft', () => {
    const state = makeState({ gesetze: [] });
    const relationen = {
      zielgesetz: [makeRelation({ typ: 'excludes', targetId: 'konkurrenzgesetz' })],
    };
    expect(kannGesetzEingebracht(state, 'zielgesetz', relationen)).toBe(true);
  });

  it('funktioniert mit undefined relationen', () => {
    const state = makeState();
    expect(kannGesetzEingebracht(state, 'gesetz', undefined)).toBe(true);
  });
});

describe('berechneGesetzEffektMitSynergien', () => {
  it('gibt den Basiseffekt zurück wenn keine Relationen definiert sind', () => {
    const state = makeState({ gesetze: [] });
    const result = berechneGesetzEffektMitSynergien(state, 'gesetz', 10, {});
    expect(result).toBe(10);
  });

  it('gibt den Basiseffekt zurück wenn Synergieziel nicht beschlossen ist', () => {
    const state = makeState({ gesetze: [] });
    const relationen = {
      gesetz: [makeRelation({ typ: 'enhances', targetId: 'synergieziel', enhancesFaktor: 1.5 })],
    };
    const result = berechneGesetzEffektMitSynergien(state, 'gesetz', 10, relationen);
    expect(result).toBe(10);
  });

  it('multipliziert den Effekt wenn Synergieziel beschlossen ist', () => {
    const state = stateWithBeschlossene(['synergieziel']);
    const relationen = {
      gesetz: [makeRelation({ typ: 'enhances', targetId: 'synergieziel', enhancesFaktor: 1.5 })],
    };
    const result = berechneGesetzEffektMitSynergien(state, 'gesetz', 10, relationen);
    expect(result).toBeCloseTo(15);
  });

  it('kombiniert mehrere Synergiefaktoren multiplikativ', () => {
    const state = stateWithBeschlossene(['syn1', 'syn2']);
    const relationen = {
      gesetz: [
        makeRelation({ typ: 'enhances', targetId: 'syn1', enhancesFaktor: 1.2 }),
        makeRelation({ typ: 'enhances', targetId: 'syn2', enhancesFaktor: 1.5 }),
      ],
    };
    const result = berechneGesetzEffektMitSynergien(state, 'gesetz', 10, relationen);
    expect(result).toBeCloseTo(18); // 10 * 1.2 * 1.5
  });
});

describe('getFehlendeRequires', () => {
  it('gibt null zurück wenn alle requires erfüllt sind', () => {
    const state = stateWithBeschlossene(['voraussetzung']);
    const relationen = {
      gesetz: [makeRelation({ typ: 'requires', targetId: 'voraussetzung' })],
    };
    expect(getFehlendeRequires(state, 'gesetz', relationen)).toBeNull();
  });

  it('gibt die fehlende Relation zurück', () => {
    const state = makeState({ gesetze: [] });
    const rel = makeRelation({ typ: 'requires', targetId: 'fehlt' });
    const relationen = { gesetz: [rel] };
    const result = getFehlendeRequires(state, 'gesetz', relationen);
    expect(result).toMatchObject({ typ: 'requires', targetId: 'fehlt' });
  });

  it('gibt null zurück wenn keine Relationen existieren', () => {
    const state = makeState();
    expect(getFehlendeRequires(state, 'gesetz', {})).toBeNull();
  });
});

describe('getAusschliessendeExcludes', () => {
  it('gibt null zurück wenn kein Konflikt besteht', () => {
    const state = makeState({ gesetze: [] });
    const relationen = {
      gesetz: [makeRelation({ typ: 'excludes', targetId: 'anderes' })],
    };
    expect(getAusschliessendeExcludes(state, 'gesetz', relationen)).toBeNull();
  });

  it('gibt die ausschließende Relation zurück wenn Konflikt besteht', () => {
    const state = stateWithBeschlossene(['konflikt']);
    const rel = makeRelation({ typ: 'excludes', targetId: 'konflikt' });
    const relationen = { gesetz: [rel] };
    const result = getAusschliessendeExcludes(state, 'gesetz', relationen);
    expect(result).toMatchObject({ typ: 'excludes', targetId: 'konflikt' });
  });
});

describe('getAktiveEnhances', () => {
  it('gibt leeres Array zurück wenn keine Synergien aktiv sind', () => {
    const state = makeState({ gesetze: [] });
    const relationen = {
      gesetz: [makeRelation({ typ: 'enhances', targetId: 'nicht_beschlossen' })],
    };
    expect(getAktiveEnhances(state, 'gesetz', relationen)).toHaveLength(0);
  });

  it('gibt nur beschlossene Synergien zurück', () => {
    const state = stateWithBeschlossene(['aktiv']);
    const relationen = {
      gesetz: [
        makeRelation({ typ: 'enhances', targetId: 'aktiv' }),
        makeRelation({ typ: 'enhances', targetId: 'inaktiv' }),
      ],
    };
    const result = getAktiveEnhances(state, 'gesetz', relationen);
    expect(result).toHaveLength(1);
    expect(result[0].targetId).toBe('aktiv');
  });

  it('gibt requires- und excludes-Relationen nicht zurück', () => {
    const state = stateWithBeschlossene(['x']);
    const relationen = {
      gesetz: [
        makeRelation({ typ: 'requires', targetId: 'x' }),
        makeRelation({ typ: 'excludes', targetId: 'x' }),
      ],
    };
    expect(getAktiveEnhances(state, 'gesetz', relationen)).toHaveLength(0);
  });
});
