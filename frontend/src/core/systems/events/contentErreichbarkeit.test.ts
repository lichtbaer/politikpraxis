/**
 * Erreichbarkeit von Content über den Event-Pfad: gesperrte Gesetze, Follow-up-Ketten,
 * EU-Klima-Wirkung. Hintergrund: Im DB-gestützten Spiel waren alle 14 gesperrten Gesetze
 * unerreichbar (Events fehlten, `unlockedLaws` wurde nie gelesen) und Story-Arcs starteten
 * nie (Pool filterte auf event_type 'random').
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { checkRandomEvents, checkFollowupEvents, resolveEvent } from './events';
import { eigenstaendigeEvents } from './eventPoolSelection';
import * as rng from '../../rng';
import { createInitialState } from '../../state';
import { DEFAULT_CONTENT } from '../../../data/defaults/scenarios';
import type { ContentBundle, GameEvent, GameState, Law } from '../../types';

afterEach(() => vi.restoreAllMocks());

function makeEvent(overrides: Partial<GameEvent> = {}): GameEvent {
  return {
    id: 'test_event',
    type: 'info',
    icon: '',
    typeLabel: '',
    title: 'Test',
    quote: '',
    context: '',
    choices: [{ label: 'OK', desc: '', cost: 0, type: 'safe', effect: {}, log: 'log', key: 'ok' }],
    ticker: '',
    ...overrides,
  };
}

const GESPERRT_ID = 'gesperrtes_gesetz';

function contentMitGesperrtemGesetz(): ContentBundle {
  const vorlage = DEFAULT_CONTENT.laws[0];
  const gesperrt: Law = {
    ...vorlage,
    id: GESPERRT_ID,
    titel: 'Gesperrtes Testgesetz',
    kurz: 'GT',
    locked_until_event: 'freischalt_event',
  };
  return { ...DEFAULT_CONTENT, laws: [...DEFAULT_CONTENT.laws, gesperrt] };
}

function makeState(content: ContentBundle, overrides: Partial<GameState> = {}): GameState {
  const base = createInitialState(content, 4);
  return { ...base, month: 10, activeEvent: null, activeEventPool: [], firedEvents: [], ...overrides };
}

describe('Zufalls-Pool: Fortsetzungen nie eigenständig', () => {
  const quelle = makeEvent({
    id: 'haushalt_quelle',
    choices: [
      { label: 'Schulden', desc: '', cost: 0, type: 'danger', effect: {}, log: '', followup_event_id: 'klage_folge', followup_delay: 2 },
    ],
  });
  const folge = makeEvent({ id: 'klage_folge' });

  it('zieht ein Follow-up-Ziel ohne Arc-Stufe nicht als Zufallsereignis', () => {
    vi.spyOn(rng, 'nextRandom').mockReturnValue(0);
    const result = checkRandomEvents(makeState(DEFAULT_CONTENT, { firedEvents: ['haushalt_quelle'] }), [quelle, folge]);
    expect(result.activeEvent).toBeNull();
  });

  it('zieht die Quelle der Kette weiterhin', () => {
    vi.spyOn(rng, 'nextRandom').mockReturnValue(0);
    const result = checkRandomEvents(makeState(DEFAULT_CONTENT), [folge, quelle]);
    expect(result.activeEvent?.id).toBe('haushalt_quelle');
  });

  it('eigenstaendigeEvents lässt Arc-Stufen ≥ 2 und Follow-up-Ziele aus der Pool-Auswahl', () => {
    const arcStufe2 = makeEvent({ id: 'arc_2', arcId: 'a', arcStage: 2 });
    expect(eigenstaendigeEvents([quelle, folge, arcStufe2]).map(e => e.id)).toEqual(['haushalt_quelle']);
  });

  it('der geplante Follow-up findet sein Ziel im Pool', () => {
    const state = makeState(DEFAULT_CONTENT, { month: 12, pendingFollowups: [{ eventId: 'klage_folge', triggerMonth: 12 }] });
    const result = checkFollowupEvents(state, [quelle, folge]);
    expect(result.activeEvent?.id).toBe('klage_folge');
    expect(result.pendingFollowups).toEqual([]);
  });
});

describe('Gesperrte Gesetze (locked_until_event)', () => {
  it('sind beim Start nicht in state.gesetze, ihre effektiven BT-Stimmen aber schon berechnet', () => {
    const state = createInitialState(contentMitGesperrtemGesetz(), 4);
    expect(state.gesetze.some(g => g.id === GESPERRT_ID)).toBe(false);
    expect(state.gesetzBTStimmen?.[GESPERRT_ID]).toEqual(expect.any(Number));
  });

  it('kommen per Event-Option in den Spielstand — als Entwurf, ohne Sperre, mit Log', () => {
    const content = contentMitGesperrtemGesetz();
    const state = makeState(content, { gesetzBTStimmen: { ...makeState(content).gesetzBTStimmen, [GESPERRT_ID]: 63 } });
    const event = makeEvent({
      id: 'freischalt_event',
      choices: [{ label: 'Handeln', desc: '', cost: 0, type: 'primary', effect: {}, log: 'gehandelt', unlocks_laws: [GESPERRT_ID] }],
    });

    const result = resolveEvent({ ...state, activeEvent: event }, event, event.choices[0], { complexity: 4, contentBundle: content });

    const gesetz = result.gesetze.find(g => g.id === GESPERRT_ID);
    expect(gesetz).toBeDefined();
    expect(gesetz!.status).toBe(content.laws.find(g => g.id === GESPERRT_ID)!.status);
    expect(gesetz!.locked_until_event).toBeUndefined();
    expect(gesetz!.ja).toBe(63);
    expect(gesetz!.nein).toBe(37);
    expect(result.unlockedLaws).toContain(GESPERRT_ID);
    expect(result.log.some(l => l.msg.includes('Gesperrtes Testgesetz'))).toBe(true);
  });

  it('werden nicht doppelt eingefügt, wenn eine zweite Option dasselbe Gesetz freischaltet', () => {
    const content = contentMitGesperrtemGesetz();
    const event = makeEvent({
      id: 'freischalt_event',
      choices: [{ label: 'Handeln', desc: '', cost: 0, type: 'primary', effect: {}, log: '', unlocks_laws: [GESPERRT_ID] }],
    });
    const opts = { complexity: 4, contentBundle: content };
    let state = makeState(content);
    state = resolveEvent({ ...state, activeEvent: event }, event, event.choices[0], opts);
    state = resolveEvent({ ...state, activeEvent: event }, event, event.choices[0], opts);
    expect(state.gesetze.filter(g => g.id === GESPERRT_ID)).toHaveLength(1);
  });
});

describe('EU-Ereignis-Optionen', () => {
  it('verschieben das EU-Klima im Politikfeld, begrenzt auf 0–100', () => {
    const state = makeState(DEFAULT_CONTENT, {
      eu: {
        klima: { arbeit_soziales: 95 },
        klimaSperre: {},
        ratsvorsitz: false,
        ratsvorsitzStartMonat: 0,
        ratsvorsitzPrioritaeten: [],
        umsetzungsfristen: [],
        foerdermittelBeantragt: [],
        aktiveRoute: null,
      },
    });
    const event = makeEvent({
      id: 'eu_rl_mindestlohn',
      choices: [
        { label: 'Sofort umsetzen', desc: '', cost: 0, type: 'primary', effect: {}, log: 'umgesetzt', euKlima: { feldId: 'arbeit_soziales', delta: 8 }, kofinanzierung: 0.2 },
      ],
    });

    const result = resolveEvent({ ...state, activeEvent: event }, event, event.choices[0], { complexity: 4, contentBundle: DEFAULT_CONTENT });

    expect(result.eu?.klima.arbeit_soziales).toBe(100);
    expect(result.log.some(l => l.msg.includes('Kofinanzierung: 20%'))).toBe(true);
    expect(result.activeEvent).toBeNull();
  });
});
