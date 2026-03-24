import { describe, it, expect } from 'vitest';
import { applyCharBonuses, checkUltimatums, updateCoalition, applyMoodChange } from './characters';
import { createInitialState } from '../state';
import { DEFAULT_CONTENT } from '../../data/defaults/scenarios';
import type { GameState, Character, GameEvent } from '../types';

function makeChar(overrides: Partial<Character> = {}): Character {
  return {
    id: 'test',
    name: 'Test',
    role: 'Minister',
    initials: 'T',
    color: '#000',
    mood: 2,
    loyalty: 3,
    bio: '',
    interests: [],
    bonus: { trigger: '', desc: '', applies: '' },
    ultimatum: { moodThresh: 0, event: 'test_event' },
    ...overrides,
  };
}

function makeState(overrides: Partial<GameState> = {}): GameState {
  const base = createInitialState(DEFAULT_CONTENT, 4);
  return { ...base, ...overrides };
}

describe('applyMoodChange', () => {
  it('ändert Mood des spezifizierten Characters', () => {
    const state = makeState({
      chars: [makeChar({ id: 'fm', mood: 2 }), makeChar({ id: 'wm', mood: 3 })],
    });
    const result = applyMoodChange(state, { fm: 1 });
    expect(result.chars.find(c => c.id === 'fm')!.mood).toBe(3);
    expect(result.chars.find(c => c.id === 'wm')!.mood).toBe(3); // unverändert
  });

  it('clampt Mood auf 0-4', () => {
    const state = makeState({ chars: [makeChar({ id: 'fm', mood: 4 })] });
    const result = applyMoodChange(state, { fm: 2 });
    expect(result.chars.find(c => c.id === 'fm')!.mood).toBe(4);
  });

  it('clampt Mood nicht unter 0', () => {
    const state = makeState({ chars: [makeChar({ id: 'fm', mood: 0 })] });
    const result = applyMoodChange(state, { fm: -2 });
    expect(result.chars.find(c => c.id === 'fm')!.mood).toBe(0);
  });

  it('ändert auch Loyalty wenn angegeben', () => {
    const state = makeState({ chars: [makeChar({ id: 'fm', loyalty: 3 })] });
    const result = applyMoodChange(state, {}, { fm: -1 });
    expect(result.chars.find(c => c.id === 'fm')!.loyalty).toBe(2);
  });

  it('clampt Loyalty auf 0-5', () => {
    const state = makeState({ chars: [makeChar({ id: 'fm', loyalty: 5 })] });
    const result = applyMoodChange(state, {}, { fm: 2 });
    expect(result.chars.find(c => c.id === 'fm')!.loyalty).toBe(5);
  });
});

describe('updateCoalition', () => {
  it('berechnet Koalitionswert aus Mood und Loyalty', () => {
    const state = makeState({
      chars: [
        makeChar({ mood: 4, loyalty: 5 }),
        makeChar({ id: 'c2', mood: 4, loyalty: 5 }),
      ],
    });
    const result = updateCoalition(state);
    expect(result.coalition).toBe(100);
  });

  it('gibt 0 bei minimalen Werten', () => {
    const state = makeState({
      chars: [
        makeChar({ mood: 0, loyalty: 0 }),
      ],
    });
    const result = updateCoalition(state);
    expect(result.coalition).toBe(0);
  });

  it('clampt auf 0-100', () => {
    const state = makeState({
      chars: [makeChar({ mood: 2, loyalty: 3 })],
    });
    const result = updateCoalition(state);
    expect(result.coalition).toBeGreaterThanOrEqual(0);
    expect(result.coalition).toBeLessThanOrEqual(100);
  });
});

describe('checkUltimatums', () => {
  it('triggert Event wenn Mood <= Threshold (ab Monat 4)', () => {
    const chars = [makeChar({ id: 'fm', mood: 0, ultimatum: { moodThresh: 0, event: 'fm_ultimatum' } })];
    const event: GameEvent = {
      id: 'fm_ultimatum', type: 'danger', icon: '', typeLabel: '', title: '', quote: '', context: '',
      choices: [{ label: 'OK', desc: '', cost: 0, type: 'safe', effect: {}, log: '' }],
      ticker: '',
    };
    const state = makeState({
      chars,
      month: 4,
      activeEvent: null,
      firedCharEvents: [],
    });
    const result = checkUltimatums(state, { fm_ultimatum: event });
    expect(result.activeEvent).toBeTruthy();
    expect(result.activeEvent!.id).toBe('fm_ultimatum');
    expect(result.firedCharEvents).toContain('fm_ultimatum');
  });

  it('triggert nicht vor Monat 4 (SMA-321)', () => {
    const chars = [makeChar({ id: 'fm', mood: 0, ultimatum: { moodThresh: 0, event: 'fm_ultimatum' } })];
    const event: GameEvent = {
      id: 'fm_ultimatum', type: 'danger', icon: '', typeLabel: '', title: '', quote: '', context: '',
      choices: [{ label: 'OK', desc: '', cost: 0, type: 'safe', effect: {}, log: '' }],
      ticker: '',
    };
    const state = makeState({
      chars,
      month: 1,
      activeEvent: null,
      firedCharEvents: [],
    });
    const result = checkUltimatums(state, { fm_ultimatum: event });
    expect(result.activeEvent).toBeNull();
  });

  it('triggert nicht wenn bereits gefeuert', () => {
    const chars = [makeChar({ id: 'fm', mood: 0, ultimatum: { moodThresh: 0, event: 'fm_ultimatum' } })];
    const event: GameEvent = {
      id: 'fm_ultimatum', type: 'danger', icon: '', typeLabel: '', title: '', quote: '', context: '',
      choices: [{ label: 'OK', desc: '', cost: 0, type: 'safe', effect: {}, log: '' }],
      ticker: '',
    };
    const state = makeState({
      chars,
      month: 4,
      activeEvent: null,
      firedCharEvents: ['fm_ultimatum'],
    });
    const result = checkUltimatums(state, { fm_ultimatum: event });
    expect(result.activeEvent).toBeNull();
  });

  it('triggert nicht wenn bereits ein Event aktiv', () => {
    const chars = [makeChar({ id: 'fm', mood: 0, ultimatum: { moodThresh: 0, event: 'fm_ultimatum' } })];
    const event: GameEvent = {
      id: 'fm_ultimatum', type: 'danger', icon: '', typeLabel: '', title: '', quote: '', context: '',
      choices: [{ label: 'OK', desc: '', cost: 0, type: 'safe', effect: {}, log: '' }],
      ticker: '',
    };
    const existingEvent: GameEvent = { ...event, id: 'other' };
    const state = makeState({
      chars,
      month: 4,
      activeEvent: existingEvent,
      firedCharEvents: [],
    });
    const result = checkUltimatums(state, { fm_ultimatum: event });
    expect(result.activeEvent!.id).toBe('other');
  });

  it('triggert nicht wenn Mood > Threshold', () => {
    const chars = [makeChar({ id: 'fm', mood: 2, ultimatum: { moodThresh: 0, event: 'fm_ultimatum' } })];
    const event: GameEvent = {
      id: 'fm_ultimatum', type: 'danger', icon: '', typeLabel: '', title: '', quote: '', context: '',
      choices: [{ label: 'OK', desc: '', cost: 0, type: 'safe', effect: {}, log: '' }],
      ticker: '',
    };
    const state = makeState({
      chars,
      month: 4,
      activeEvent: null,
      firedCharEvents: [],
    });
    const result = checkUltimatums(state, { fm_ultimatum: event });
    expect(result.activeEvent).toBeNull();
  });
});

describe('applyCharBonuses', () => {
  it('Umweltminister mood >= 4: erhöht prog leicht', () => {
    const state = makeState({
      chars: [makeChar({ id: 'gp_um', ressort: 'umwelt', mood: 4 })],
      zust: { g: 50, arbeit: 50, mitte: 50, prog: 50 },
    });
    const result = applyCharBonuses(state);
    expect(result.zust.prog).toBeGreaterThan(50);
  });

  it('Finanzminister mood >= 4 und negatives hh: verbessert hh', () => {
    const state = makeState({
      chars: [makeChar({ id: 'cdp_fm', ressort: 'finanzen', mood: 4 })],
      kpi: { al: 5, hh: -1, gi: 30, zf: 60 },
    });
    const result = applyCharBonuses(state);
    expect(result.kpi.hh).toBeGreaterThan(-1);
  });

  it('Finanzminister Bonus nur bei negativem hh', () => {
    const state = makeState({
      chars: [makeChar({ id: 'cdp_fm', ressort: 'finanzen', mood: 4 })],
      kpi: { al: 5, hh: 0.5, gi: 30, zf: 60 },
    });
    const result = applyCharBonuses(state);
    expect(result.kpi.hh).toBe(0.5); // Kein Effekt
  });
});
