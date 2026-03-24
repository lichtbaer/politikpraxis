import { describe, it, expect } from 'vitest';
import { applyAusrichtung } from './ausrichtung';
import { createInitialState } from '../state';
import { DEFAULT_CONTENT } from '../../data/defaults/scenarios';

function makeState() {
  return createInitialState(DEFAULT_CONTENT, 4);
}

describe('applyAusrichtung', () => {
  it('gibt unveränderten State bei neutraler Ausrichtung (0,0,0)', () => {
    const state = makeState();
    const result = applyAusrichtung(state, { wirtschaft: 0, gesellschaft: 0, staat: 0 });
    expect(result.zust.arbeit).toBe(state.zust.arbeit);
    expect(result.zust.mitte).toBe(state.zust.mitte);
    expect(result.zust.prog).toBe(state.zust.prog);
  });

  // Wirtschaft negativ → Umverteilung
  it('Wirtschaft negativ: erhöht arbeit, senkt mitte', () => {
    const state = makeState();
    const result = applyAusrichtung(state, { wirtschaft: -100, gesellschaft: 0, staat: 0 });
    expect(result.zust.arbeit).toBeGreaterThan(state.zust.arbeit);
    expect(result.zust.mitte).toBeLessThan(state.zust.mitte);
  });

  it('Wirtschaft negativ: senkt Finanzminister Loyalty', () => {
    const state = {
      ...makeState(),
      chars: [{ id: 'sdp_fm', name: 'FM', role: 'FM', initials: 'FM', color: '#000', mood: 2, loyalty: 3, bio: '', interests: [], bonus: { trigger: '', desc: '', applies: '' }, ultimatum: { moodThresh: 0, event: '' }, ressort: 'finanzen' as const }],
    };
    const result = applyAusrichtung(state, { wirtschaft: -100, gesellschaft: 0, staat: 0 });
    const fm = result.chars.find(c => c.id === 'sdp_fm')!;
    expect(fm.loyalty).toBeLessThan(3);
  });

  // Wirtschaft positiv → Wachstum
  it('Wirtschaft positiv: erhöht mitte, senkt arbeit', () => {
    const state = makeState();
    const result = applyAusrichtung(state, { wirtschaft: 100, gesellschaft: 0, staat: 0 });
    expect(result.zust.mitte).toBeGreaterThan(state.zust.mitte);
    expect(result.zust.arbeit).toBeLessThan(state.zust.arbeit);
  });

  it('Wirtschaft positiv: erhöht Wirtschaftsminister Loyalty', () => {
    const state = {
      ...makeState(),
      chars: [{ id: 'sdp_wm', name: 'WM', role: 'WM', initials: 'WM', color: '#000', mood: 2, loyalty: 2, bio: '', interests: [], bonus: { trigger: '', desc: '', applies: '' }, ultimatum: { moodThresh: 0, event: '' }, ressort: 'wirtschaft' as const }],
    };
    const result = applyAusrichtung(state, { wirtschaft: 100, gesellschaft: 0, staat: 0 });
    const wm = result.chars.find(c => c.id === 'sdp_wm')!;
    expect(wm.loyalty).toBeGreaterThan(2);
  });

  // Gesellschaft negativ → Offenheit
  it('Gesellschaft negativ: erhöht prog', () => {
    const state = makeState();
    const result = applyAusrichtung(state, { wirtschaft: 0, gesellschaft: -100, staat: 0 });
    expect(result.zust.prog).toBeGreaterThan(state.zust.prog);
  });

  // Gesellschaft positiv → Ordnung
  it('Gesellschaft positiv: senkt prog', () => {
    const state = makeState();
    const result = applyAusrichtung(state, { wirtschaft: 0, gesellschaft: 100, staat: 0 });
    expect(result.zust.prog).toBeLessThan(state.zust.prog);
  });

  // Staat negativ → Gemeinschaft
  it('Staat negativ: verbessert koalitionstreue/ostblock Beziehung', () => {
    const state = {
      ...makeState(),
      bundesratFraktionen: [
        { id: 'koalitionstreue', name: 'KT', sprecher: { name: '', partei: '', land: '', initials: '', color: '', bio: '' }, laender: ['NW'], basisBereitschaft: 50, beziehung: 40, tradeoffPool: [] },
        { id: 'ostblock', name: 'OB', sprecher: { name: '', partei: '', land: '', initials: '', color: '', bio: '' }, laender: ['SN'], basisBereitschaft: 30, beziehung: 30, tradeoffPool: [] },
      ],
    };
    const result = applyAusrichtung(state, { wirtschaft: 0, gesellschaft: 0, staat: -100 });
    expect(result.bundesratFraktionen.find(f => f.id === 'koalitionstreue')!.beziehung).toBeGreaterThan(40);
    expect(result.bundesratFraktionen.find(f => f.id === 'ostblock')!.beziehung).toBeGreaterThan(30);
  });

  // Staat positiv → Eigenverantwortung
  it('Staat positiv: verbessert konservativer_block/pragmatische_mitte Beziehung', () => {
    const state = {
      ...makeState(),
      bundesratFraktionen: [
        { id: 'konservativer_block', name: 'KB', sprecher: { name: '', partei: '', land: '', initials: '', color: '', bio: '' }, laender: ['BY'], basisBereitschaft: 50, beziehung: 40, tradeoffPool: [] },
        { id: 'pragmatische_mitte', name: 'PM', sprecher: { name: '', partei: '', land: '', initials: '', color: '', bio: '' }, laender: ['HE'], basisBereitschaft: 50, beziehung: 40, tradeoffPool: [] },
      ],
    };
    const result = applyAusrichtung(state, { wirtschaft: 0, gesellschaft: 0, staat: 100 });
    expect(result.bundesratFraktionen.find(f => f.id === 'konservativer_block')!.beziehung).toBeGreaterThan(40);
    expect(result.bundesratFraktionen.find(f => f.id === 'pragmatische_mitte')!.beziehung).toBeGreaterThan(40);
  });

  // Clamping
  it('clampt Zustimmungswerte auf 0–100', () => {
    const state = { ...makeState(), zust: { g: 52, arbeit: 98, mitte: 98, prog: 98 } };
    const result = applyAusrichtung(state, { wirtschaft: -100, gesellschaft: -100, staat: 0 });
    expect(result.zust.arbeit).toBeLessThanOrEqual(100);
    expect(result.zust.prog).toBeLessThanOrEqual(100);
  });

  it('skaliert Effekte proportional zur Stärke', () => {
    const state = makeState();
    const half = applyAusrichtung(state, { wirtschaft: -50, gesellschaft: 0, staat: 0 });
    const full = applyAusrichtung(state, { wirtschaft: -100, gesellschaft: 0, staat: 0 });
    const halfDelta = half.zust.arbeit - state.zust.arbeit;
    const fullDelta = full.zust.arbeit - state.zust.arbeit;
    expect(fullDelta).toBeGreaterThan(halfDelta);
  });
});
