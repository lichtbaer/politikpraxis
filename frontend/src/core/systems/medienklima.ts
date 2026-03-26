/**
 * Medienklima-Engine (SMA-277, SMA-390 plurale Akteure)
 * Index-Berechnung, Framing, Skandale, Pressemitteilung, Opposition.
 */
import type { GameState, ContentBundle, MedienEventContent, GameEvent, EventChoice, Law } from '../types';
import { DEFAULT_MEDIEN_AKTEURE, type MedienAkteurContent } from '../../data/defaults/medienAkteure';
import { addLog } from '../engine';
import { withPause, getAutoPauseLevel } from '../eventPause';
import { featureActive } from './features';
import { verbrauchePK } from '../pk';
import { isEventAvailable, recordEventFired } from './eventUtils';
import { clamp, SKANDAL_CHANCE, POSITIV_MEDIEN_CHANCE } from '../constants';
import { getGesetzIdeologie } from './koalition';

/** Reaktionsdeltas je Akteur (Stimmung, Skandal: alternativ +3 Reichweite zusätzlich) */
const REAKTIONEN = {
  pressemitteilung: {
    oeffentlich: 3,
    boulevard: 1,
    qualitaet: 2,
    social: 0,
    konservativ: 1,
    alternativ: -1,
  },
  skandal: {
    oeffentlich: -5,
    boulevard: -15,
    qualitaet: -8,
    social: -20,
    konservativ: -3,
    alternativ: 3,
  },
  gesetz_progressiv: {
    oeffentlich: 2,
    boulevard: 0,
    qualitaet: -1,
    social: 3,
    konservativ: -5,
    alternativ: -2,
  },
  gesetz_konservativ: {
    oeffentlich: 1,
    boulevard: 1,
    qualitaet: 3,
    social: -2,
    konservativ: 8,
    alternativ: -1,
  },
  haushalt_krise: {
    oeffentlich: -3,
    boulevard: -5,
    qualitaet: -10,
    social: -3,
    konservativ: -3,
    alternativ: 2,
  },
} as const;

type ReaktionsKey = keyof typeof REAKTIONEN;

function getAkteurDefinitions(content: ContentBundle): MedienAkteurContent[] {
  return content.medienAkteureContent?.length ? content.medienAkteureContent : DEFAULT_MEDIEN_AKTEURE;
}

/** Aktive Akteur-IDs für diese Komplexitätsstufe */
export function activeMedienAkteurIds(complexity: number, defs: MedienAkteurContent[]): string[] {
  return defs.filter((d) => d.min_complexity <= complexity).map((d) => d.id);
}

/** Initialisiert Record aus Content-Definitionen (nur aktive Stufe) */
export function initMedienAkteureFromContent(content: ContentBundle, complexity: number): Record<string, { stimmung: number; reichweite: number }> {
  const defs = getAkteurDefinitions(content);
  const out: Record<string, { stimmung: number; reichweite: number }> = {};
  for (const d of defs) {
    if (d.min_complexity <= complexity) {
      out[d.id] = { stimmung: clamp(d.stimmung_start, -100, 100), reichweite: clamp(d.reichweite, 0, 100) };
    }
  }
  return out;
}

/** Stimmen so verschieben, dass berechneMedianklima dem Ziel entspricht (ohne Alternativ-Malus zu ändern). */
export function kalibriereMedienAkteureZuIndex(
  medienAkteure: NonNullable<GameState['medienAkteure']>,
  content: ContentBundle,
  complexity: number,
  zielIndex: number,
): NonNullable<GameState['medienAkteure']> {
  const defs = getAkteurDefinitions(content).filter((d) => d.min_complexity <= complexity);
  let ma = { ...medienAkteure };
  const totalR = defs.reduce((sum, d) => sum + (ma[d.id]?.reichweite ?? 0), 0);
  if (totalR <= 0) return ma;
  const s0 = defs.reduce(
    (sum, d) => sum + ((ma[d.id]?.stimmung ?? 0) * (ma[d.id]?.reichweite ?? 0)) / 100,
    0,
  );
  const targetS = 2 * (clamp(zielIndex, 0, 100) - 50);
  const h = (targetS - s0) / (totalR / 100);
  for (const d of defs) {
    const cur = ma[d.id];
    if (!cur) continue;
    ma[d.id] = { ...cur, stimmung: clamp(cur.stimmung + h, -100, 100) };
  }
  return ma;
}

/** Ergänzt fehlende Akteure (Save-Migration / Stufenaufstieg) */
export function mergeMedienAkteureState(
  current: GameState['medienAkteure'],
  content: ContentBundle,
  complexity: number,
): NonNullable<GameState['medienAkteure']> {
  const defs = getAkteurDefinitions(content);
  const next: NonNullable<GameState['medienAkteure']> = { ...(current ?? {}) };
  for (const d of defs) {
    if (d.min_complexity > complexity) continue;
    if (!next[d.id]) {
      next[d.id] = { stimmung: clamp(d.stimmung_start, -100, 100), reichweite: clamp(d.reichweite, 0, 100) };
    }
  }
  return next;
}

/**
 * SMA-390: gewichteter Medienindex aus Akteur-Stimmungen und Reichweiten.
 * Alternativ > 10 % Reichweite: permanenter Malus −5 auf den Index.
 */
export function berechneMedianklima(G: GameState): number {
  const akteure = G.medienAkteure;
  if (!akteure || Object.keys(akteure).length === 0) {
    return clamp(G.medienKlima ?? 55, 0, 100);
  }
  const gewichteteSumme = Object.entries(akteure).reduce((sum, [, a]) => {
    return sum + (a.stimmung * a.reichweite) / 100;
  }, 0);
  let v = 50 + gewichteteSumme / 2;
  const altR = akteure.alternativ?.reichweite ?? 0;
  if (altR > 10) v -= 5;
  return clamp(v, 0, 100);
}

/**
 * Globales Medienklima-Delta auf Stufe 2+ auf Akteur-Stimmungen verteilen
 * (gleicher Anstieg des gewichteten Terms wie direktes Ändern des Index).
 */
export function adjustMedienKlimaGlobal(
  state: GameState,
  delta: number,
  complexity: number,
  content?: ContentBundle,
): GameState {
  if (!featureActive(complexity, 'medien_akteure_2')) {
    return { ...state, medienKlima: clamp((state.medienKlima ?? 55) + delta, 0, 100) };
  }
  const bundle: ContentBundle = content ?? { medienAkteureContent: DEFAULT_MEDIEN_AKTEURE } as ContentBundle;
  let ma = mergeMedienAkteureState(state.medienAkteure, bundle, complexity);
  const defs = getAkteurDefinitions(bundle);
  const active = activeMedienAkteurIds(complexity, defs);
  const totalW = active.reduce((sum, id) => sum + (ma[id]?.reichweite ?? 0), 0);
  if (totalW <= 0 || active.length === 0) {
    return { ...state, medienKlima: clamp((state.medienKlima ?? 55) + delta, 0, 100) };
  }
  // Abgleich mit gespeichertem Index (ältere Saves / Events ohne Akteur-State)
  const zielVorDelta = state.medienKlima ?? berechneMedianklima({ ...state, medienAkteure: ma });
  ma = kalibriereMedienAkteureZuIndex(ma, bundle, complexity, zielVorDelta);
  const ds = (2 * delta * 100) / totalW;
  for (const id of active) {
    const cur = ma[id]!;
    ma = { ...ma, [id]: { ...cur, stimmung: clamp(cur.stimmung + ds, -100, 100) } };
  }
  const mk = berechneMedianklima({ ...state, medienAkteure: ma });
  return { ...state, medienAkteure: ma, medienKlima: mk };
}

function applyAkteurReaktion(
  state: GameState,
  key: ReaktionsKey,
  complexity: number,
  content: ContentBundle,
  options?: { skandalAlternativReichweitePlus?: number },
): GameState {
  if (!featureActive(complexity, 'medien_akteure_2')) return state;

  const defs = getAkteurDefinitions(content);
  const active = new Set(activeMedienAkteurIds(complexity, defs));
  let ma = mergeMedienAkteureState(state.medienAkteure, content, complexity);
  const row = REAKTIONEN[key];

  for (const id of active) {
    const dSt = row[id as keyof typeof row];
    if (dSt == null) continue;
    const cur = ma[id];
    if (!cur) continue;
    let reichweite = cur.reichweite;
    if (key === 'skandal' && id === 'alternativ' && options?.skandalAlternativReichweitePlus) {
      reichweite = clamp(reichweite + options.skandalAlternativReichweitePlus, 0, 15);
    }
    ma = {
      ...ma,
      [id]: { stimmung: clamp(cur.stimmung + dSt, -100, 100), reichweite },
    };
  }

  const next = { ...state, medienAkteure: ma };
  return { ...next, medienKlima: berechneMedianklima(next) };
}

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

function tickAlternativReichweite(state: GameState, complexity: number, content: ContentBundle): GameState {
  if (!featureActive(complexity, 'medien_akteure_4')) return state;
  const defs = getAkteurDefinitions(content);
  if (!activeMedienAkteurIds(complexity, defs).includes('alternativ')) return state;

  let ma = mergeMedienAkteureState(state.medienAkteure, content, complexity);
  const alt = ma.alternativ;
  if (!alt) return state;

  const genutzt = state.medienAktionenGenutzt?.alternativ ?? 0;
  const ignored = genutzt < state.month;
  if (!ignored) return state;

  const newR = clamp(alt.reichweite + 1, 0, 15);
  if (newR === alt.reichweite) return state;

  ma = { ...ma, alternativ: { ...alt, reichweite: newR } };
  const next = { ...state, medienAkteure: ma };
  return { ...next, medienKlima: berechneMedianklima(next) };
}

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
  content?: ContentBundle,
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

  newState = adjustMedienKlimaGlobal(newState, framing.medienklima_delta, complexity, content);

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

/** Monatlicher Medienklima-Tick: Drift, Opposition, Skandal-Check */
export function tickMedienKlima(
  state: GameState,
  content: ContentBundle,
  complexity: number,
): GameState {
  let s = state;

  if (featureActive(complexity, 'medien_akteure_2')) {
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
  content?: ContentBundle,
): GameState | null {
  if (!featureActive(complexity, 'pressemitteilung')) return null;
  if (state.letztesPressemitteilungMonat === state.month) return null;

  const pkResult = verbrauchePK(state, 5);
  if (!pkResult) return null;

  let s = pkResult;
  const bundle = content ?? ({ medienAkteureContent: DEFAULT_MEDIEN_AKTEURE } as ContentBundle);

  if (featureActive(complexity, 'medien_akteure_2')) {
    s = { ...s, medienAkteure: mergeMedienAkteureState(s.medienAkteure, bundle, complexity) };
    const mkVorher = berechneMedianklima(s);
    const wirkung = mkVorher < 30 ? 0.5 : 1.0;
    const legacyPresseDelta: Record<typeof thema, number> = {
      haushalt: 4,
      koalition: 3,
      politikfeld: 3,
      opposition: 5,
    };
    const zielMk = Math.min(100, mkVorher + Math.round(legacyPresseDelta[thema] * wirkung));
    const defs = getAkteurDefinitions(bundle);
    const active = activeMedienAkteurIds(complexity, defs);
    const row = REAKTIONEN.pressemitteilung;
    let ma = { ...s.medienAkteure! };
    for (const id of active) {
      const cur = ma[id];
      if (!cur) continue;
      const d = row[id as keyof typeof row];
      if (d == null) continue;
      const adj = Math.round(d * wirkung);
      ma[id] = { ...cur, stimmung: clamp(cur.stimmung + adj, -100, 100) };
    }
    s = { ...s, medienAkteure: ma, medienKlima: berechneMedianklima({ ...s, medienAkteure: ma }) };
    const mkNachAkteure = s.medienKlima ?? 55;
    const fehlend = zielMk - mkNachAkteure;
    if (Math.abs(fehlend) >= 0.01) {
      s = adjustMedienKlimaGlobal(s, fehlend, complexity, bundle);
    }
    s = {
      ...s,
      medienAktionenGenutzt: {
        ...(s.medienAktionenGenutzt ?? {}),
        oeffentlich: s.month,
        boulevard: s.month,
        social: s.month,
        ...(featureActive(complexity, 'medien_akteure_4') ? { alternativ: s.month } : {}),
      },
    };
  } else {
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
  }

  // Thema-spezifische Zusatz-Effekte (wie zuvor)
  if (featureActive(complexity, 'medien_akteure_2')) {
    switch (thema) {
      case 'haushalt':
        s = {
          ...s,
          chars: s.chars.map((c) =>
            c.id === 'fm' ? { ...c, mood: Math.min(4, c.mood + 1) } : c,
          ),
        };
        break;
      case 'koalition':
        s = {
          ...s,
          koalitionspartner: s.koalitionspartner
            ? { ...s.koalitionspartner, beziehung: Math.min(100, s.koalitionspartner.beziehung + 5) }
            : s.koalitionspartner,
        };
        break;
      case 'opposition':
        s = {
          ...s,
          opposition: s.opposition
            ? { ...s.opposition, staerke: Math.max(0, s.opposition.staerke - 5) }
            : s.opposition,
        };
        break;
      default:
        break;
    }
  }

  s = { ...s, letztesPressemitteilungMonat: s.month };
  return addLog(s, `Pressemitteilung: ${thema}`, 'hi');
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
  return themen[Math.floor(Math.random() * themen.length)];
}

function triggerOppositionsEvent(state: GameState, thema: string): GameState {
  return addLog(state, `Opposition greift an: Thema ${thema}`, 'r');
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
