import { describe, it, expect } from 'vitest';
import { checkMinisterialInitiativen } from './ministerialInitiativen';
import type { GameState, Character, MinisterialInitiative } from '../types';

function createMockState(overrides: Partial<GameState> = {}): GameState {
  const char: Character = {
    id: 'fm',
    name: 'Lehmann',
    role: 'Finanzminister',
    initials: 'L',
    color: '#000',
    mood: 3,
    loyalty: 4,
    bio: '',
    interests: ['wirtschaft'],
    bonus: { trigger: '', desc: '', applies: '' },
    ultimatum: { moodThresh: 0, event: '' },
  };

  return {
    month: 1,
    speed: 0,
    pk: 100,
    view: 'agenda',
    kpi: { al: 5, hh: 0, gi: 50, zf: 50 },
    kpiPrev: null,
    zust: { g: 52, arbeit: 58, mitte: 54, prog: 44 },
    coalition: 70,
    chars: [char],
    gesetze: [{
      id: 'ee',
      titel: 'EE',
      kurz: 'EE',
      desc: '',
      tags: ['bund'],
      status: 'entwurf',
      ja: 60,
      nein: 40,
      effekte: {},
      lag: 2,
      expanded: false,
      route: null,
      rprog: 0,
      rdur: 0,
      blockiert: null,
    }],
    bundesrat: [],
    bundesratFraktionen: [],
    activeEvent: null,
    firedEvents: [],
    firedCharEvents: [],
    firedBundesratEvents: [],
    pending: [],
    log: [],
    ticker: '',
    gameOver: false,
    won: false,
    ...overrides,
  } as GameState;
}

describe('checkMinisterialInitiativen', () => {
  it('Zwei-Bedingungen-Check: mind. 2 Bedingungen erfüllt (leere Bedingungen = immer 2)', () => {
    const init: MinisterialInitiative = {
      id: 'mi_ee',
      char_id: 'fm',
      gesetz_ref_id: 'ee',
      bedingungen: [],
      cooldown_months: 8,
    };
    const state = createMockState({ month: 10 });
    const result = checkMinisterialInitiativen(state, [init], 3);
    expect(result.aktiveMinisterialInitiative?.gesetzId).toBe('ee');
  });

  it('triggert nicht bei < 2 Bedingungen', () => {
    const init: MinisterialInitiative = {
      id: 'mi_ee',
      char_id: 'fm',
      gesetz_ref_id: 'ee',
      bedingungen: [
        { type: 'mood', value: 5 },
      ],
      cooldown_months: 8,
    };
    const state = createMockState();
    const result = checkMinisterialInitiativen(state, [init], 3);
    expect(result.aktiveMinisterialInitiative).toBeUndefined();
  });

  it('ändert nichts bei complexity < 3', () => {
    const init: MinisterialInitiative = {
      id: 'mi_ee',
      char_id: 'fm',
      gesetz_ref_id: 'ee',
      bedingungen: [],
      cooldown_months: 8,
    };
    const state = createMockState();
    const result = checkMinisterialInitiativen(state, [init], 2);
    expect(result).toBe(state);
  });
});
