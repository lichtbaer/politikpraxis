/**
 * Medienklima-Engine (SMA-277)
 * Index-Berechnung, Framing, Skandale, Pressemitteilung, Opposition.
 */
import type { GameState, ContentBundle, MedienEventContent, GameEvent, EventChoice } from '../types';
import { addLog } from '../engine';
import { withPause, getAutoPauseLevel } from '../eventPause';
import { featureActive } from './features';
import { verbrauchePK } from '../pk';
import { isEventAvailable, recordEventFired } from './eventUtils';
import { clamp, SKANDAL_CHANCE, POSITIV_MEDIEN_CHANCE } from '../constants';

/** Medienklima-Multiplikator: moduliert KPI-/Milieu-Effekte (linear: 0→0.7, 50→1.0, 100→1.3) */
export function getMedienMultiplikator(medienKlima: number): number {
  const clamped = Math.max(0, Math.min(100, medienKlima));
  return +(0.7 + (clamped / 100) * 0.6).toFixed(4);
}

/** Zusätzliche PK-Kosten bei schlechtem Medienklima (< 20) */
export function getMedienPkZusatzkosten(medienKlima: number): number {
  return medienKlima < 20 ? 3 : 0;
}

/** Wendet Framing beim Gesetz-Einbringen an */
export function applyFraming(
  state: GameState,
  gesetzId: string,
  framingKey: string | null,
  complexity: number,
): GameState {
  if (!framingKey || !featureActive(complexity, 'framing')) return state;

  const gesetz = state.gesetze.find((g) => g.id === gesetzId);
  const framingOptionen = gesetz?.framing_optionen ?? [];
  const framing = framingOptionen.find((f) => f.key === framingKey);
  if (!framing) return state;

  let newState = { ...state };

  if (framing.milieu_effekte && Object.keys(framing.milieu_effekte).length > 0) {
    const milieuZustimmung = { ...(newState.milieuZustimmung ?? {}) };
    for (const [milieuId, delta] of Object.entries(framing.milieu_effekte)) {
      const current = milieuZustimmung[milieuId] ?? 50;
      milieuZustimmung[milieuId] = clamp(current + (delta as number), 0, 100);
    }
    newState = { ...newState, milieuZustimmung };
  }

  if (framing.verband_effekte && Object.keys(framing.verband_effekte).length > 0) {
    const verbandsBeziehungen = { ...(newState.verbandsBeziehungen ?? {}) };
    for (const [verbandId, delta] of Object.entries(framing.verband_effekte)) {
      const current = verbandsBeziehungen[verbandId] ?? 50;
      verbandsBeziehungen[verbandId] = clamp(current + (delta as number), 0, 100);
    }
    newState = { ...newState, verbandsBeziehungen };
  }

  const mk = (newState.medienKlima ?? 55) + framing.medienklima_delta;
  newState = { ...newState, medienKlima: clamp(mk, 0, 100) };

  // SMA-322: Kein Log-Eintrag bei internen Keys (standard/keine) — sonst lesbares Label
  const label = framing.label ?? framing.key;
  if (framing.key === 'standard' || framing.key === 'keine' || !label || label === 'Kein Framing') {
    return newState;
  }
  return addLog(newState, `Framing „${label}" angewendet`, 'hi');
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

/** Prüft Skandal-Bedingung (conditional: z.B. Koalitionsleck bei Beziehung niedrig) */
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

/** Prüft Bedingung für positive Medien-Events */
function checkPositivBedingung(state: GameState, event: MedienEventContent): boolean {
  if (event.trigger_type !== 'conditional') return true;
  if (event.id === 'medien_positiv_opp_fehler') {
    return (state.opposition?.staerke ?? 0) > 50;
  }
  return true;
}

/** Holt Pool von Medien-Events nach Subtype */
function getMedienEventsPool(medienEvents: MedienEventContent[], subtype: 'skandal' | 'positiv'): MedienEventContent[] {
  return medienEvents.filter((e) => e.event_subtype === subtype);
}

/** Monatlicher Medienklima-Tick: Drift, Opposition, Skandal-Check */
export function tickMedienKlima(
  state: GameState,
  content: ContentBundle,
  complexity: number,
): GameState {
  let s = state;
  const mk = s.medienKlima ?? 55;

  // Drift Richtung 50
  const drift = mk > 50 ? -1 : mk < 50 ? 1 : 0;
  const newMk = clamp(mk + drift, 0, 100);
  s = { ...s, medienKlima: newMk };

  // Opposition
  if (featureActive(complexity, 'opposition')) {
    s = tickOpposition(s, complexity);
  }

  // Skandal-Check (mit Cooldown)
  if (featureActive(complexity, 'skandale')) {
    const letzterSkandal = s.letzterSkandal ?? 0;
    if (s.month - letzterSkandal >= 4) {
      s = checkSkandale(s, content, complexity);
    }
  }

  // Positive Medien-Events
  s = checkPositiveMedienEvents(s, content, complexity);

  return s;
}

/** Skandal-Check: 8% Chance bei eligible Events */
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

  if (eligible.length === 0 || Math.random() >= SKANDAL_CHANCE) return state;

  const event = eligible[Math.floor(Math.random() * eligible.length)];
  const newMk = Math.max(0, (state.medienKlima ?? 55) + event.medienklima_delta);
  const gameEvent = medienEventToGameEvent(event);

  const sk = (state.skandaleGesamt ?? 0) + 1;
  return {
    ...state,
    medienKlima: newMk,
    letzterSkandal: state.month,
    skandaleGesamt: sk,
    ...recordEventFired(state, gameEvent),
    activeEvent: gameEvent,
    ...withPause(state, getAutoPauseLevel(gameEvent)),
  };
}

/** Positive Medien-Events: 10% Chance */
function checkPositiveMedienEvents(
  state: GameState,
  content: ContentBundle,
  complexity: number,
): GameState {
  if (state.activeEvent) return state;
  if (Math.random() >= POSITIV_MEDIEN_CHANCE) return state;

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

  const event = eligible[Math.floor(Math.random() * eligible.length)];
  const gameEvent = medienEventToGameEvent(event);

  return {
    ...state,
    ...recordEventFired(state, gameEvent),
    activeEvent: gameEvent,
    ...withPause(state, getAutoPauseLevel(gameEvent)),
  };
}

/** Pressemitteilung (Spieler-Aktion): 1× pro Monat, 5 PK */
export function pressemitteilung(
  state: GameState,
  thema: 'haushalt' | 'koalition' | 'politikfeld' | 'opposition',
  complexity: number,
): GameState | null {
  if (!featureActive(complexity, 'pressemitteilung')) return null;
  if (state.letztesPressemitteilungMonat === state.month) return null;

  const pkResult = verbrauchePK(state, 5);
  if (!pkResult) return null;

  let s = pkResult;
  const wirkung = (s.medienKlima ?? 55) < 30 ? 0.5 : 1.0;
  const mk = s.medienKlima ?? 55;

  switch (thema) {
    case 'haushalt':
      s = {
        ...s,
        medienKlima: Math.min(100, mk + Math.round(4 * wirkung)),
        chars: s.chars.map((c) =>
          c.id === 'fm' ? { ...c, mood: Math.min(4, c.mood + 1) } : c,
        ),
      };
      break;
    case 'koalition':
      s = {
        ...s,
        medienKlima: Math.min(100, mk + Math.round(3 * wirkung)),
        koalitionspartner: s.koalitionspartner
          ? { ...s.koalitionspartner, beziehung: Math.min(100, s.koalitionspartner.beziehung + 5) }
          : s.koalitionspartner,
      };
      break;
    case 'politikfeld':
      s = { ...s, medienKlima: Math.min(100, mk + Math.round(3 * wirkung)) };
      // Feld-Druck -8: Spieler wählt Feld separat — hier nur Medienklima
      break;
    case 'opposition':
      s = {
        ...s,
        medienKlima: Math.min(100, mk + Math.round(5 * wirkung)),
        opposition: s.opposition
          ? { ...s.opposition, staerke: Math.max(0, s.opposition.staerke - 5) }
          : s.opposition,
      };
      break;
  }

  s = { ...s, letztesPressemitteilungMonat: s.month };
  return addLog(s, `Pressemitteilung: ${thema}`, 'hi');
}

/** Opposition-Tick: Stärke wächst/sinkt, Angriffs-Events */
function tickOpposition(state: GameState, _complexity: number): GameState {
  let s = state;
  const opp = s.opposition ?? {
    staerke: 40,
    aktivesThema: null,
    letzterAngriff: 0,
  };

  const mk = s.medienKlima ?? 55;

  // Stärke wächst/sinkt
  let newStaerke = opp.staerke;
  if (mk < 40) newStaerke = Math.min(100, newStaerke + 3);
  else if (mk > 60) newStaerke = Math.max(0, newStaerke - 2);

  s = {
    ...s,
    opposition: { ...opp, staerke: newStaerke },
  };

  // Oppositions-Aktion ab Stärke > 50 (1× pro 2 Monate)
  if (newStaerke > 50 && s.month - opp.letzterAngriff >= 2) {
    const thema = waehleOppositionsThema()
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

/** Wählt zufälliges Oppositions-Thema */
function waehleOppositionsThema(): string {
  const themen = ['haushalt', 'koalition', 'politikfeld', 'sicherheit', 'wirtschaft'];
  return themen[Math.floor(Math.random() * themen.length)];
}

/** Löst Oppositions-Event aus (abstrakt: Log-Eintrag) */
function triggerOppositionsEvent(state: GameState, thema: string): GameState {
  return addLog(state, `Opposition greift an: Thema ${thema}`, 'r');
}

/** Wendet Medienklima-Delta aus Event-Choice an (resolveEvent) */
export function applyMedienChoiceDelta(
  state: GameState,
  choice: EventChoice,
): GameState {
  const delta = choice.medienklima_delta;
  if (delta == null || delta === 0) return state;

  const mk = state.medienKlima ?? 55;
  return {
    ...state,
    medienKlima: clamp(mk + delta, 0, 100),
  };
}
