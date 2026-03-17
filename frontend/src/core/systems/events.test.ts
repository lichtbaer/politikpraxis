import { describe, it, expect, vi } from 'vitest';
import { createInitialState } from '../state';
import { DEFAULT_CONTENT } from '../../data/defaults/scenarios';
import { TV_DUELL_EVENT, KOALITIONSPARTNER_ALLEINGANG_EVENT, WAHLKAMPF_BEGINN_EVENT } from '../../data/defaults/wahlkampfEvents';
import { checkRandomEvents } from './events';

describe('events', () => {
  const content = DEFAULT_CONTENT;
  const complexity = 4;

  it('checkRandomEvents triggert nie Wahlkampf-Events (SMA-296)', () => {
    const wahlkampfOnly = [WAHLKAMPF_BEGINN_EVENT, TV_DUELL_EVENT, KOALITIONSPARTNER_ALLEINGANG_EVENT];
    let state = createInitialState(content, complexity);
    state = { ...state, month: 3, firedEvents: [] };

    vi.spyOn(Math, 'random').mockReturnValue(0);

    const result = checkRandomEvents(state, wahlkampfOnly);

    expect(result.activeEvent).toBeFalsy();

    vi.restoreAllMocks();
  });
});
