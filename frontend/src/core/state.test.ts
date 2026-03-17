import { describe, it, expect } from 'vitest';
import { validateGameState } from './state';

describe('validateGameState', () => {
  it('clampt wahlprognose auf 0–100', () => {
    const raw = {
      month: 1,
      speed: 0,
      pk: 100,
      view: 'agenda',
      kpi: { al: 50, hh: 50, gi: 50, zf: 50 },
      zust: { g: 52, arbeit: 58, mitte: 54, prog: 44 },
      coalition: 50,
      chars: [],
      gesetze: [],
      bundesrat: [],
      bundesratFraktionen: [],
      activeEvent: null,
      firedEvents: [],
      firedCharEvents: [],
      firedBundesratEvents: [],
      firedKommunalEvents: [],
      pending: [],
      log: [],
      ticker: '',
      gameOver: false,
      won: false,
      wahlprognose: 99.9,
    };
    const validated = validateGameState(raw);
    expect(validated.wahlprognose).toBe(99.9);
  });

  it('clampt manipulierte wahlprognose 999 auf 100', () => {
    const raw = {
      month: 1,
      speed: 0,
      pk: 100,
      view: 'agenda',
      kpi: { al: 50, hh: 50, gi: 50, zf: 50 },
      zust: { g: 52, arbeit: 58, mitte: 54, prog: 44 },
      coalition: 50,
      chars: [],
      gesetze: [],
      bundesrat: [],
      bundesratFraktionen: [],
      activeEvent: null,
      firedEvents: [],
      firedCharEvents: [],
      firedBundesratEvents: [],
      firedKommunalEvents: [],
      pending: [],
      log: [],
      ticker: '',
      gameOver: false,
      won: false,
      wahlprognose: 999,
    };
    const validated = validateGameState(raw);
    expect(validated.wahlprognose).toBe(100);
  });

  it('clampt zust.g auf 0–100', () => {
    const raw = {
      month: 1,
      speed: 0,
      pk: 100,
      view: 'agenda',
      kpi: { al: 50, hh: 50, gi: 50, zf: 50 },
      zust: { g: 999, arbeit: 58, mitte: 54, prog: 44 },
      coalition: 50,
      chars: [],
      gesetze: [],
      bundesrat: [],
      bundesratFraktionen: [],
      activeEvent: null,
      firedEvents: [],
      firedCharEvents: [],
      firedBundesratEvents: [],
      firedKommunalEvents: [],
      pending: [],
      log: [],
      ticker: '',
      gameOver: false,
      won: false,
    };
    const validated = validateGameState(raw);
    expect(validated.zust.g).toBe(100);
  });

  it('wirft bei ungültigem Input', () => {
    expect(() => validateGameState(null)).toThrow('Invalid GameState');
    expect(() => validateGameState('string')).toThrow('Invalid GameState');
    expect(() => validateGameState([])).toThrow('Invalid GameState');
  });
});
