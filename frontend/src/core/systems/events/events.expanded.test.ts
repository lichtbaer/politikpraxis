import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  checkRandomEvents,
  checkBundesratEvents,
  checkKommunalLaenderEvents,
  resolveEvent,
  isEventAvailable,
  recordEventFired,
} from './events';
import { calcBundesratMehrheit } from '../institutions/bundesrat';
import { berechneVermittlungsChancen, tickVermittlungsausschuss } from '../legislation/vermittlung';
import * as rng from '../../rng';
import { createInitialState } from '../../state';
import { DEFAULT_CONTENT } from '../../../data/defaults/scenarios';
import { LANDTAGSWAHL_TRANSITIONS } from '../../../data/defaults/bundesratEvents';
import { SPIELER_PARTEI_TO_PROFIL } from '../../../constants/bundeslaenderProfil';
import type {
  GameState,
  GameEvent,
  EventChoice,
  BundesratFraktion,
  BundesratLand,
  LandtagswahlTransition,
  Law,
} from '../../types';

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
  it('triggert Event wenn nextRandom unter dynamischer Schwelle liegt', () => {
    // Monat 10: Basis 0,20, kein Dürreschutz (letzterEvent=0 → month-letzter >= 3), Koalition 70
    vi.spyOn(rng, 'nextRandom').mockReturnValueOnce(0.1).mockReturnValueOnce(0); // Ziehung + Index in Pool
    const event = makeEvent({ id: 'random_ev' });
    const state = makeState();
    const result = checkRandomEvents(state, [event]);
    expect(result.activeEvent).toBeTruthy();
    expect(result.activeEvent!.id).toBe('random_ev');
    expect(result.firedEvents).toContain('random_ev');
    vi.restoreAllMocks();
  });

  it('triggert kein Event wenn nextRandom über Schwelle liegt', () => {
    vi.spyOn(rng, 'nextRandom').mockReturnValue(0.5);
    const event = makeEvent();
    const state = makeState();
    const result = checkRandomEvents(state, [event]);
    expect(result.activeEvent).toBeNull();
    vi.restoreAllMocks();
  });

  it('triggert nicht wenn Event bereits gefeuert', () => {
    vi.spyOn(rng, 'nextRandom').mockReturnValue(0);
    const event = makeEvent({ id: 'already_fired' });
    const state = makeState({ firedEvents: ['already_fired'] });
    const result = checkRandomEvents(state, [event]);
    expect(result.activeEvent).toBeNull();
    vi.restoreAllMocks();
  });

  it('triggert nicht wenn activeEvent vorhanden', () => {
    const event = makeEvent();
    const existing = makeEvent({ id: 'existing' });
    const state = makeState({ activeEvent: existing });
    const result = checkRandomEvents(state, [event]);
    expect(result.activeEvent!.id).toBe('existing');
    vi.restoreAllMocks();
  });

  it('triggert nicht bei leerer Event-Liste', () => {
    vi.spyOn(rng, 'nextRandom').mockReturnValue(0);
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

  it('filtert Events deren min_complexity über der aktuellen Komplexitätsstufe liegt', () => {
    vi.spyOn(rng, 'nextRandom').mockReturnValue(0);
    const event = makeEvent({ id: 'stufe3_event', min_complexity: 3 });
    const state = makeState();
    const result = checkRandomEvents(state, [event], 1);
    expect(result.activeEvent).toBeNull();
    vi.restoreAllMocks();
  });

  it('erlaubt Events deren min_complexity auf oder unter der aktuellen Komplexitätsstufe liegt', () => {
    vi.spyOn(rng, 'nextRandom').mockReturnValue(0);
    const event = makeEvent({ id: 'stufe3_event', min_complexity: 3 });
    const state = makeState();
    const result = checkRandomEvents(state, [event], 3);
    expect(result.activeEvent!.id).toBe('stufe3_event');
    vi.restoreAllMocks();
  });

  it('behandelt fehlendes min_complexity als Stufe 1 (immer verfügbar)', () => {
    vi.spyOn(rng, 'nextRandom').mockReturnValue(0);
    const event = makeEvent({ id: 'ohne_min_complexity' });
    const state = makeState();
    const result = checkRandomEvents(state, [event], 1);
    expect(result.activeEvent!.id).toBe('ohne_min_complexity');
    vi.restoreAllMocks();
  });

  it('#272: filtert Arc-Fortsetzungen (arcStage >= 2) aus dem Zufallspool — nur über Follow-up erreichbar', () => {
    vi.spyOn(rng, 'nextRandom').mockReturnValue(0);
    const fortsetzung = makeEvent({ id: 'arc_stage2', arcId: 'testarc', arcStage: 2 });
    const state = makeState();
    const result = checkRandomEvents(state, [fortsetzung]);
    expect(result.activeEvent).toBeNull();
    vi.restoreAllMocks();
  });

  it('#272: Arc-Einstieg (arcStage 1 oder ohne arcStage) bleibt regulär zufällig auslösbar', () => {
    vi.spyOn(rng, 'nextRandom').mockReturnValue(0);
    const einstieg = makeEvent({ id: 'arc_stage1', arcId: 'testarc', arcStage: 1 });
    const state = makeState();
    const result = checkRandomEvents(state, [einstieg]);
    expect(result.activeEvent!.id).toBe('arc_stage1');
    vi.restoreAllMocks();
  });

  it('bietet im Spätspiel (Monat 36+) weiterhin Events, wenn nicht-wiederholbare Events erschöpft sind (SMA-273)', () => {
    vi.spyOn(rng, 'nextRandom').mockReturnValue(0); // immer auslösen, immer erstes verfügbares Event wählen
    const einmaligA = makeEvent({ id: 'einmalig_a' });
    const einmaligB = makeEvent({ id: 'einmalig_b' });
    const basiskrise = makeEvent({ id: 'basiskrise_c', repeatable: true, cooldownMonths: 10 });
    const pool = [einmaligA, einmaligB, basiskrise];

    let state = makeState({ month: 1, firedEvents: [], eventCooldowns: {} });
    for (let i = 0; i < 3; i++) {
      const result = checkRandomEvents(state, pool);
      expect(result.activeEvent).toBeTruthy();
      state = { ...result, activeEvent: null, month: state.month + 1 };
    }
    expect(state.firedEvents).toEqual(expect.arrayContaining(['einmalig_a', 'einmalig_b']));

    // Weit ins Spätspiel vorspulen — der Cooldown der Basiskrise ist längst abgelaufen
    state = { ...state, month: 40 };
    const result = checkRandomEvents(state, pool);
    expect(result.activeEvent).toBeTruthy();
    expect(result.activeEvent!.id).toBe('basiskrise_c');
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

  describe('Kohl ruft den Vermittlungsausschuss an (#276 AC3)', () => {
    const ctx = { bundesratEvents: brEvents, sprecherErsatz: {}, landtagswahlTransitions: [] };
    const ostblock = (beziehung: number): BundesratFraktion => ({
      id: 'ostblock', name: 'Ostblock',
      sprecher: { name: 'Kohl', partei: 'P', land: 'SN', initials: 'K', color: '#000', bio: '' },
      laender: ['SN', 'TH'], basisBereitschaft: 30, beziehung,
      tradeoffPool: [], sonderregel: 'kohl_saboteur',
    });
    const mitte: BundesratFraktion = { ...ostblock(50), id: 'mitte', name: 'Mitte', sonderregel: undefined };
    const landGesetz = (overrides: Partial<Law> = {}): Law => ({
      id: 'law1', titel: 'L', kurz: 'L', desc: '', tags: ['land'], status: 'bt_passed',
      ja: 55, nein: 45, effekte: { zf: 2 }, lag: 3, expanded: false, route: null, rprog: 0, rdur: 0,
      blockiert: null, brVoteMonth: 22, zustimmungspflichtig: true, ...overrides,
    });
    /** Choices wie im DB-Content: Keys, aber kein br_relation_json */
    const kohlEvent = makeEvent({
      id: 'kohl_eskaliert',
      choices: [
        { label: 'Kooperieren', desc: '', cost: 15, type: 'primary', effect: {}, log: 'k', key: 'kooperieren' },
        { label: 'Juristisch blockieren', desc: '', cost: 20, type: 'safe', effect: {}, log: 'j', key: 'juristisch_blockieren' },
        { label: 'Öffentlich kritisieren', desc: '', cost: 0, type: 'danger', effect: { zf: -2 }, log: 'o', key: 'oeffentlich_kritisieren_kohl' },
      ],
    });
    const ausgeloest = () => checkBundesratEvents(
      makeState({ month: 20, pk: 50, firedBundesratEvents: [], bundesratFraktionen: [ostblock(10), mitte], gesetze: [landGesetz()] }),
      { ...ctx, bundesratEvents: [kohlEvent] },
    );
    const beziehungOstblock = (s: GameState) => s.bundesratFraktionen.find(f => f.id === 'ostblock')!.beziehung;

    afterEach(() => vi.restoreAllMocks());

    it('startet eine Bundesrats-Vermittlung statt nur zu verzögern', () => {
      const result = ausgeloest();
      const law = result.gesetze[0];
      expect(result.activeEvent!.id).toBe('kohl_eskaliert');
      expect(result.activeEvent!.lawId).toBe('law1');
      expect(result.activeEvent!.fraktionId).toBe('ostblock');
      expect(law.status).toBe('bt_passed');
      expect(law.kohlSabotageTriggered).toBe(true);
      // Abstimmung wie bisher um 2 Monate verschoben — jetzt als Fristende der Vermittlung
      expect(law.brVoteMonth).toBe(24);
      expect(result.vermittlungAktiv?.law1).toBe(24);
      expect(result.vermittlungAnrufer?.law1).toBe('ostblock');
      expect(result.vermittlungAusgang?.law1).toBeUndefined();
      expect(result.pk).toBe(50);
    });

    it('löst für dasselbe Gesetz keine zweite Vermittlung aus', () => {
      const erste = { ...ausgeloest(), activeEvent: null };
      const zweite = checkBundesratEvents(erste, { ...ctx, bundesratEvents: [kohlEvent] });
      expect(zweite.activeEvent).toBeNull();
      expect(zweite.vermittlungAktiv).toEqual(erste.vermittlungAktiv);
    });

    it('„Kooperieren" verbessert die Beziehung zu Kohl, „Öffentlich kritisieren" verschlechtert sie', () => {
      const s = ausgeloest();
      const [kooperieren, juristisch, kritisieren] = kohlEvent.choices;
      expect(beziehungOstblock(resolveEvent(s, s.activeEvent!, kooperieren))).toBe(18);
      expect(beziehungOstblock(resolveEvent(s, s.activeEvent!, juristisch))).toBe(10);
      expect(beziehungOstblock(resolveEvent(s, s.activeEvent!, kritisieren))).toBe(0);
    });

    it('wendet das Beziehungs-Delta nicht doppelt an, wenn der Content eines mitbringt', () => {
      const s = ausgeloest();
      const mitContentDelta: EventChoice = { ...kohlEvent.choices[0], brRelation: { ostblock: 5 } };
      expect(beziehungOstblock(resolveEvent(s, s.activeEvent!, mitContentDelta))).toBe(15);
    });

    it('die Reaktion auf den Antrag verschiebt den Ausgang der Vermittlung', () => {
      const s = ausgeloest();
      const [kooperieren, , kritisieren] = kohlEvent.choices;
      const bisFrist = (x: GameState): GameState => ({ ...x, month: 24 });
      const kooperativ = bisFrist(resolveEvent(s, s.activeEvent!, kooperieren));
      const konfrontativ = bisFrist(resolveEvent(s, s.activeEvent!, kritisieren));

      const cKoop = berechneVermittlungsChancen(kooperativ, 'law1');
      const cKrit = berechneVermittlungsChancen(konfrontativ, 'law1');
      const einigungKoop = cKoop.erfolg + cKoop.kompromiss;
      const einigungKrit = cKrit.erfolg + cKrit.kompromiss;
      expect(einigungKoop).toBeGreaterThan(einigungKrit);

      // Gleicher Wurf zwischen beiden Einigungsschwellen: Kooperation rettet das Gesetz
      vi.spyOn(rng, 'nextRandom').mockReturnValue((einigungKoop + einigungKrit) / 2);
      const nachKoop = tickVermittlungsausschuss(kooperativ, { complexity: 4 });
      const nachKrit = tickVermittlungsausschuss(konfrontativ, { complexity: 4 });

      expect(nachKoop.gesetze[0].status).toBe('bt_passed');
      expect(nachKoop.gesetze[0].brVoteMonth).toBe(24);
      expect(nachKrit.gesetze[0].status).toBe('blockiert');
      expect(nachKrit.gesetze[0].blockiert).toBe('bundesrat');
    });
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

describe('repeatable events', () => {
  it('isEventAvailable returns true for repeatable event not on cooldown', () => {
    const event = makeEvent({ id: 'rep_event', repeatable: true, cooldownMonths: 6 });
    const state = makeState({ month: 10, eventCooldowns: {} });
    expect(isEventAvailable(state, event)).toBe(true);
  });

  it('isEventAvailable returns false for repeatable event on cooldown', () => {
    const event = makeEvent({ id: 'rep_event', repeatable: true, cooldownMonths: 6 });
    const state = makeState({ month: 10, eventCooldowns: { rep_event: 15 } });
    expect(isEventAvailable(state, event)).toBe(false);
  });

  it('isEventAvailable returns true for repeatable event after cooldown expires', () => {
    const event = makeEvent({ id: 'rep_event', repeatable: true, cooldownMonths: 6 });
    const state = makeState({ month: 20, eventCooldowns: { rep_event: 15 } });
    expect(isEventAvailable(state, event)).toBe(true);
  });

  it('isEventAvailable uses firedEvents for non-repeatable events', () => {
    const event = makeEvent({ id: 'normal_event' });
    const state = makeState({ firedEvents: ['normal_event'] });
    expect(isEventAvailable(state, event)).toBe(false);
  });

  it('recordEventFired sets cooldown for repeatable events', () => {
    const event = makeEvent({ id: 'rep_event', repeatable: true, cooldownMonths: 6 });
    const state = makeState({ month: 10 });
    const patch = recordEventFired(state, event);
    expect(patch.eventCooldowns).toBeDefined();
    expect(patch.eventCooldowns!['rep_event']).toBe(16);
    expect(patch.firedEvents).toBeUndefined();
  });

  it('recordEventFired defaults cooldown to 12 months', () => {
    const event = makeEvent({ id: 'rep_event', repeatable: true });
    const state = makeState({ month: 5 });
    const patch = recordEventFired(state, event);
    expect(patch.eventCooldowns!['rep_event']).toBe(17);
  });

  it('recordEventFired adds to firedEvents for non-repeatable events', () => {
    const event = makeEvent({ id: 'normal_event' });
    const state = makeState({ firedEvents: [] });
    const patch = recordEventFired(state, event);
    expect(patch.firedEvents).toContain('normal_event');
    expect(patch.eventCooldowns).toBeUndefined();
  });

  it('checkRandomEvents uses cooldown for repeatable events instead of firedEvents', () => {
    vi.spyOn(rng, 'nextRandom').mockReturnValueOnce(0).mockReturnValueOnce(0);
    const event = makeEvent({ id: 'rep_random', repeatable: true, cooldownMonths: 6 });
    const state = makeState({ month: 10 });

    const result = checkRandomEvents(state, [event]);
    expect(result.activeEvent).toBeTruthy();
    expect(result.activeEvent!.id).toBe('rep_random');
    expect(result.eventCooldowns?.['rep_random']).toBe(16);
    expect(result.firedEvents).not.toContain('rep_random');
    vi.restoreAllMocks();
  });

  it('checkRandomEvents blocks repeatable event on cooldown', () => {
    vi.spyOn(rng, 'nextRandom').mockReturnValue(0);
    const event = makeEvent({ id: 'rep_random', repeatable: true, cooldownMonths: 6 });
    const state = makeState({ month: 10, eventCooldowns: { rep_random: 15 } });

    const result = checkRandomEvents(state, [event]);
    expect(result.activeEvent).toBeNull();
    vi.restoreAllMocks();
  });

  it('checkRandomEvents allows repeatable event after cooldown expires', () => {
    vi.spyOn(rng, 'nextRandom').mockReturnValueOnce(0).mockReturnValueOnce(0);
    const event = makeEvent({ id: 'rep_random', repeatable: true, cooldownMonths: 6 });
    const state = makeState({ month: 20, eventCooldowns: { rep_random: 15 } });

    const result = checkRandomEvents(state, [event]);
    expect(result.activeEvent).toBeTruthy();
    expect(result.activeEvent!.id).toBe('rep_random');
    expect(result.eventCooldowns?.['rep_random']).toBe(26);
    vi.restoreAllMocks();
  });
});

describe('#275: Landtagswahl ändert Landeskoalition (Koalitionsklausel)', () => {
  const HE_LAND: BundesratLand = {
    id: 'HE',
    name: 'Hessen',
    mp: 'Marcus Roth',
    party: 'CDU',
    alignment: 'koalition',
    mood: 2,
    interests: [],
    votes: 5,
    regierungPartei: 'CDP',
    koalition: ['CDP', 'GP'],
    // Themen ungleich dem Politikfeld des Gesetzes → themenBonus = 0
    themen: ['sonstiges_thema'],
    stimmgewicht: 5,
  };

  /** basisBereitschaft 43 + Beziehungsbonus 7 = 50 → lobbyTilt 0 */
  function makeBrFraktion(id: string, laender: string[]): BundesratFraktion {
    return {
      id,
      name: id,
      sprecher: { name: 'S', partei: 'P', land: 'HE', initials: 'S', color: '#000', bio: '' },
      laender,
      basisBereitschaft: 43,
      beziehung: 50,
      tradeoffPool: [],
    };
  }

  const LAW: Law = {
    id: 'br_law', titel: 'L', kurz: 'L', desc: '', tags: ['land'], status: 'bt_passed',
    ja: 55, nein: 45, effekte: {}, lag: 3, expanded: false, route: null, rprog: 0, rdur: 0,
    blockiert: null, brVoteMonth: 13,
  };

  /** Ein Land (HE, 5 Stimmen), Land-Beziehung 50 → Ja-Wahrscheinlichkeit genau 50% (ohne Parteibonus) */
  function makeBrState(land: Partial<BundesratLand> = {}): GameState {
    return makeState({
      month: 10,
      firedBundesratEvents: [],
      bundesrat: [{ ...HE_LAND, ...land }],
      bundesratFraktionen: [
        makeBrFraktion('pragmatische_mitte', ['HE']),
        makeBrFraktion('konservativer_block', []),
      ],
      landBeziehungen: { HE: 50 },
      gesetze: [LAW],
    });
  }

  function makeLandtagswahlEvent(overrides: Partial<GameEvent> = {}): GameEvent {
    return makeEvent({
      id: 'landtagswahl',
      fraktionId: 'pragmatische_mitte',
      landId: 'HE',
      landName: 'Hessen',
      landtagswahlToFraktion: 'konservativer_block',
      choices: [{ label: 'OK', desc: '', cost: 0, type: 'primary', effect: {}, log: 'Regierungswechsel akzeptiert.' }],
      ...overrides,
    });
  }

  function resolveLandtagswahl(state: GameState, overrides: Partial<GameEvent> = {}): GameState {
    const event = makeLandtagswahlEvent(overrides);
    return resolveEvent(state, event, event.choices[0]);
  }

  const HE_TRANSITION: LandtagswahlTransition = {
    landId: 'HE',
    landName: 'Hessen',
    newParty: 'CDU',
    fromFraktion: 'pragmatische_mitte',
    toFraktion: 'konservativer_block',
    neueRegierungPartei: 'CDP',
    koalitionsOptionen: [['CDP', 'LDP'], ['CDP']],
  };

  it('checkBundesratEvents zieht die neue Landesregierung per Engine-RNG beim Auslösen', () => {
    // Auslöse-Chance, Transition-Index, Koalitions-Option (0.99 → letzte Option)
    vi.spyOn(rng, 'nextRandom').mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0.99);
    const result = checkBundesratEvents(makeBrState(), {
      bundesratEvents: [makeEvent({ id: 'landtagswahl' })],
      sprecherErsatz: {},
      landtagswahlTransitions: [HE_TRANSITION],
    });
    vi.restoreAllMocks();
    expect(result.activeEvent?.id).toBe('landtagswahl');
    expect(result.activeEvent?.landtagswahlKoalition).toEqual(['CDP']);
    expect(result.activeEvent?.landtagswahlRegierungPartei).toBe('CDP');
  });

  it('bei nur einer Koalitions-Option wird kein zusätzlicher Zufallswert gezogen', () => {
    const spy = vi.spyOn(rng, 'nextRandom').mockReturnValueOnce(0).mockReturnValueOnce(0);
    const result = checkBundesratEvents(makeBrState(), {
      bundesratEvents: [makeEvent({ id: 'landtagswahl' })],
      sprecherErsatz: {},
      landtagswahlTransitions: [{ ...HE_TRANSITION, koalitionsOptionen: [['CDP', 'SDP']] }],
    });
    expect(spy).toHaveBeenCalledTimes(2);
    vi.restoreAllMocks();
    expect(result.activeEvent?.landtagswahlKoalition).toEqual(['CDP', 'SDP']);
  });

  it('resolveEvent übernimmt Regierungspartei + Koalition und loggt die Regierungsbildung', () => {
    const result = resolveLandtagswahl(
      makeBrState({ regierungPartei: 'GP', koalition: ['GP', 'SDP'] }),
      { landtagswahlKoalition: ['CDP', 'LDP'], landtagswahlRegierungPartei: 'CDP' },
    );

    const he = result.bundesrat.find(l => l.id === 'HE')!;
    expect(he.koalition).toEqual(['CDP', 'LDP']);
    expect(he.regierungPartei).toBe('CDP');
    // Fraktionswechsel wie bisher
    expect(result.bundesratFraktionen.find(f => f.id === 'konservativer_block')!.laender).toContain('HE');
    expect(result.bundesratFraktionen.find(f => f.id === 'pragmatische_mitte')!.laender).not.toContain('HE');
    expect(result.log.some(e =>
      e.msg === 'game:bundesrat.logLandtagswahlKoalition'
        && e.params?.koalition === 'CDP + LDP'
        && e.params?.land === 'Hessen',
    )).toBe(true);
  });

  it('Alleinregierung wird mit eigenem Log-Eintrag erklärt', () => {
    const result = resolveLandtagswahl(makeBrState(), {
      landtagswahlKoalition: ['CDP'],
      landtagswahlRegierungPartei: 'CDP',
    });
    expect(result.bundesrat.find(l => l.id === 'HE')!.koalition).toEqual(['CDP']);
    expect(result.log.some(e =>
      e.msg === 'game:bundesrat.logLandtagswahlAlleinregierung' && e.params?.partei === 'CDP',
    )).toBe(true);
  });

  it('ohne Länderprofil (vereinfachter Pfad) bleibt die Koalition unverändert, der Fraktionswechsel greift', () => {
    const result = resolveLandtagswahl(
      makeBrState({ koalition: undefined, regierungPartei: undefined, themen: undefined }),
      { landtagswahlKoalition: ['CDP'], landtagswahlRegierungPartei: 'CDP' },
    );
    const he = result.bundesrat.find(l => l.id === 'HE')!;
    expect(he.koalition).toBeUndefined();
    expect(he.regierungPartei).toBeUndefined();
    expect(result.bundesratFraktionen.find(f => f.id === 'konservativer_block')!.laender).toContain('HE');
  });

  it('Legacy-Event ohne gezogene Koalition lässt die Landeskoalition unverändert', () => {
    const result = resolveLandtagswahl(makeBrState());
    expect(result.bundesrat.find(l => l.id === 'HE')!.koalition).toEqual(['CDP', 'GP']);
  });

  it('Wechsel zur Alleinregierung beendet die Enthaltung (Koalitionsklausel) im Bundesrat', () => {
    const state = makeBrState({ koalition: ['CDP', 'GP'] });
    const vorher = calcBundesratMehrheit(state, 'br_law');
    expect(vorher.enthaltung).toBe(5);
    expect(vorher.ja).toBe(0);

    const nachher = calcBundesratMehrheit(
      resolveLandtagswahl(state, { landtagswahlKoalition: ['CDP'], landtagswahlRegierungPartei: 'CDP' }),
      'br_law',
    );
    expect(nachher.enthaltung).toBe(0);
    expect(nachher.ja).toBe(5);
  });

  it('neue gemischte Koalition macht eine Enthaltung erst möglich', () => {
    const state = makeBrState({ koalition: ['CDP'] });
    expect(calcBundesratMehrheit(state, 'br_law').enthaltung).toBe(0);

    const nachher = calcBundesratMehrheit(
      resolveLandtagswahl(state, { landtagswahlKoalition: ['CDP', 'LDP'], landtagswahlRegierungPartei: 'CDP' }),
      'br_law',
    );
    expect(nachher.enthaltung).toBe(5);
    expect(nachher.ja).toBe(0);
  });

  it('neue Regierungspartei = Spielerpartei: klare Zustimmung statt Enthaltung trotz Koalition', () => {
    // Spielerpartei im Default-State: SDP → Parteibonus +20% hebt das Land aus dem Uneinigkeits-Band
    const state = makeBrState({ regierungPartei: 'LP', koalition: ['LP', 'SDP'] });
    expect(calcBundesratMehrheit(state, 'br_law').enthaltung).toBe(5);

    const nachher = calcBundesratMehrheit(
      resolveLandtagswahl(state, { landtagswahlKoalition: ['SDP', 'CDP'], landtagswahlRegierungPartei: 'SDP' }),
      'br_law',
    );
    expect(nachher.enthaltung).toBe(0);
    expect(nachher.ja).toBe(5);
  });

  it('LANDTAGSWAHL_TRANSITIONS: Koalitionen nutzen Profil-Kürzel und enthalten den Wahlsieger', () => {
    const profilParteien = new Set(Object.values(SPIELER_PARTEI_TO_PROFIL));
    for (const t of LANDTAGSWAHL_TRANSITIONS) {
      expect(t.koalitionsOptionen.length).toBeGreaterThan(0);
      expect(profilParteien.has(t.neueRegierungPartei)).toBe(true);
      for (const k of t.koalitionsOptionen) {
        expect(k[0]).toBe(t.neueRegierungPartei);
        expect(new Set(k).size).toBe(k.length);
        for (const p of k) expect(profilParteien.has(p)).toBe(true);
      }
    }
  });
});
