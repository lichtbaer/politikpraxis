import { describe, it, expect } from 'vitest';
import {
  berechneKoalitionsvertragProfil,
  tickKoalitionspartner,
  checkKoalitionsbruch,
} from './koalition';
import { GRUENE } from '../../data/defaults/koalitionspartner';
import type { GameState } from '../types';

function createMockState(overrides: Partial<GameState> = {}): GameState {
  return {
    month: 1,
    speed: 0,
    pk: 100,
    view: 'agenda',
    kpi: { al: 5, hh: 0, gi: 50, zf: 50 },
    kpiPrev: null,
    zust: { g: 52, arbeit: 58, mitte: 54, prog: 44 },
    coalition: 70,
    chars: [],
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
    koalitionspartner: {
      id: 'gruene',
      beziehung: 50,
      koalitionsvertragScore: 60,
      schluesselthemenErfuellt: [],
    },
    ...overrides,
  } as GameState;
}

describe('berechneKoalitionsvertragProfil', () => {
  it('60/40 Gewichtung Spieler vs Partner', () => {
    const spieler = { wirtschaft: 30, gesellschaft: -60, staat: -20 };
    const partner = GRUENE;
    const result = berechneKoalitionsvertragProfil(spieler, partner);
    expect(result.wirtschaft).toBe(Math.round(30 * 0.6 + partner.ideologie.wirtschaft * 0.4));
    expect(result.gesellschaft).toBe(Math.round(-60 * 0.6 + partner.ideologie.gesellschaft * 0.4));
    expect(result.staat).toBe(Math.round(-20 * 0.6 + partner.ideologie.staat * 0.4));
  });
});

describe('tickKoalitionspartner', () => {
  it('KV-Score -2/Monat passiv (Stufe 4)', () => {
    const state = createMockState({
      koalitionspartner: {
        id: 'gruene',
        beziehung: 50,
        koalitionsvertragScore: 70,
        schluesselthemenErfuellt: [],
      },
    });
    const result = tickKoalitionspartner(state, { koalitionspartner: GRUENE }, 4);
    expect(result.koalitionspartner?.koalitionsvertragScore).toBe(68);
  });
});

describe('checkKoalitionsbruch', () => {
  it('triggert bei Beziehung < 15', () => {
    const state = createMockState({
      koalitionspartner: {
        id: 'gruene',
        beziehung: 10,
        koalitionsvertragScore: 50,
        schluesselthemenErfuellt: [],
      },
      koalitionsbruchSeitMonat: undefined,
      activeEvent: null,
    });
    const result = checkKoalitionsbruch(state, {
      charEvents: {
        koalitionsbruch: {
          id: 'koalitionsbruch',
          type: 'danger',
          icon: '🔴',
          typeLabel: 'Krise',
          title: 'Koalitionsbruch',
          quote: '',
          context: '',
          ticker: '',
          choices: [],
        },
      },
    }, 4);
    expect(result.koalitionsbruchSeitMonat).toBe(state.month);
    expect(result.activeEvent?.id).toBe('koalitionsbruch');
  });

  it('triggert nicht bei Beziehung >= 15', () => {
    const state = createMockState({
      koalitionspartner: {
        id: 'gruene',
        beziehung: 20,
        koalitionsvertragScore: 50,
        schluesselthemenErfuellt: [],
      },
    });
    const result = checkKoalitionsbruch(state, {}, 4);
    expect(result).toBe(state);
  });
});
