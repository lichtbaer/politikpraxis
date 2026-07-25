/**
 * Medienklima: Event-Pool (Skandale/Positiv), Opposition und der monatliche Tick.
 * Extrahiert aus medienklima.ts (#235). Akteur-State/Index siehe medienAkteure.ts.
 */
import type { GameState, ContentBundle, MedienEventContent, GameEvent, EventChoice, Law } from '../../types';
import { addLog } from '../../engine';
import { withPause, getAutoPauseLevel } from '../../eventPause';
import { featureActive } from '../features';
import { isEventAvailable, recordEventFired } from '../events/eventUtils';
import { clamp, SKANDAL_CHANCE, POSITIV_MEDIEN_CHANCE, INNEN_SKANDAL_SCHUTZ_FAKTOR, CHAR_BONUS_MOOD_MIN } from '../../constants';
import { getGesetzIdeologie } from '../koalition';
import { nextRandom } from '../../rng';
import {
  berechneMedianklima,
  adjustMedienKlimaGlobal,
  applyAkteurReaktion,
  mergeMedienAkteureState,
  getAkteurDefinitions,
  activeMedienAkteurIds,
  expireMedienAkteurBuffs,
  tickAlternativReichweite,
  type ReaktionsKey,
} from './medienAkteure';

/** Nach Beschluss: ideologische Medien-Reaktion (Stufe 3+) */
export function applyGesetzMedienAkteureNachBeschluss(
  state: GameState,
  law: Law,
  complexity: number,
  content: ContentBundle,
): GameState {
  if (!featureActive(complexity, 'medien_akteure_3')) return state;
  const g = getGesetzIdeologie(law);
  const tendenz = g.gesellschaft - g.staat - g.wirtschaft * 0.35;
  const key: ReaktionsKey = tendenz > 1 ? 'gesetz_progressiv' : 'gesetz_konservativ';
  return applyAkteurReaktion(state, key, complexity, content);
}

/** Haushaltskrise-Event: Akteur-Reaktionen */
export function applyMedienHaushaltKrise(state: GameState, complexity: number, content: ContentBundle): GameState {
  return applyAkteurReaktion(state, 'haushalt_krise', complexity, content);
}

/** Konvertiert MedienEventContent zu GameEvent für activeEvent */
function medienEventToGameEvent(me: MedienEventContent): GameEvent {
  const type = me.event_subtype === 'skandal' ? 'danger' : 'good';
  return {
    id: me.id,
    type,
    icon: type === 'danger' ? 'danger' : 'good',
    typeLabel: me.event_subtype === 'skandal' ? 'Skandal' : 'Positiv',
    title: me.title,
    quote: me.quote,
    context: me.context,
    ticker: me.ticker,
    choices: me.choices.map((c) => ({
      label: c.label,
      desc: c.desc,
      cost: c.cost_pk,
      type: 'safe' as const,
      effect: {},
      log: c.log_msg,
      key: c.key,
      medienklima_delta: c.medienklima_delta,
    })),
    min_complexity: me.min_complexity,
    repeatable: me.repeatable,
    cooldownMonths: me.cooldownMonths,
  };
}

function checkSkandalBedingung(state: GameState, event: MedienEventContent): boolean {
  if (event.trigger_type !== 'conditional') return true;
  if (event.id === 'medien_skandal_koalitionsleck') {
    return (state.koalitionspartner?.beziehung ?? 100) < 60;
  }
  if (event.id === 'medien_skandal_haushaltsloch') {
    const saldo = state.haushalt?.saldo ?? 0;
    return saldo < -10;
  }
  return true;
}

function checkPositivBedingung(state: GameState, event: MedienEventContent): boolean {
  if (event.trigger_type !== 'conditional') return true;
  if (event.id === 'medien_positiv_opp_fehler') {
    return (state.opposition?.staerke ?? 0) > 50;
  }
  return true;
}

function getMedienEventsPool(medienEvents: MedienEventContent[], subtype: 'skandal' | 'positiv'): MedienEventContent[] {
  return medienEvents.filter((e) => e.event_subtype === subtype);
}

function checkSkandale(
  state: GameState,
  content: ContentBundle,
  complexity: number,
): GameState {
  const pool = getMedienEventsPool(content.medienEvents ?? [], 'skandal');
  const eligible = pool.filter(
    (e) => {
      const ge = medienEventToGameEvent(e);
      return isEventAvailable(state, ge) &&
        e.min_complexity <= complexity &&
        state.month >= e.trigger_monat_min &&
        checkSkandalBedingung(state, e);
    },
  );

  // Zufriedener Innenminister (Mood ≥ 4) halbiert die Skandal-Chance —
  // Gegenstück zu seiner Sabotage bei Mood ≤ 1 (characters.ts)
  const innen = state.chars.find((c) => c.ressort === 'innen' && !c.ist_kanzler);
  const skandalChance =
    innen && innen.mood >= CHAR_BONUS_MOOD_MIN
      ? SKANDAL_CHANCE * INNEN_SKANDAL_SCHUTZ_FAKTOR
      : SKANDAL_CHANCE;

  if (eligible.length === 0 || nextRandom() >= skandalChance) return state;

  const event = eligible[Math.floor(nextRandom() * eligible.length)];
  const gameEvent = medienEventToGameEvent(event);

  let next: GameState = {
    ...state,
    letzterSkandal: state.month,
    skandaleGesamt: (state.skandaleGesamt ?? 0) + 1,
    ...recordEventFired(state, gameEvent),
    activeEvent: gameEvent,
    ...withPause(state, getAutoPauseLevel(gameEvent)),
  };

  if (featureActive(complexity, 'medien_akteure_2')) {
    next = applyAkteurReaktion(next, 'skandal', complexity, content, { skandalAlternativReichweitePlus: 3 });
  } else {
    next = { ...next, medienKlima: Math.max(0, (state.medienKlima ?? 55) + event.medienklima_delta) };
  }

  return next;
}

function checkPositiveMedienEvents(
  state: GameState,
  content: ContentBundle,
  complexity: number,
): GameState {
  if (state.activeEvent) return state;
  if (nextRandom() >= POSITIV_MEDIEN_CHANCE) return state;

  const pool = getMedienEventsPool(content.medienEvents ?? [], 'positiv');
  const eligible = pool.filter(
    (e) => {
      const ge = medienEventToGameEvent(e);
      return isEventAvailable(state, ge) &&
        e.min_complexity <= complexity &&
        state.month >= e.trigger_monat_min &&
        checkPositivBedingung(state, e);
    },
  );

  if (eligible.length === 0) return state;

  const event = eligible[Math.floor(nextRandom() * eligible.length)];
  const gameEvent = medienEventToGameEvent(event);

  return {
    ...state,
    ...recordEventFired(state, gameEvent),
    activeEvent: gameEvent,
    ...withPause(state, getAutoPauseLevel(gameEvent)),
  };
}

function tickOpposition(state: GameState, _complexity: number): GameState {
  let s = state;
  const opp = s.opposition ?? {
    staerke: 40,
    aktivesThema: null,
    letzterAngriff: 0,
  };

  const mk = s.medienKlima ?? 55;

  let newStaerke = opp.staerke;
  if (mk < 40) newStaerke = Math.min(100, newStaerke + 3);
  else if (mk > 60) newStaerke = Math.max(0, newStaerke - 2);

  s = {
    ...s,
    opposition: { ...opp, staerke: newStaerke },
  };

  if (newStaerke > 50 && s.month - opp.letzterAngriff >= 2) {
    const thema = waehleOppositionsThema();
    s = {
      ...s,
      opposition: {
        ...s.opposition!,
        aktivesThema: thema,
        letzterAngriff: s.month,
      },
    };
    s = triggerOppositionsEvent(s, thema);
  }

  return s;
}

function waehleOppositionsThema(): string {
  const themen = ['haushalt', 'koalition', 'politikfeld', 'sicherheit', 'wirtschaft'];
  return themen[Math.floor(nextRandom() * themen.length)];
}

function triggerOppositionsEvent(state: GameState, thema: string): GameState {
  return addLog(state, `Opposition greift an: Thema ${thema}`, 'r');
}

/** Monatlicher Medienklima-Tick: Drift, Opposition, Skandal-Check */
export function tickMedienKlima(
  state: GameState,
  content: ContentBundle,
  complexity: number,
): GameState {
  let s = state;

  if (featureActive(complexity, 'medien_akteure_2')) {
    s = expireMedienAkteurBuffs(s, s.month);
    s = { ...s, medienAkteure: mergeMedienAkteureState(s.medienAkteure, content, complexity) };
    s = tickAlternativReichweite(s, complexity, content);
  }

  const mk = s.medienKlima ?? 55;

  if (
    featureActive(complexity, 'medien_akteure_4') &&
    s.medienAkteure &&
    Object.keys(s.medienAkteure).length > 0
  ) {
    const ma = { ...s.medienAkteure! };
    const defs = getAkteurDefinitions(content);
    const active = activeMedienAkteurIds(complexity, defs);
    for (const id of active) {
      const cur = ma[id];
      if (!cur) continue;
      const st = cur.stimmung;
      const driftS = st > 0 ? -1 : st < 0 ? 1 : 0;
      ma[id] = { ...cur, stimmung: clamp(st + driftS, -100, 100) };
    }
    s = { ...s, medienAkteure: ma };
    s = { ...s, medienKlima: berechneMedianklima(s) };
  } else if (featureActive(complexity, 'medien_akteure_2') && s.medienAkteure && Object.keys(s.medienAkteure).length > 0) {
    const drift = mk > 50 ? -1 : mk < 50 ? 1 : 0;
    if (drift !== 0) {
      s = adjustMedienKlimaGlobal(s, drift, complexity, content);
    }
  } else {
    const drift = mk > 50 ? -1 : mk < 50 ? 1 : 0;
    s = { ...s, medienKlima: clamp(mk + drift, 0, 100) };
  }

  if (featureActive(complexity, 'opposition')) {
    s = tickOpposition(s, complexity);
  }

  if (featureActive(complexity, 'skandale')) {
    const letzterSkandal = s.letzterSkandal ?? 0;
    if (s.month - letzterSkandal >= 4) {
      s = checkSkandale(s, content, complexity);
    }
  }

  s = checkPositiveMedienEvents(s, content, complexity);

  return s;
}

/** Wendet Medienklima-Delta aus Event-Choice an (resolveEvent) */
export function applyMedienChoiceDelta(
  state: GameState,
  choice: EventChoice,
  complexity?: number,
  content?: ContentBundle,
): GameState {
  const delta = choice.medienklima_delta;
  if (delta == null || delta === 0) return state;

  const cx = complexity ?? state.complexity ?? 4;
  return adjustMedienKlimaGlobal(state, delta, cx, content);
}
