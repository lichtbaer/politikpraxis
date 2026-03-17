import { describe, it, expect, vi } from 'vitest';
import { medienkampagne } from './media';
import { createInitialState } from '../state';
import { DEFAULT_CONTENT } from '../../data/defaults/scenarios';
import type { GameState } from '../types';

function makeState(overrides: Partial<GameState> = {}): GameState {
  const base = createInitialState(DEFAULT_CONTENT, 4);
  return { ...base, pk: 50, ...overrides };
}

describe('medienkampagne', () => {
  it('kostet 10 PK', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const state = makeState();
    const result = medienkampagne(state, 'arbeit');
    expect(result.pk).toBe(40);
    vi.restoreAllMocks();
  });

  it('erhöht Zustimmung im gewählten Milieu', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const state = makeState({ zust: { g: 50, arbeit: 50, mitte: 50, prog: 50 } });
    const result = medienkampagne(state, 'arbeit');
    expect(result.zust.arbeit).toBeGreaterThan(50);
    vi.restoreAllMocks();
  });

  it('funktioniert für alle Milieu-Keys', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const state = makeState({ zust: { g: 50, arbeit: 50, mitte: 50, prog: 50 } });

    const resultArbeit = medienkampagne(state, 'arbeit');
    expect(resultArbeit.zust.arbeit).toBeGreaterThan(50);

    const resultMitte = medienkampagne(state, 'mitte');
    expect(resultMitte.zust.mitte).toBeGreaterThan(50);

    const resultProg = medienkampagne(state, 'prog');
    expect(resultProg.zust.prog).toBeGreaterThan(50);

    vi.restoreAllMocks();
  });

  it('clampt Zustimmung auf max 90', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const state = makeState({ zust: { g: 50, arbeit: 89, mitte: 50, prog: 50 } });
    const result = medienkampagne(state, 'arbeit');
    expect(result.zust.arbeit).toBeLessThanOrEqual(90);
    vi.restoreAllMocks();
  });

  it('nicht möglich bei zu wenig PK', () => {
    const state = makeState({ pk: 5 });
    const result = medienkampagne(state, 'arbeit');
    expect(result).toBe(state);
  });

  it('Gain liegt zwischen 2 und 5', () => {
    // random=0 → floor(0*4)+2 = 2; random=0.99 → floor(3.96)+2 = 5
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const state = makeState({ zust: { g: 50, arbeit: 50, mitte: 50, prog: 50 } });
    const resultMin = medienkampagne(state, 'arbeit');
    expect(resultMin.zust.arbeit).toBe(52);

    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const resultMax = medienkampagne(state, 'arbeit');
    expect(resultMax.zust.arbeit).toBe(55);

    vi.restoreAllMocks();
  });
});
