import { describe, it, expect } from 'vitest';
import { shouldPauseForEvent, withPause } from './eventPause';
import { makeState } from './test-helpers';

describe('shouldPauseForEvent', () => {
  it('never: pausiert nie', () => {
    expect(shouldPauseForEvent(makeState({ speed: 1 }), 'never')).toBe(false);
    expect(shouldPauseForEvent(makeState({ speed: 2 }), 'never')).toBe(false);
  });

  it('always: pausiert immer, unabhängig vom Speed', () => {
    expect(shouldPauseForEvent(makeState({ speed: 1 }), 'always')).toBe(true);
    expect(shouldPauseForEvent(makeState({ speed: 2 }), 'always')).toBe(true);
  });

  it('fast_only: pausiert nur bei 2× (#282)', () => {
    expect(shouldPauseForEvent(makeState({ speed: 1 }), 'fast_only')).toBe(false);
    expect(shouldPauseForEvent(makeState({ speed: 2 }), 'fast_only')).toBe(true);
  });
});

describe('withPause', () => {
  it('setzt speed auf 0 und merkt sich den vorherigen Speed', () => {
    const state = makeState({ speed: 2 });
    expect(withPause(state, 'always')).toEqual({ speed: 0, speedBeforePause: 2 });
  });

  it('liefert leeres Objekt, wenn nicht pausiert werden soll', () => {
    const state = makeState({ speed: 1 });
    expect(withPause(state, 'fast_only')).toEqual({});
  });
});
