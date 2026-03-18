/**
 * SMA-330: Minister-Agenden Tests
 */

import { describe, it, expect } from 'vitest';
import {
  checkMinisterAgenden,
  resolveMinisterAgenda,
  checkProaktiveErfuellung,
} from './ministerAgenden';
import type { GameState, GameEvent } from '../types';

function createBaseState(overrides: Partial<GameState> = {}): GameState {
  return {
    month: 5,
    speed: 0,
    pk: 100,
    view: 'agenda',
    kpi: { al: 5, hh: 0, gi: 31, zf: 62 },
    kpiPrev: null,
    tickLog: [],
    zust: { g: 52, arbeit: 58, mitte: 54, prog: 44 },
    coalition: 60,
    chars: [
      {
        id: 'gp_um',
        name: 'Jonas Wolf',
        role: 'Umweltminister',
        initials: 'JW',
        color: '#46962B',
        mood: 3,
        loyalty: 3,
        bio: '',
        interests: ['klimaschutz'],
        bonus: { trigger: '', desc: '', applies: '' },
        ultimatum: { moodThresh: 1, event: '' },
        pool_partei: 'gp',
        ressort: 'umwelt',
      },
    ],
    gesetze: [
      {
        id: 'co2_steuer',
        titel: 'CO2-Steuer',
        kurz: 'CO2-Steuer',
        desc: '',
        tags: ['bund'],
        status: 'entwurf',
        ja: 50,
        nein: 50,
        effekte: {},
        lag: 4,
        expanded: false,
        route: null,
        rprog: 0,
        rdur: 0,
        blockiert: null,
      },
    ],
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
    ministerAgenden: {
      gp_um: { status: 'wartend', letzte_forderung_monat: 0, ablehnungen_count: 0 },
    },
    ...overrides,
  } as GameState;
}

describe('ministerAgenden', () => {
  it('triggert erste Forderung für Jonas Wolf ab Monat 4', () => {
    const state = createBaseState({ month: 4 });
    const result = checkMinisterAgenden(state, 2);
    expect(result.activeEvent).toBeTruthy();
    expect(result.activeEvent?.id).toContain('agenda_');
    expect(result.activeEvent?.charId).toBe('gp_um');
    expect(result.aktiveMinisterAgenda?.status).toBe('erste_forderung');
  });

  it('triggert nicht vor Monat 4', () => {
    const state = createBaseState({ month: 3 });
    const result = checkMinisterAgenden(state, 2);
    expect(result.activeEvent).toBeNull();
  });

  it('triggert nicht bei Stufe 1', () => {
    const state = createBaseState({ month: 5 });
    const result = checkMinisterAgenden(state, 1);
    expect(result.activeEvent).toBeNull();
  });

  it('Annahme erfüllt Agenda', () => {
    const state = createBaseState({
      activeEvent: { id: 'agenda_gp_um_erste_forderung', charId: 'gp_um', type: 'warn', icon: '', typeLabel: '', title: '', quote: '', context: '', ticker: '', choices: [] } as GameEvent,
      aktiveMinisterAgenda: { charId: 'gp_um', status: 'erste_forderung' },
    });
    const result = resolveMinisterAgenda(state, 'annehmen', {});
    expect(result.aktiveMinisterAgenda).toBeNull();
    expect(result.ministerAgenden?.gp_um?.status).toBe('erfuellt');
  });

  it('Ablehnung bei erste_forderung: Mood -1', () => {
    const state = createBaseState({
      activeEvent: { id: 'agenda_gp_um_erste_forderung', charId: 'gp_um', type: 'warn', icon: '', typeLabel: '', title: '', quote: '', context: '', ticker: '', choices: [] } as GameEvent,
      aktiveMinisterAgenda: { charId: 'gp_um', status: 'erste_forderung' },
    });
    const result = resolveMinisterAgenda(state, 'ablehnen', {});
    expect(result.chars.find(c => c.id === 'gp_um')?.mood).toBe(2);
    expect(result.ministerAgenden?.gp_um?.ablehnungen_count).toBe(1);
  });

  it('Proaktive Erfüllung bei Einbringen von co2_steuer', () => {
    const state = createBaseState({
      ministerAgenden: {
        gp_um: { status: 'wartend', letzte_forderung_monat: 0, ablehnungen_count: 0 },
      },
    });
    const result = checkProaktiveErfuellung(state, 'co2_steuer');
    expect(result.ministerAgenden?.gp_um?.status).toBe('erfuellt');
    expect(result.chars.find(c => c.id === 'gp_um')?.mood).toBe(4); // 3 + 2, clamped to 4
  });
});
