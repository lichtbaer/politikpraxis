import { describe, it, expect } from 'vitest';
import {
  kannRegierungserklaerung,
  regierungserklaerung,
  kannVertrauensfrage,
  vertrauensfrage,
} from './regierung';
import type { GameState } from '../types';

function createMockState(overrides: Partial<GameState> = {}): GameState {
  return {
    month: 12,
    speed: 1,
    pk: 100,
    view: 'agenda',
    kpi: { al: 5, hh: 0, gi: 30, zf: 50 },
    kpiPrev: null,
    zust: { g: 52, arbeit: 58, mitte: 54, prog: 44 },
    coalition: 70,
    chars: [
      { id: 'c1', name: 'A', role: 'Finanzen', initials: 'A', color: '#000', mood: 3, loyalty: 3, bio: '', interests: [], bonus: { trigger: '', desc: '', applies: '' }, ultimatum: { moodThresh: 0, event: '' } },
      { id: 'c2', name: 'B', role: 'Wirtschaft', initials: 'B', color: '#000', mood: 2, loyalty: 3, bio: '', interests: [], bonus: { trigger: '', desc: '', applies: '' }, ultimatum: { moodThresh: 0, event: '' } },
    ],
    gesetze: [],
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
    tickLog: [],
    koalitionspartner: { id: 'gp', beziehung: 60, koalitionsvertragScore: 0, schluesselthemenErfuellt: [] },
    ...overrides,
  };
}

describe('kannRegierungserklaerung', () => {
  it('erlaubt bei genug PK und keinem Cooldown', () => {
    expect(kannRegierungserklaerung(createMockState(), 2)).toBe(true);
  });

  it('verweigert bei zu niedriger Komplexität', () => {
    expect(kannRegierungserklaerung(createMockState(), 1)).toBe(false);
  });

  it('verweigert bei zu wenig PK', () => {
    expect(kannRegierungserklaerung(createMockState({ pk: 10 }), 2)).toBe(false);
  });

  it('verweigert innerhalb des Cooldowns', () => {
    const state = createMockState({ letzteRegierungserklaerungMonat: 5, month: 12 });
    expect(kannRegierungserklaerung(state, 2)).toBe(false);
  });

  it('erlaubt nach Cooldown', () => {
    const state = createMockState({ letzteRegierungserklaerungMonat: 1, month: 14 });
    expect(kannRegierungserklaerung(state, 2)).toBe(true);
  });
});

describe('regierungserklaerung', () => {
  it('erhöht Zustimmung bei hohem Medienklima', () => {
    const state = createMockState({ medienKlima: 70 });
    const result = regierungserklaerung(state, 2);

    expect(result.pk).toBe(70); // 100 - 30
    expect(result.zust.g).toBeGreaterThan(state.zust.g);
    expect(result.letzteRegierungserklaerungMonat).toBe(12);
  });

  it('senkt Zustimmung bei niedrigem Medienklima', () => {
    const state = createMockState({ medienKlima: 20 });
    const result = regierungserklaerung(state, 2);

    expect(result.pk).toBe(70);
    expect(result.zust.g).toBeLessThan(state.zust.g);
  });

  it('ändert nichts wenn nicht möglich', () => {
    const state = createMockState({ pk: 5 });
    expect(regierungserklaerung(state, 2)).toBe(state);
  });
});

describe('kannVertrauensfrage', () => {
  it('erlaubt bei Stufe 3+ mit Koalitionspartner', () => {
    expect(kannVertrauensfrage(createMockState(), 3)).toBe(true);
  });

  it('verweigert bei Stufe 2', () => {
    expect(kannVertrauensfrage(createMockState(), 2)).toBe(false);
  });

  it('verweigert wenn bereits gestellt', () => {
    const state = createMockState({ vertrauensfrageGestellt: true });
    expect(kannVertrauensfrage(state, 3)).toBe(false);
  });

  it('verweigert ohne Koalitionspartner', () => {
    const state = createMockState({ koalitionspartner: undefined });
    expect(kannVertrauensfrage(state, 3)).toBe(false);
  });

  it('verweigert bei zu wenig PK', () => {
    const state = createMockState({ pk: 20 });
    expect(kannVertrauensfrage(state, 3)).toBe(false);
  });
});

describe('vertrauensfrage', () => {
  it('gewinnt bei hoher Koalitionsstabilität', () => {
    const state = createMockState({ coalition: 60 });
    const result = vertrauensfrage(state, 3);

    expect(result.pk).toBe(60); // 100 - 40
    expect(result.vertrauensfrageGestellt).toBe(true);
    expect(result.gameOver).toBe(false);
    expect(result.koalitionspartner!.beziehung).toBe(85); // 60 + 25
    // Chars mit mood < 4 bekommen +1
    expect(result.chars.find(c => c.id === 'c2')!.mood).toBe(3); // 2 + 1
  });

  it('verliert bei niedriger Koalitionsstabilität → Game Over', () => {
    const state = createMockState({ coalition: 30 });
    const result = vertrauensfrage(state, 3);

    expect(result.vertrauensfrageGestellt).toBe(true);
    expect(result.gameOver).toBe(true);
    expect(result.won).toBe(false);
  });

  it('ändert nichts wenn nicht möglich', () => {
    const state = createMockState({ vertrauensfrageGestellt: true });
    expect(vertrauensfrage(state, 3)).toBe(state);
  });
});
