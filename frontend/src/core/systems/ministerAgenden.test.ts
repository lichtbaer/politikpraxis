/**
 * SMA-330: Minister-Agenden Tests
 */

import { describe, it, expect } from 'vitest';
import {
  checkMinisterAgenden,
  resolveMinisterAgenda,
  checkProaktiveErfuellung,
  AGENDA_EVENT_PREFIX,
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

function createAgendaEvent(charId: string, status: string): GameEvent {
  return {
    id: `agenda_${charId}_${status}`,
    charId,
    type: 'warn',
    icon: '',
    typeLabel: '',
    title: '',
    quote: '',
    context: '',
    ticker: '',
    choices: [],
  } as GameEvent;
}

describe('AGENDA_EVENT_PREFIX', () => {
  it('equals "agenda_"', () => {
    expect(AGENDA_EVENT_PREFIX).toBe('agenda_');
  });
});

describe('checkMinisterAgenden', () => {
  it('returns state unchanged when complexity is too low (feature char_ultimatums inactive)', () => {
    const state = createBaseState({ month: 5 });
    const result = checkMinisterAgenden(state, 1);
    expect(result).toBe(state);
    expect(result.activeEvent).toBeNull();
  });

  it('returns state unchanged when activeEvent exists', () => {
    const existingEvent = createAgendaEvent('some_char', 'some_status');
    const state = createBaseState({ month: 5, activeEvent: existingEvent });
    const result = checkMinisterAgenden(state, 2);
    expect(result).toBe(state);
  });

  it('returns state unchanged when aktiveMinisterAgenda exists', () => {
    const state = createBaseState({
      month: 5,
      aktiveMinisterAgenda: { charId: 'gp_um', status: 'erste_forderung' },
    });
    const result = checkMinisterAgenden(state, 2);
    expect(result).toBe(state);
  });

  it('triggers erste Forderung for Jonas Wolf at month 4', () => {
    const state = createBaseState({ month: 4 });
    const result = checkMinisterAgenden(state, 2);
    expect(result.activeEvent).toBeTruthy();
    expect(result.activeEvent?.id).toContain('agenda_');
    expect(result.activeEvent?.charId).toBe('gp_um');
    expect(result.aktiveMinisterAgenda?.status).toBe('erste_forderung');
  });

  it('does not trigger before trigger_monat', () => {
    const state = createBaseState({ month: 3 });
    const result = checkMinisterAgenden(state, 2);
    expect(result.activeEvent).toBeNull();
  });

  it('skips chars with status erfuellt', () => {
    const state = createBaseState({
      month: 10,
      ministerAgenden: {
        gp_um: { status: 'erfuellt', letzte_forderung_monat: 4, ablehnungen_count: 0 },
      },
    });
    const result = checkMinisterAgenden(state, 2);
    expect(result.activeEvent).toBeNull();
  });

  it('skips chars with status aufgegeben', () => {
    const state = createBaseState({
      month: 10,
      ministerAgenden: {
        gp_um: { status: 'aufgegeben', letzte_forderung_monat: 8, ablehnungen_count: 3 },
      },
    });
    const result = checkMinisterAgenden(state, 2);
    expect(result.activeEvent).toBeNull();
  });

  it('triggers wiederholung after interval and previous rejection', () => {
    const state = createBaseState({
      month: 10,
      ministerAgenden: {
        gp_um: { status: 'erste_forderung', letzte_forderung_monat: 4, ablehnungen_count: 1 },
      },
    });
    const result = checkMinisterAgenden(state, 2);
    expect(result.aktiveMinisterAgenda?.status).toBe('wiederholung');
  });

  it('triggers ultimatum when max_ablehnungen reached', () => {
    const state = createBaseState({
      month: 16,
      ministerAgenden: {
        gp_um: { status: 'wiederholung', letzte_forderung_monat: 10, ablehnungen_count: 2 },
      },
    });
    const result = checkMinisterAgenden(state, 2);
    expect(result.aktiveMinisterAgenda?.status).toBe('ultimatum');
  });

  it('does not trigger before wiederholung_intervall elapsed', () => {
    const state = createBaseState({
      month: 8, // interval is 6, last at 4, so next at 10
      ministerAgenden: {
        gp_um: { status: 'erste_forderung', letzte_forderung_monat: 4, ablehnungen_count: 1 },
      },
    });
    const result = checkMinisterAgenden(state, 2);
    expect(result.activeEvent).toBeNull();
  });
});

describe('resolveMinisterAgenda', () => {
  it('returns state unchanged when no aktiveMinisterAgenda', () => {
    const state = createBaseState({ aktiveMinisterAgenda: null });
    const result = resolveMinisterAgenda(state, 'annehmen', {});
    expect(result).toBe(state);
  });

  it('annehmen sets status to erfuellt and clears aktiveMinisterAgenda', () => {
    const state = createBaseState({
      activeEvent: createAgendaEvent('gp_um', 'erste_forderung'),
      aktiveMinisterAgenda: { charId: 'gp_um', status: 'erste_forderung' },
    });
    const result = resolveMinisterAgenda(state, 'annehmen', {});
    expect(result.aktiveMinisterAgenda).toBeNull();
    expect(result.activeEvent).toBeNull();
    expect(result.ministerAgenden?.gp_um?.status).toBe('erfuellt');
  });

  it('ablehnen on erste_forderung reduces mood by 1', () => {
    const state = createBaseState({
      activeEvent: createAgendaEvent('gp_um', 'erste_forderung'),
      aktiveMinisterAgenda: { charId: 'gp_um', status: 'erste_forderung' },
    });
    const result = resolveMinisterAgenda(state, 'ablehnen', {});
    const char = result.chars.find(c => c.id === 'gp_um');
    expect(char?.mood).toBe(2); // 3 - 1
    expect(result.ministerAgenden?.gp_um?.ablehnungen_count).toBe(1);
    expect(result.aktiveMinisterAgenda).toBeNull();
    expect(result.activeEvent).toBeNull();
  });

  it('ablehnen on wiederholung reduces mood by 2 and coalition by 5', () => {
    const state = createBaseState({
      activeEvent: createAgendaEvent('gp_um', 'wiederholung'),
      aktiveMinisterAgenda: { charId: 'gp_um', status: 'wiederholung' },
      koalitionspartner: { id: 'gp', beziehung: 50, koalitionsvertragScore: 50, schluesselthemenErfuellt: [] },
      ministerAgenden: {
        gp_um: { status: 'wiederholung', letzte_forderung_monat: 4, ablehnungen_count: 1 },
      },
    });
    const result = resolveMinisterAgenda(state, 'ablehnen', {});
    const char = result.chars.find(c => c.id === 'gp_um');
    expect(char?.mood).toBe(1); // 3 - 2
    expect(result.coalition).toBe(55); // 60 - 5
    expect(result.ministerAgenden?.gp_um?.ablehnungen_count).toBe(2);
    expect(result.aktiveMinisterAgenda).toBeNull();
  });

  it('ablehnen on ultimatum triggers Koalitionskrise with medienKlima -5 and coalition -10', () => {
    const state = createBaseState({
      activeEvent: createAgendaEvent('gp_um', 'ultimatum'),
      aktiveMinisterAgenda: { charId: 'gp_um', status: 'ultimatum' },
      koalitionspartner: { id: 'gp', beziehung: 50, koalitionsvertragScore: 50, schluesselthemenErfuellt: [] },
      medienKlima: 55,
      ministerAgenden: {
        gp_um: { status: 'ultimatum', letzte_forderung_monat: 10, ablehnungen_count: 2 },
      },
    });
    const result = resolveMinisterAgenda(state, 'ablehnen', {});
    expect(result.medienKlima).toBe(50); // 55 - 5
    expect(result.coalition).toBe(50); // 60 - 10
    expect(result.ministerAgenden?.gp_um?.status).toBe('aufgegeben');
    expect(result.aktiveMinisterAgenda).toBeNull();
  });

  it('ablehnen on erste_forderung does not reduce mood below 0', () => {
    const state = createBaseState({
      activeEvent: createAgendaEvent('gp_um', 'erste_forderung'),
      aktiveMinisterAgenda: { charId: 'gp_um', status: 'erste_forderung' },
      chars: [
        {
          id: 'gp_um',
          name: 'Jonas Wolf',
          role: 'Umweltminister',
          initials: 'JW',
          color: '#46962B',
          mood: 0,
          loyalty: 3,
          bio: '',
          interests: ['klimaschutz'],
          bonus: { trigger: '', desc: '', applies: '' },
          ultimatum: { moodThresh: 1, event: '' },
          pool_partei: 'gp',
          ressort: 'umwelt',
        },
      ],
    });
    const result = resolveMinisterAgenda(state, 'ablehnen', {});
    expect(result.chars.find(c => c.id === 'gp_um')?.mood).toBe(0);
  });
});

describe('checkProaktiveErfuellung', () => {
  it('returns state unchanged for unrelated gesetz', () => {
    const state = createBaseState();
    const result = checkProaktiveErfuellung(state, 'some_other_gesetz');
    expect(result).toBe(state);
  });

  it('fulfills agenda and increases mood by 2 when matching gesetz is passed', () => {
    const state = createBaseState({
      ministerAgenden: {
        gp_um: { status: 'wartend', letzte_forderung_monat: 0, ablehnungen_count: 0 },
      },
    });
    const result = checkProaktiveErfuellung(state, 'co2_steuer');
    expect(result.ministerAgenden?.gp_um?.status).toBe('erfuellt');
    expect(result.chars.find(c => c.id === 'gp_um')?.mood).toBe(4); // min(4, 3+2)
  });

  it('does not re-fulfill already erfuellt agenda', () => {
    const state = createBaseState({
      ministerAgenden: {
        gp_um: { status: 'erfuellt', letzte_forderung_monat: 4, ablehnungen_count: 0 },
      },
    });
    const result = checkProaktiveErfuellung(state, 'co2_steuer');
    expect(result.chars.find(c => c.id === 'gp_um')?.mood).toBe(3); // unchanged
  });

  it('does not fulfill aufgegeben agenda', () => {
    const state = createBaseState({
      ministerAgenden: {
        gp_um: { status: 'aufgegeben', letzte_forderung_monat: 10, ablehnungen_count: 3 },
      },
    });
    const result = checkProaktiveErfuellung(state, 'co2_steuer');
    expect(result.chars.find(c => c.id === 'gp_um')?.mood).toBe(3); // unchanged
  });

  it('returns state unchanged when no ministerAgenden entry exists for the char', () => {
    const state = createBaseState({
      ministerAgenden: {},
    });
    const result = checkProaktiveErfuellung(state, 'co2_steuer');
    // No agenda entry for gp_um, so nothing to fulfill
    expect(result).toBe(state);
  });
});
