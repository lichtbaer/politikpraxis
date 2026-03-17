import { describe, it, expect, vi } from 'vitest';
import {
  checkRandomEvents,
  checkBundesratEvents,
  checkKommunalLaenderEvents,
  checkKommunalEvents,
  resolveEvent,
} from './events';
import { createInitialState } from '../state';
import { DEFAULT_CONTENT } from '../../data/defaults/scenarios';
import type { GameState, GameEvent, EventChoice } from '../types';

function makeState(overrides: Partial<GameState> = {}): GameState {
  const base = createInitialState(DEFAULT_CONTENT, 4);
  return { ...base, month: 10, activeEvent: null, firedEvents: [], ...overrides };
}

function makeEvent(overrides: Partial<GameEvent> = {}): GameEvent {
  return {
    id: 'test_event',
    type: 'info',
    icon: '',
    typeLabel: '',
    title: 'Test',
    quote: '',
    context: '',
    choices: [{ label: 'OK', desc: '', cost: 5, type: 'safe', effect: { zf: 2 }, log: 'log', key: 'ok' }],
    ticker: 'Test Ticker',
    ...overrides,
  };
}

describe('checkRandomEvents (extended)', () => {
  it('triggert Event bei random < 0.22', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1); // < 0.22
    const event = makeEvent({ id: 'random_ev' });
    const state = makeState();
    const result = checkRandomEvents(state, [event]);
    expect(result.activeEvent).toBeTruthy();
    expect(result.activeEvent!.id).toBe('random_ev');
    expect(result.firedEvents).toContain('random_ev');
    vi.restoreAllMocks();
  });

  it('triggert kein Event bei random >= 0.22', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const event = makeEvent();
    const state = makeState();
    const result = checkRandomEvents(state, [event]);
    expect(result.activeEvent).toBeNull();
    vi.restoreAllMocks();
  });

  it('triggert nicht wenn Event bereits gefeuert', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const event = makeEvent({ id: 'already_fired' });
    const state = makeState({ firedEvents: ['already_fired'] });
    const result = checkRandomEvents(state, [event]);
    expect(result.activeEvent).toBeNull();
    vi.restoreAllMocks();
  });

  it('triggert nicht wenn activeEvent vorhanden', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const event = makeEvent();
    const existing = makeEvent({ id: 'existing' });
    const state = makeState({ activeEvent: existing });
    const result = checkRandomEvents(state, [event]);
    expect(result.activeEvent!.id).toBe('existing');
    vi.restoreAllMocks();
  });

  it('triggert nicht bei leerer Event-Liste', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const state = makeState();
    const result = checkRandomEvents(state, []);
    expect(result.activeEvent).toBeNull();
    vi.restoreAllMocks();
  });

  it('filtert Wahlkampf-Events', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const wahlkampfEvents = [
      makeEvent({ id: 'wahlkampf_beginn' }),
      makeEvent({ id: 'tv_duell' }),
      makeEvent({ id: 'koalitionspartner_alleingang' }),
    ];
    const state = makeState();
    const result = checkRandomEvents(state, wahlkampfEvents);
    expect(result.activeEvent).toBeNull();
    vi.restoreAllMocks();
  });
});

describe('checkBundesratEvents', () => {
  const brEvents = [
    makeEvent({ id: 'laenderfinanzausgleich' }),
    makeEvent({ id: 'foederalismusgipfel' }),
    makeEvent({ id: 'kohl_eskaliert' }),
  ];

  it('triggert Länderfinanzausgleich bei Monat 12', () => {
    const state = makeState({ month: 12, firedBundesratEvents: [] });
    const result = checkBundesratEvents(state, {
      bundesratEvents: brEvents,
      sprecherErsatz: {},
      landtagswahlTransitions: [],
    });
    expect(result.activeEvent).toBeTruthy();
    expect(result.activeEvent!.id).toBe('laenderfinanzausgleich');
  });

  it('triggert Föderalismusgipfel bei Monat 18', () => {
    const state = makeState({ month: 18, firedBundesratEvents: [] });
    const result = checkBundesratEvents(state, {
      bundesratEvents: brEvents,
      sprecherErsatz: {},
      landtagswahlTransitions: [],
    });
    // Monat 18 ist sowohl 12er als auch 18er Vielfaches; Länderfinanzausgleich hat Priorität
    expect(result.activeEvent).toBeTruthy();
  });

  it('triggert Kohl-Eskalation bei Ostblock Beziehung < 15', () => {
    const state = makeState({
      month: 20,
      firedBundesratEvents: [],
      bundesratFraktionen: [
        {
          id: 'ostblock', name: 'Ostblock',
          sprecher: { name: 'Kohl', partei: 'P', land: 'SN', initials: 'K', color: '#000', bio: '' },
          laender: ['SN', 'TH'], basisBereitschaft: 30, beziehung: 10,
          tradeoffPool: [], sonderregel: 'kohl_saboteur',
        },
      ],
      gesetze: [{
        id: 'law1', titel: 'L', kurz: 'L', desc: '', tags: ['land' as const], status: 'bt_passed' as const,
        ja: 50, nein: 50, effekte: {}, lag: 3, expanded: false, route: null, rprog: 0, rdur: 0,
        blockiert: null, kohlSabotageTriggered: false,
      }],
    });
    const result = checkBundesratEvents(state, {
      bundesratEvents: brEvents,
      sprecherErsatz: {},
      landtagswahlTransitions: [],
    });
    expect(result.activeEvent).toBeTruthy();
    expect(result.activeEvent!.id).toBe('kohl_eskaliert');
  });

  it('triggert nicht wenn activeEvent vorhanden', () => {
    const existing = makeEvent({ id: 'existing' });
    const state = makeState({ month: 12, activeEvent: existing });
    const result = checkBundesratEvents(state, {
      bundesratEvents: brEvents,
      sprecherErsatz: {},
      landtagswahlTransitions: [],
    });
    expect(result.activeEvent!.id).toBe('existing');
  });
});

describe('checkKommunalLaenderEvents', () => {
  it('triggert Haushaltskrise bei Saldo < -20', () => {
    const event = makeEvent({ id: 'kommunal_haushaltskrise' });
    const state = makeState({
      month: 15,
      haushalt: {
        einnahmen: 350, pflichtausgaben: 370, laufendeAusgaben: 0, spielraum: -20,
        saldo: -25, saldoKumulativ: -25, konjunkturIndex: 100,
        steuerpolitikModifikator: 0, investitionsquote: 0,
        schuldenbremseAktiv: false, haushaltsplanMonat: 0,
        haushaltsplanBeschlossen: false, planPrioritaeten: [],
      },
    });
    const result = checkKommunalLaenderEvents(state, [event], 4);
    expect(result.activeEvent).toBeTruthy();
    expect(result.activeEvent!.id).toBe('kommunal_haushaltskrise');
  });

  it('triggert Bürgerprotest bei Umwelt-Druck > 70', () => {
    const event = makeEvent({ id: 'kommunal_buergerprotest' });
    const state = makeState({
      politikfeldDruck: { umwelt_energie: 75 },
    });
    const result = checkKommunalLaenderEvents(state, [event], 4);
    expect(result.activeEvent).toBeTruthy();
    expect(result.activeEvent!.id).toBe('kommunal_buergerprotest');
  });

  it('triggert Länder-Koalitionskrise bei min BR-Beziehung < 30', () => {
    const event = makeEvent({ id: 'laender_koalitionskrise' });
    const state = makeState({
      bundesratFraktionen: [
        {
          id: 'f1', name: 'F1',
          sprecher: { name: '', partei: '', land: '', initials: '', color: '', bio: '' },
          laender: ['NW'], basisBereitschaft: 50, beziehung: 25, tradeoffPool: [],
        },
      ],
    });
    const result = checkKommunalLaenderEvents(state, [event], 4);
    expect(result.activeEvent).toBeTruthy();
    expect(result.activeEvent!.id).toBe('laender_koalitionskrise');
  });

  it('triggert nicht bei bereits gefeuerten Events', () => {
    const event = makeEvent({ id: 'kommunal_buergerprotest' });
    const state = makeState({
      politikfeldDruck: { umwelt_energie: 75 },
      firedEvents: ['kommunal_buergerprotest'],
    });
    const result = checkKommunalLaenderEvents(state, [event], 4);
    expect(result.activeEvent).toBeNull();
  });
});

describe('resolveEvent', () => {
  it('wendet Choice-Effekte auf KPI an', () => {
    const event = makeEvent({ id: 'generic_event' });
    const choice: EventChoice = { label: 'OK', desc: '', cost: 5, type: 'safe', effect: { zf: 3 }, log: 'did thing' };
    const state = makeState({ pk: 50, kpi: { al: 5, hh: 0.3, gi: 31, zf: 60 } });
    const result = resolveEvent(state, event, choice);
    expect(result.pk).toBe(45);
    expect(result.kpi.zf).toBe(63);
    expect(result.activeEvent).toBeNull();
  });

  it('gibt State zurück bei zu wenig PK', () => {
    const event = makeEvent({ id: 'generic_event' });
    const choice: EventChoice = { label: 'OK', desc: '', cost: 100, type: 'safe', effect: {}, log: '' };
    const state = makeState({ pk: 5 });
    const result = resolveEvent(state, event, choice);
    expect(result).toBe(state);
  });

  it('clampt zf auf max 100', () => {
    const event = makeEvent({ id: 'generic_event' });
    const choice: EventChoice = { label: 'OK', desc: '', cost: 0, type: 'safe', effect: { zf: 50 }, log: 'log' };
    const state = makeState({ kpi: { al: 5, hh: 0.3, gi: 31, zf: 90 } });
    const result = resolveEvent(state, event, choice);
    expect(result.kpi.zf).toBeLessThanOrEqual(100);
  });

  it('wendet charMood an', () => {
    const event = makeEvent({ id: 'generic_event' });
    const choice: EventChoice = { label: 'OK', desc: '', cost: 0, type: 'safe', effect: {}, log: 'log', charMood: { fm: -1 } };
    const state = makeState({
      chars: [{
        id: 'fm', name: 'FM', role: 'FM', initials: 'FM', color: '#000', mood: 3, loyalty: 3,
        bio: '', interests: [], bonus: { trigger: '', desc: '', applies: '' },
        ultimatum: { moodThresh: 0, event: '' },
      }],
    });
    const result = resolveEvent(state, event, choice);
    expect(result.chars.find(c => c.id === 'fm')!.mood).toBe(2);
  });

  it('wendet brRelation an', () => {
    const event = makeEvent({ id: 'generic_event' });
    const choice: EventChoice = {
      label: 'OK', desc: '', cost: 0, type: 'safe', effect: {}, log: 'log',
      brRelation: { koalitionstreue: 5 },
    };
    const state = makeState({
      bundesratFraktionen: [{
        id: 'koalitionstreue', name: 'KT',
        sprecher: { name: '', partei: '', land: '', initials: '', color: '', bio: '' },
        laender: ['NW'], basisBereitschaft: 50, beziehung: 40, tradeoffPool: [],
      }],
    });
    const result = resolveEvent(state, event, choice);
    expect(result.bundesratFraktionen[0].beziehung).toBe(45);
  });

  it('wahlkampf_beginn Event: einfaches Bestätigen', () => {
    const event = makeEvent({ id: 'wahlkampf_beginn' });
    const choice: EventChoice = { label: 'OK', desc: '', cost: 0, type: 'safe', effect: {}, log: '' };
    const state = makeState({ activeEvent: event });
    const result = resolveEvent(state, event, choice);
    expect(result.activeEvent).toBeNull();
  });

  it('koalitionspartner_alleingang Event: einfaches Bestätigen', () => {
    const event = makeEvent({ id: 'koalitionspartner_alleingang' });
    const choice: EventChoice = { label: 'OK', desc: '', cost: 0, type: 'safe', effect: {}, log: '' };
    const state = makeState({ activeEvent: event });
    const result = resolveEvent(state, event, choice);
    expect(result.activeEvent).toBeNull();
  });

  it('wendet bundesratBonusAll an', () => {
    const event = makeEvent({ id: 'generic_event' });
    const choice: EventChoice = {
      label: 'OK', desc: '', cost: 0, type: 'safe', effect: {}, log: 'log',
      bundesratBonusAll: 5,
    };
    const state = makeState({
      bundesratFraktionen: [
        { id: 'f1', name: 'F1', sprecher: { name: '', partei: '', land: '', initials: '', color: '', bio: '' }, laender: ['NW'], basisBereitschaft: 50, beziehung: 40, tradeoffPool: [] },
        { id: 'f2', name: 'F2', sprecher: { name: '', partei: '', land: '', initials: '', color: '', bio: '' }, laender: ['BY'], basisBereitschaft: 50, beziehung: 60, tradeoffPool: [] },
      ],
    });
    const result = resolveEvent(state, event, choice);
    expect(result.bundesratFraktionen[0].beziehung).toBe(45);
    expect(result.bundesratFraktionen[1].beziehung).toBe(65);
  });
});
