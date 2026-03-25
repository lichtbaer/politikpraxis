/**
 * Zentrale Test-Factories für Core-Tests.
 * Reduziert Duplizierung von makeState/makeChar/makeLaw in 15+ Testdateien.
 */
import { createInitialState } from './state';
import { DEFAULT_CONTENT } from '../data/defaults/scenarios';
import type { GameState, Character, Law, BundesratFraktion, GameEvent, EventChoice } from './types';

/** Erstellt einen vollständigen GameState mit optionalen Overrides. */
export function makeState(overrides: Partial<GameState> = {}): GameState {
  const base = createInitialState(DEFAULT_CONTENT, 4);
  return { ...base, ...overrides };
}

/** Erstellt einen minimalen Character mit optionalen Overrides. */
export function makeChar(overrides: Partial<Character> = {}): Character {
  return {
    id: 'test_char',
    name: 'Test Minister',
    role: 'Minister',
    initials: 'TM',
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

/** Erstellt ein minimales Gesetz mit optionalen Overrides. */
export function makeLaw(overrides: Partial<Law> = {}): Law {
  return {
    id: 'test_law',
    titel: 'Testgesetz',
    kurz: 'Test',
    desc: 'Ein Testgesetz',
    tags: ['bund'],
    ja: 55,
    nein: 45,
    effekte: {},
    lag: 3,
    status: 'entwurf',
    expanded: false,
    route: null,
    rprog: 0,
    rdur: 0,
    blockiert: null,
    ...overrides,
  };
}

/** Erstellt eine minimale BundesratFraktion mit optionalen Overrides. */
export function makeFraktion(overrides: Partial<BundesratFraktion> = {}): BundesratFraktion {
  return {
    id: 'test_fraktion',
    name: 'Testfraktion',
    sprecher: { name: 'Sprecher', partei: 'P', land: 'NW', initials: 'SP', color: '#000', bio: 'bio' },
    laender: ['NW'],
    basisBereitschaft: 45,
    beziehung: 50,
    tradeoffPool: [],
    ...overrides,
  };
}

/** Erstellt ein minimales GameEvent mit optionalen Overrides. */
export function makeEvent(overrides: Partial<GameEvent> = {}): GameEvent {
  return {
    id: 'test_event',
    type: 'info',
    icon: '📋',
    typeLabel: 'Test',
    title: 'Test Event',
    quote: 'Test quote',
    context: 'Test context',
    ticker: 'Test ticker',
    choices: [],
    ...overrides,
  };
}

/** Erstellt eine minimale EventChoice mit optionalen Overrides. */
export function makeChoice(overrides: Partial<EventChoice> = {}): EventChoice {
  return {
    label: 'Test Choice',
    desc: 'Test',
    type: 'primary',
    cost: 0,
    ...overrides,
  };
}
