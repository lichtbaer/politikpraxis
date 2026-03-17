import { describe, it, expect } from 'vitest';
import { checkPolitikfeldDruck, setPolitikfeldBeschluss } from './politikfeldDruck';
import { createInitialState } from '../state';
import { DEFAULT_CONTENT } from '../../data/defaults/scenarios';
import type { GameState, GameEvent } from '../types';

function makeState(overrides: Partial<GameState> = {}): GameState {
  const base = createInitialState(DEFAULT_CONTENT, 4);
  return { ...base, month: 10, ...overrides };
}

const POLITIKFELDER = [
  { id: 'umwelt_energie', verbandId: 'uvb', druckEventId: 'druck_umwelt' },
  { id: 'wirtschaft_finanzen', verbandId: 'bdi', druckEventId: null },
];

describe('checkPolitikfeldDruck', () => {
  it('erhöht Druck um 3 pro Monat ohne Beschluss', () => {
    const state = makeState({
      politikfeldDruck: { umwelt_energie: 20 },
      politikfeldLetzterBeschluss: { umwelt_energie: 0 },
    });
    const result = checkPolitikfeldDruck(state, POLITIKFELDER, 4);
    expect(result.politikfeldDruck!['umwelt_energie']).toBe(23); // 20 + 3
  });

  it('clampt Druck auf max 100', () => {
    const state = makeState({
      politikfeldDruck: { umwelt_energie: 99 },
      politikfeldLetzterBeschluss: { umwelt_energie: 0 },
    });
    const result = checkPolitikfeldDruck(state, POLITIKFELDER, 4);
    expect(result.politikfeldDruck!['umwelt_energie']).toBeLessThanOrEqual(100);
  });

  it('senkt Verbands-Beziehung bei Druck > 50', () => {
    const state = makeState({
      politikfeldDruck: { umwelt_energie: 51 },
      politikfeldLetzterBeschluss: { umwelt_energie: 0 },
      verbandsBeziehungen: { uvb: 50 },
    });
    // Druck wird 54 (51+3), im Bereich 50-53 bevor +3: nein
    // Aber der Druck nach +3 = 54. Der Check ist druck > 50 && druck <= 53
    // Initial 51, nach +3 = 54. Bei druck(54) > 50 && 54 <= 53 ist false
    // Nur bei druck 51 < 53 < 54... let me check: druck = politikfeldDruck[feld.id] ?? 0 AFTER adding
    const result = checkPolitikfeldDruck(state, POLITIKFELDER, 4);
    // druck after: 54; 54 > 50 && 54 <= 53 → false → no decrease
    expect(result.verbandsBeziehungen!['uvb']).toBe(50);
  });

  it('senkt Verbands-Beziehung genau bei Druck 51-53 nach Addition', () => {
    const state = makeState({
      politikfeldDruck: { umwelt_energie: 48 },
      politikfeldLetzterBeschluss: { umwelt_energie: 0 },
      verbandsBeziehungen: { uvb: 50 },
    });
    // 48 + 3 = 51 → druck > 50 && druck <= 53 → true
    const result = checkPolitikfeldDruck(state, POLITIKFELDER, 4);
    expect(result.verbandsBeziehungen!['uvb']).toBe(45); // 50 - 5
  });

  it('triggert Druck-Event bei Druck > 70', () => {
    const event: GameEvent = {
      id: 'druck_umwelt', type: 'warn', icon: '', typeLabel: '', title: '', quote: '', context: '',
      choices: [{ label: 'OK', desc: '', cost: 0, type: 'safe', effect: {}, log: '' }],
      ticker: '',
    };
    const state = makeState({
      politikfeldDruck: { umwelt_energie: 69 },
      politikfeldLetzterBeschluss: { umwelt_energie: 0 },
      firedEvents: [],
      activeEvent: null,
    });
    // 69 + 3 = 72 > 70 → trigger event
    const result = checkPolitikfeldDruck(state, POLITIKFELDER, 4, [event]);
    expect(result.activeEvent).toBeTruthy();
    expect(result.activeEvent!.id).toBe('druck_umwelt');
    expect(result.firedEvents).toContain('druck_umwelt_energie');
  });

  it('triggert Event nicht erneut wenn bereits gefeuert', () => {
    const event: GameEvent = {
      id: 'druck_umwelt', type: 'warn', icon: '', typeLabel: '', title: '', quote: '', context: '',
      choices: [{ label: 'OK', desc: '', cost: 0, type: 'safe', effect: {}, log: '' }],
      ticker: '',
    };
    const state = makeState({
      politikfeldDruck: { umwelt_energie: 75 },
      politikfeldLetzterBeschluss: { umwelt_energie: 0 },
      firedEvents: ['druck_umwelt_energie'],
      activeEvent: null,
    });
    const result = checkPolitikfeldDruck(state, POLITIKFELDER, 4, [event]);
    expect(result.activeEvent).toBeNull();
  });

  it('gibt State zurück wenn Feature nicht aktiv', () => {
    const state = makeState();
    const result = checkPolitikfeldDruck(state, POLITIKFELDER, 1);
    expect(result).toBe(state);
  });

  it('gibt State zurück wenn keine Politikfelder', () => {
    const state = makeState();
    const result = checkPolitikfeldDruck(state, [], 4);
    expect(result).toBe(state);
  });

  it('gibt State zurück wenn activeEvent bereits existiert', () => {
    const existingEvent: GameEvent = {
      id: 'other', type: 'info', icon: '', typeLabel: '', title: '', quote: '', context: '',
      choices: [{ label: 'OK', desc: '', cost: 0, type: 'safe', effect: {}, log: '' }],
      ticker: '',
    };
    const state = makeState({
      activeEvent: existingEvent,
      politikfeldDruck: { umwelt_energie: 80 },
    });
    const result = checkPolitikfeldDruck(state, POLITIKFELDER, 4);
    expect(result).toBe(state);
  });
});

describe('setPolitikfeldBeschluss', () => {
  it('setzt politikfeldLetzterBeschluss auf aktuellen Monat', () => {
    const state = makeState({ month: 15 });
    const result = setPolitikfeldBeschluss(state, 'umwelt_energie');
    expect(result.politikfeldLetzterBeschluss!['umwelt_energie']).toBe(15);
  });

  it('überschreibt vorherigen Beschluss', () => {
    const state = makeState({
      month: 20,
      politikfeldLetzterBeschluss: { umwelt_energie: 5 },
    });
    const result = setPolitikfeldBeschluss(state, 'umwelt_energie');
    expect(result.politikfeldLetzterBeschluss!['umwelt_energie']).toBe(20);
  });
});
