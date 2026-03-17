/**
 * Medienklima-Engine (SMA-277)
 * Index-Berechnung, Framing, Skandale, Pressemitteilung, Opposition
 */
import type { GameState, ContentBundle, MedienEventContent } from '../types';
import { addLog } from '../engine';
import { featureActive } from './features';

/** Medienklima-Multiplikator für KPI-/Milieu-Effekte */
export function getMedienMultiplikator(medienKlima: number): number {
  if (medienKlima >= 70) return 1.15;
  if (medienKlima >= 40) return 1.0;
  if (medienKlima >= 20) return 0.85;
  return 0.7;
}

/** Monatlicher Medienklima-Tick: Drift, Opposition, Skandal-Check */
export function tickMedienKlima(
  state: GameState,
  content: ContentBundle,
  complexity: number,
): GameState {
  if (!featureActive(complexity, 'medienklima')) return state;

  let s = { ...state };
  const mk = s.medienKlima ?? 55;
  const letzterSkandal = s.letzterSkandal ?? 0;

  // Drift Richtung 50
  const drift = mk > 50 ? -1 : mk < 50 ? 1 : 0;
  const newMk = Math.max(0, Math.min(100, mk + drift));
  s = { ...s, medienKlima: newMk };

  // Extremwert: schlechtes Klima → PK-Basis-Kosten werden in getEinbringenPkKosten berücksichtigt
  // (kein globales pkBasisKosten, stattdessen Modifikator in parliament.einbringen)

  // Opposition
  if (featureActive(complexity, 'opposition')) {
    s = tickOpposition(s);
  }

  // Skandal-Check (mit 4-Monats-Cooldown)
  if (s.month - letzterSkandal >= 4) {
    s = checkSkandale(s, content, complexity);
  }

  // Positive Medienereignisse
  s = checkPositiveMedienEvents(s, content);

  return s;
}

/** Framing beim Gesetz-Einbringen anwenden */
export function applyFraming(
  state: GameState,
  gesetzId: string,
  framingKey: string | null,
  complexity: number,
): GameState {
  if (!framingKey || !featureActive(complexity, 'framing')) return state;

  const gesetz = state.gesetze.find((g) => g.id === gesetzId);
  if (!gesetz?.framing_optionen?.length) return state;

  const framing = gesetz.framing_optionen.find((f) => f.key === framingKey);
  if (!framing) return state;

  let s = { ...state };

  // Milieu-Effekte
  if (s.milieuZustimmung) {
    const milieuZustimmung = { ...s.milieuZustimmung };
    for (const [milieuId, delta] of Object.entries(framing.milieu_effekte)) {
      const current = milieuZustimmung[milieuId] ?? 50;
      milieuZustimmung[milieuId] = Math.max(0, Math.min(100, current + (delta as number)));
    }
    s = { ...s, milieuZustimmung };
  }

  // Verband-Effekte
  if (framing.verband_effekte && Object.keys(framing.verband_effekte).length > 0 && s.verbandsBeziehungen) {
    const verbandsBeziehungen = { ...s.verbandsBeziehungen };
    for (const [verbandId, delta] of Object.entries(framing.verband_effekte)) {
      const current = verbandsBeziehungen[verbandId] ?? 50;
      verbandsBeziehungen[verbandId] = Math.max(0, Math.min(100, current + (delta as number)));
    }
    s = { ...s, verbandsBeziehungen };
  }

  // Medienklima
  const currentMk = s.medienKlima ?? 55;
  s = { ...s, medienKlima: Math.max(0, Math.min(100, currentMk + framing.medienklima_delta)) };

  return addLog(s, `Framing: "${framing.key}" angewendet`, 'hi');
}

/** Skandal-Check mit Cooldown */
function checkSkandale(
  state: GameState,
  content: ContentBundle,
  complexity: number,
): GameState {
  if (!featureActive(complexity, 'skandale')) return state;
  if (state.activeEvent) return state;

  const pool = getMedienEventsPool(content, 'skandal');
  const fired = state.firedEvents ?? [];
  const complexityVal = content.politikfelder?.length ? 4 : 2;

  const eligible = pool.filter(
    (e) =>
      !fired.includes(e.id) &&
      e.min_complexity <= complexityVal &&
      state.month >= e.trigger_monat_min &&
      checkSkandalBedingung(state, e),
  );

  if (eligible.length === 0 || Math.random() >= 0.08) return state;

  const event = eligible[Math.floor(Math.random() * eligible.length)];
  const currentMk = state.medienKlima ?? 55;
  const newMk = Math.max(0, Math.min(100, currentMk + event.medienklima_delta));

  const s: GameState = {
    ...state,
    medienKlima: newMk,
    letzterSkandal: state.month,
    firedEvents: [...fired, event.id],
    activeEvent: medienEventToGameEvent(event),
    speed: 0,
  };
  return addLog(s, `Skandal: ${event.title}`, 'r');
}

/** Bedingung für Skandal-Trigger (conditional vs random) */
function checkSkandalBedingung(state: GameState, event: MedienEventContent): boolean {
  if (event.trigger_type === 'random') return true;
  if (event.trigger_type === 'conditional') {
    // Koalitionsleck: Koalitionspartner-Beziehung niedrig
    if (event.id === 'medien_skandal_koalitionsleck') {
      return (state.koalitionspartner?.beziehung ?? 50) < 40;
    }
    // Haushaltsloch: Haushalt defizitär
    if (event.id === 'medien_skandal_haushaltsloch') {
      return (state.haushalt?.saldo ?? 0) < -10;
    }
  }
  return false;
}

/** Positive Medienereignisse prüfen */
function checkPositiveMedienEvents(
  state: GameState,
  content: ContentBundle,
): GameState {
  if (state.activeEvent) return state;
  if (Math.random() >= 0.1) return state;

  const pool = getMedienEventsPool(content, 'positiv');
  const fired = state.firedEvents ?? [];
  const complexityVal = content.politikfelder?.length ? 4 : 2;

  const eligible = pool.filter(
    (e) =>
      !fired.includes(e.id) &&
      e.min_complexity <= complexityVal &&
      checkPositivBedingung(state, e),
  );

  if (eligible.length === 0) return state;

  const event = eligible[Math.floor(Math.random() * eligible.length)];
  return {
    ...state,
    firedEvents: [...fired, event.id],
    activeEvent: medienEventToGameEvent(event),
    speed: 0,
  };
}

function checkPositivBedingung(state: GameState, event: MedienEventContent): boolean {
  if (event.trigger_type === 'random') return true;
  if (event.trigger_type === 'conditional' && event.id === 'medien_positiv_opp_fehler') {
    return (state.opposition?.staerke ?? 40) > 50;
  }
  return false;
}

/** Opposition-Tick: Stärke-Anpassung, Angriffs-Events */
function tickOpposition(state: GameState): GameState {
  const opposition = state.opposition ?? { staerke: 40, aktivesThema: null, letzterAngriff: 0 };
  const mk = state.medienKlima ?? 55;

  let staerke = opposition.staerke;
  if (mk < 40) staerke = Math.min(100, staerke + 3);
  else if (mk > 60) staerke = Math.max(0, staerke - 2);

  let s: GameState = { ...state, opposition: { ...opposition, staerke } };

  // Oppositions-Aktion ab Stärke > 50 (1× pro 2 Monate)
  if (staerke > 50 && state.month - opposition.letzterAngriff >= 2) {
    const thema = waehleOppositionsThema();
    s = {
      ...s,
      opposition: {
        ...s.opposition!,
        aktivesThema: thema,
        letzterAngriff: state.month,
      },
    };
    s = triggerOppositionsEvent(s, thema);
  }

  return s;
}

function waehleOppositionsThema(): string {
  const themen = ['haushalt', 'koalition', 'politikfeld', 'korruption'];
  return themen[Math.floor(Math.random() * themen.length)];
}

function triggerOppositionsEvent(state: GameState, thema: string): GameState {
  return addLog(state, `Opposition greift an: Thema ${thema}`, 'r');
}

/** Medien-Event-Pool nach Subtyp */
function getMedienEventsPool(content: ContentBundle, subtype: 'skandal' | 'positiv'): MedienEventContent[] {
  const events = content.medienEvents ?? [];
  return events.filter((e) => e.event_subtype === subtype);
}

/** Medien-Event zu GameEvent konvertieren (für activeEvent) */
function medienEventToGameEvent(me: MedienEventContent): GameState['activeEvent'] {
  return {
    id: me.id,
    type: me.event_subtype === 'skandal' ? 'danger' : 'good',
    icon: me.event_subtype === 'skandal' ? '🔴' : '✅',
    typeLabel: me.event_subtype === 'skandal' ? 'Skandal' : 'Positiv',
    title: me.title,
    quote: me.quote,
    context: me.context,
    ticker: me.title,
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
  };
}

/** Pressemitteilung (Spieler-Aktion) — 1× pro Monat, 5 PK */
export function pressemitteilung(
  state: GameState,
  thema: 'haushalt' | 'koalition' | 'politikfeld' | 'opposition',
  complexity: number,
): GameState {
  if (!featureActive(complexity, 'pressemitteilung')) return state;
  if (state.letztesPressemitteilungMonat === state.month) return state;
  if (state.pk < 5) return state;

  const wirkung = (state.medienKlima ?? 55) < 30 ? 0.5 : 1.0;
  let s: GameState = { ...state, pk: state.pk - 5, letztesPressemitteilungMonat: state.month };

  const currentMk = s.medienKlima ?? 55;

  switch (thema) {
    case 'haushalt':
      s = { ...s, medienKlima: Math.min(100, currentMk + Math.round(4 * wirkung)) };
      s = {
        ...s,
        chars: s.chars.map((c) =>
          c.id === 'fm' ? { ...c, mood: Math.min(4, c.mood + 1) } : c,
        ),
      };
      break;
    case 'koalition':
      s = { ...s, medienKlima: Math.min(100, currentMk + Math.round(3 * wirkung)) };
      if (s.koalitionspartner) {
        s = {
          ...s,
          koalitionspartner: {
            ...s.koalitionspartner,
            beziehung: Math.min(100, s.koalitionspartner.beziehung + 5),
          },
        };
      }
      break;
    case 'politikfeld':
      s = { ...s, medienKlima: Math.min(100, currentMk + Math.round(3 * wirkung)) };
      // Feld-Druck -8 für gewähltes Feld — Spieler wählt Feld separat, hier nur Basis
      break;
    case 'opposition':
      s = { ...s, medienKlima: Math.min(100, currentMk + Math.round(5 * wirkung)) };
      if (s.opposition) {
        s = {
          ...s,
          opposition: {
            ...s.opposition,
            staerke: Math.max(0, s.opposition.staerke - 5),
          },
        };
      }
      break;
  }

  return addLog(s, `Pressemitteilung: ${thema}`, 'hi');
}
