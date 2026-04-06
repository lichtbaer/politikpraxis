/**
 * EU-Engine (SMA-269): Klima-System, 3-Phasen-Ausweichroute, reaktive Richtlinien, Ratsvorsitz.
 */
import type { GameState, Verband, ContentBundle } from '../types';
import { addLog } from '../log';
import { verbrauchePK } from '../pk';
import { featureActive } from './features';
import { scheduleEffects } from './economy';
import { applyGesetzMedienAkteureNachBeschluss } from './medienklima';
import { nextRandom } from '../rng';

/** Default EU-Klima-Startwerte (Fallback wenn API nicht liefert) */
const DEFAULT_EU_KLIMA: Record<string, number> = {
  wirtschaft_finanzen: 55,
  arbeit_soziales: 45,
  umwelt_energie: 70,
  innere_sicherheit: 40,
  bildung_forschung: 35,
  gesundheit_pflege: 30,
  digital_infrastruktur: 65,
  landwirtschaft: 75,
  wirtschaft: 50,
  umwelt: 50,
  arbeit: 50,
};

function ensureEUState(state: GameState): GameState {
  if (state.eu) return state;
  return {
    ...state,
    eu: {
      klima: {},
      klimaSperre: {},
      ratsvorsitz: false,
      ratsvorsitzStartMonat: 0,
      ratsvorsitzPrioritaeten: [],
      umsetzungsfristen: [],
      foerdermittelBeantragt: [],
      aktiveRoute: null,
    },
  };
}

/** Initialisierung beim Spielstart (aus Content euKlimaStartwerte oder Defaults) */
export function initEUKlima(
  state: GameState,
  content: ContentBundle,
  complexity: number,
): GameState {
  if (!featureActive(complexity, 'eu_route') && !featureActive(complexity, 'eu_klima')) return state;
  const s = ensureEUState(state);

  if (!featureActive(complexity, 'eu_klima')) return s;

  const startwerte = content.euKlimaStartwerte ?? [];
  const politikfelder = content.politikfelder ?? [];
  const klima: Record<string, number> = {};

  if (startwerte.length > 0) {
    for (const sw of startwerte) {
      klima[sw.politikfeld_id] = sw.startwert;
    }
  } else {
    for (const pf of politikfelder) {
      klima[pf.id] = DEFAULT_EU_KLIMA[pf.id] ?? 50;
    }
    if (Object.keys(klima).length === 0) {
      for (const [id, val] of Object.entries(DEFAULT_EU_KLIMA)) {
        klima[id] = val;
      }
    }
  }

  return { ...s, eu: { ...s.eu!, klima, klimaSperre: s.eu!.klimaSperre } };
}

function getVerbandFuerFeld(verbaende: Verband[], feldId: string): Verband | undefined {
  return verbaende.find(v => v.politikfeld_id === feldId);
}

/** Monatlicher Drift des EU-Klima-Scores */
export function tickEUKlima(
  state: GameState,
  verbaende: Verband[],
  complexity: number,
): GameState {
  if (!featureActive(complexity, 'eu_klima')) return state;
  if (!state.eu?.klima) return state;

  const klima = { ...state.eu.klima };
  for (const feldId of Object.keys(klima)) {
    let drift = (nextRandom() - 0.5) * 0.4;
    const verband = getVerbandFuerFeld(verbaende, feldId);
    if (
      verband &&
      (state.verbandsBeziehungen?.[verband.id] ?? 0) > 70 &&
      (verband.staerke_eu ?? 0) >= 4
    ) {
      drift += 0.3;
    }
    klima[feldId] = Math.max(0, Math.min(100, klima[feldId] + drift));
  }

  return { ...state, eu: { ...state.eu, klima } };
}

/** Bewertung für EU-Route (PK-Kosten, Dauer, Erfolgschance) */
export function bewerteEURoute(
  state: GameState,
  gesetzId: string,
  _verbaende: Verband[],
  complexity: number,
): { pkKosten: number; dauer: number; erfolgschance: number } {
  const law = state.gesetze.find(g => g.id === gesetzId);
  if (!law) return { pkKosten: 28, dauer: 8, erfolgschance: 0.5 };

  const feldId = law.politikfeldId ?? 'wirtschaft_finanzen';
  const klima = state.eu?.klima?.[feldId] ?? 50;
  const baseCost = 28;
  const baseDauer = 8;
  const erfolgschance = 0.4 + (klima / 100) * 0.35;

  const mod = getRatsvorsitzModifikator(state, complexity);
  const pkKosten = Math.max(1, Math.round(baseCost * (1 - mod.pkRabatt)));
  const dauer = Math.max(2, baseDauer + mod.dauerBonus);

  return { pkKosten, dauer, erfolgschance };
}

function getStarksterEUVerband(
  gesetzId: string,
  verbaende: Verband[],
  state: GameState,
): Verband | undefined {
  const law = state.gesetze.find(g => g.id === gesetzId);
  const feldId = law?.politikfeldId;
  if (!feldId) return undefined;

  const kandidaten = verbaende.filter(
    v => v.politikfeld_id === feldId && (v.staerke_eu ?? 0) >= 4,
  );
  if (kandidaten.length === 0) return undefined;

  return kandidaten.reduce((best, v) => {
    const bezBest = state.verbandsBeziehungen?.[best.id] ?? best.beziehung_start;
    const bezV = state.verbandsBeziehungen?.[v.id] ?? v.beziehung_start;
    return bezV > bezBest ? v : best;
  });
}

/** Phase 1: EU-Route einleiten */
export function startEURoute(
  state: GameState,
  gesetzId: string,
  option: 'direkt' | 'verband' | 'bilateral',
  content: ContentBundle,
  complexity: number,
): GameState {
  if (!featureActive(complexity, 'eu_route')) return state;
  let s = ensureEUState(state);

  if (s.eu!.aktiveRoute) return s;

  const law = s.gesetze.find(g => g.id === gesetzId);
  if (!law || law.status !== 'entwurf') return s;

  const feldId = law.politikfeldId ?? 'wirtschaft_finanzen';
  const gesperrtBis = s.eu!.klimaSperre?.[feldId];
  if (gesperrtBis != null && s.month <= gesperrtBis) return s;

  const verbaende = content.verbaende ?? [];
  let bewertung = bewerteEURoute(s, gesetzId, verbaende, complexity);
  let pkKosten = bewertung.pkKosten;
  let dauer = bewertung.dauer;

  if (option === 'verband') {
    const verband = getStarksterEUVerband(gesetzId, verbaende, s);
    if (verband && (verband.staerke_eu ?? 0) >= 4) {
      pkKosten = Math.max(1, pkKosten - 5);
      const newBez = Math.max(0, (s.verbandsBeziehungen?.[verband.id] ?? verband.beziehung_start) - 2);
      s = { ...s, verbandsBeziehungen: { ...(s.verbandsBeziehungen ?? {}), [verband.id]: newBez } };
    }
  } else if (option === 'bilateral') {
    dauer += 3;
    bewertung = { ...bewertung, erfolgschance: Math.min(0.85, bewertung.erfolgschance + 0.15) };
  }

  const next = verbrauchePK(s, pkKosten);
  if (!next) return s;

  const gesetze = next.gesetze.map(g =>
    g.id === gesetzId ? { ...g, status: 'ausweich' as const, route: 'eu' as const, rprog: 0, rdur: dauer } : g,
  );

  const newEu = {
    ...next.eu!,
    aktiveRoute: {
      gesetzId,
      phase: 2 as const,
      startMonat: next.month,
      dauer,
      erfolgschance: bewertung.erfolgschance,
      verwässert: false,
    },
  };

  return addLog(
    { ...next, gesetze, eu: newEu },
    `EU-Route gestartet: ${law.kurz} — Ergebnis in ${dauer} Monaten`,
    'g',
  );
}

/** Phase 2: Optionale Intervention während Ratsdebatte (10 PK → Klima +8, Erfolgschance +5%) */
export function euLobbyingRunde(
  state: GameState,
  gesetzId: string,
  complexity: number,
): GameState {
  if (!featureActive(complexity, 'eu_route')) return state;
  if (!state.eu?.aktiveRoute || state.eu.aktiveRoute.gesetzId !== gesetzId) return state;

  const next = verbrauchePK(state, 10);
  if (!next) return state;

  const law = next.gesetze.find(g => g.id === gesetzId);
  const feldId = law?.politikfeldId ?? 'wirtschaft_finanzen';
  const klima = { ...(next.eu!.klima ?? {}), [feldId]: Math.min(100, (next.eu!.klima[feldId] ?? 50) + 8) };
  const route = {
    ...next.eu!.aktiveRoute!,
    erfolgschance: Math.min(0.85, next.eu!.aktiveRoute!.erfolgschance + 0.05),
  };

  return addLog(
    {
      ...next,
      eu: { ...next.eu!, klima, aktiveRoute: route },
    },
    'EU-Lobbying-Runde: Klima +8, Erfolgschance +5%',
    'g',
  );
}

/** Phase 2: Kompromiss anbieten (Wirkung -15%, Erfolgschance +20%) */
export function euKompromissAnbieten(state: GameState, gesetzId: string, complexity: number): GameState {
  if (!featureActive(complexity, 'eu_route')) return state;
  if (!state.eu?.aktiveRoute || state.eu.aktiveRoute.gesetzId !== gesetzId) return state;

  const route = {
    ...state.eu.aktiveRoute,
    verwässert: true,
    erfolgschance: Math.min(0.85, state.eu.aktiveRoute.erfolgschance + 0.2),
  };

  return addLog(
    { ...state, eu: { ...state.eu, aktiveRoute: route } },
    'EU-Kompromiss: Wirkung -15%, Erfolgschance +20%',
    'g',
  );
}

function berechneKofinanzierung(feldId: string, state: GameState): number {
  const klima = state.eu?.klima?.[feldId] ?? 50;
  return Math.min(0.5, 0.1 + (klima / 100) * 0.4);
}

/** Kofinanzierungs-Log (exportiert für Vorstufen-Boni in parliament) */
export function applyEUKofinanzierung(state: GameState, kofinanzierung: number): GameState {
  return addLog(state, `Kofinanzierung: ${(kofinanzierung * 100).toFixed(0)}%`, 'g');
}

/** Phase 3: Abstimmungsergebnis auflösen (wird vom Tick aufgerufen wenn Dauer abgelaufen) */
export function resolveEURoute(
  state: GameState,
  content?: ContentBundle,
  complexity?: number,
): GameState {
  const route = state.eu?.aktiveRoute;
  if (!route) return state;

  const gesetz = state.gesetze.find(g => g.id === route.gesetzId);
  if (!gesetz) return state;

  const feldId = gesetz.politikfeldId ?? 'wirtschaft_finanzen';
  const erfolg = nextRandom() < route.erfolgschance;

  let s = { ...state };
  const klima = { ...(s.eu!.klima ?? {}) };
  const klimaSperre = { ...(s.eu!.klimaSperre ?? {}) };
  const umsetzungsfristen = [...(s.eu!.umsetzungsfristen ?? [])];

  if (erfolg) {
    const kofinanzierung = berechneKofinanzierung(feldId, s);
    let effekte = gesetz.effekte as Record<string, number>;
    if (route.verwässert) {
      effekte = Object.fromEntries(
        Object.entries(effekte).map(([k, v]) => [k, (v ?? 0) * 0.85]),
      );
    }
    const lawForEffects = { effekte, lag: gesetz.lag, kurz: gesetz.kurz, gesetzId: route.gesetzId };
    s = scheduleEffects(s, lawForEffects);
    s = applyEUKofinanzierung(s, kofinanzierung);

    klima[feldId] = Math.min(100, (klima[feldId] ?? 50) + 10);
    umsetzungsfristen.push({
      gesetzId: route.gesetzId,
      feldId,
      fristMonat: s.month + 4,
      umgesetzt: false,
    });

    const gesetze = s.gesetze.map(g =>
      g.id === route.gesetzId ? { ...g, status: 'beschlossen' as const } : g,
    );
    s = { ...s, gesetze, eu: { ...s.eu!, klima, klimaSperre, umsetzungsfristen, aktiveRoute: null } };
    const cx = complexity ?? s.complexity ?? 4;
    if (content) {
      const lawDone = s.gesetze.find(g => g.id === route.gesetzId);
      if (lawDone) {
        s = applyGesetzMedienAkteureNachBeschluss(s, lawDone, cx, content);
      }
    }
    s = addLog(
      s,
      `EU-Richtlinie beschlossen. Kofinanzierung: ${(kofinanzierung * 100).toFixed(0)}%`,
      'g',
    );
  } else {
    klima[feldId] = Math.max(0, (klima[feldId] ?? 50) - 5);
    klimaSperre[feldId] = s.month + 12;
    const gesetze = s.gesetze.map(g =>
      g.id === route.gesetzId ? { ...g, status: 'entwurf' as const, route: null, rprog: 0, rdur: 0 } : g,
    );
    s = addLog(
      { ...s, gesetze, eu: { ...s.eu!, klima, klimaSperre, aktiveRoute: null } },
      'EU-Route gescheitert. 12 Monate Sperrfrist.',
      'r',
    );
  }

  return s;
}

/** Ratsvorsitz-Boni (PK-Rabatt, Dauer-Bonus) */
export function getRatsvorsitzModifikator(
  state: GameState,
  complexity: number,
): { pkRabatt: number; dauerBonus: number } {
  if (!featureActive(complexity, 'eu_ratsvorsitz')) return { pkRabatt: 0, dauerBonus: 0 };
  if (!state.eu?.ratsvorsitz) return { pkRabatt: 0, dauerBonus: 0 };
  return { pkRabatt: 0.3, dauerBonus: -2 };
}

/** Ratsvorsitz-Prioritäten setzen (Spieler-Aktion, 2 Politikfeld-IDs) */
export function setRatsvorsitzPrioritaeten(
  state: GameState,
  feldIds: string[],
  content: ContentBundle,
  complexity: number,
): GameState {
  if (!featureActive(complexity, 'eu_ratsvorsitz')) return state;
  if (feldIds.length !== 2) return state;

  const s = ensureEUState(state);
  const klima = { ...(s.eu!.klima ?? {}) };
  const verbaende = content.verbaende ?? [];
  const beziehungen = { ...(s.verbandsBeziehungen ?? {}) };

  for (const feldId of feldIds) {
    klima[feldId] = Math.min(100, (klima[feldId] ?? 50) + 15);
    const verband = getVerbandFuerFeld(verbaende, feldId);
    if (verband) {
      beziehungen[verband.id] = Math.min(100, (beziehungen[verband.id] ?? verband.beziehung_start) + 8);
    }
  }

  return {
    ...s,
    eu: { ...s.eu!, klima, ratsvorsitzPrioritaeten: feldIds },
    verbandsBeziehungen: beziehungen,
  };
}

function triggerEUEvent(state: GameState, eventId: string): GameState {
  return addLog(state, `EU-Event: ${eventId}`, 'info');
}

function getEUEventsPool(content: ContentBundle): { id: string; politikfeld_id: string | null; trigger_klima_min: number | null; min_complexity: number }[] {
  return content.euEvents ?? [];
}

/** Umsetzungsfristen: Bei Erreichen der Frist als umgesetzt markieren */
function checkUmsetzungsfristen(state: GameState): GameState {
  if (!state.eu?.umsetzungsfristen?.length) return state;

  const umsetzungsfristen = state.eu.umsetzungsfristen.map(u =>
    !u.umgesetzt && state.month >= u.fristMonat ? { ...u, umgesetzt: true } : u,
  );
  if (umsetzungsfristen === state.eu.umsetzungsfristen) return state;
  return { ...state, eu: { ...state.eu!, umsetzungsfristen } };
}

/** Vertragsverletzungsverfahren: Frist überschritten → Event */
function checkVertragsverletzung(state: GameState): GameState {
  if (!state.eu?.umsetzungsfristen) return state;

  const ueberschritten = state.eu.umsetzungsfristen.filter(
    u => !u.umgesetzt && state.month > u.fristMonat,
  );
  if (ueberschritten.length === 0) return state;

  const fired = state.firedEvents ?? [];
  if (fired.includes('vertragsverletzung')) return state;

  return addLog(
    {
      ...state,
      firedEvents: [...fired, 'vertragsverletzung'],
    },
    'Vertragsverletzungsverfahren: Umsetzungsfrist überschritten',
    'r',
  );
}

/** Monatlicher Check: Europawahl, Ratsvorsitz, Random-Events, Vertragsverletzung */
export function checkEUEreignisse(
  state: GameState,
  content: ContentBundle,
  complexity: number,
): GameState {
  if (!featureActive(complexity, 'eu_reaktiv')) return state;
  let s: GameState = ensureEUState(state);

  const fired = s.firedEvents ?? [];

  // Europawahl: fix in Monat 12
  if (s.month === 12 && !fired.includes('europawahl')) {
    s = triggerEUEvent(s, 'europawahl');
    s = { ...s, firedEvents: [...s.firedEvents, 'europawahl'] };
  }

  // Ratsvorsitz: Start in Monat 6 oder 30 (beim Init zufällig)
  if (s.eu!.ratsvorsitzStartMonat > 0 && s.month === s.eu!.ratsvorsitzStartMonat && !s.eu!.ratsvorsitz) {
    s = { ...s, eu: { ...s.eu!, ratsvorsitz: true } };
    s = triggerEUEvent(s, 'ratsvorsitz_beginn');
  }
  if (s.eu!.ratsvorsitz && s.eu!.ratsvorsitzStartMonat > 0 && s.month === s.eu!.ratsvorsitzStartMonat + 6) {
    s = { ...s, eu: { ...s.eu!, ratsvorsitz: false } };
    s = addLog(s, 'Ratsvorsitz beendet.', 'g');
  }

  // Random EU-Events
  if (featureActive(complexity, 'eu_events_voll') && nextRandom() < 0.08) {
    const pool = getEUEventsPool(content);
    const eligible = pool.filter(
      e =>
        !s.firedEvents.includes(e.id) &&
        e.min_complexity <= complexity &&
        (e.trigger_klima_min == null ||
          (s.eu!.klima[e.politikfeld_id ?? ''] ?? 0) >= e.trigger_klima_min),
    );
    if (eligible.length > 0) {
      const event = eligible[Math.floor(nextRandom() * eligible.length)];
      s = triggerEUEvent(s, event.id);
      s = { ...s, firedEvents: [...s.firedEvents, event.id] };
    }
  }

  s = checkUmsetzungsfristen(s);
  s = checkVertragsverletzung(s);

  return s;
}

/** Prüft ob aktive EU-Route abgelaufen ist und löst sie auf */
export function advanceEURoute(
  state: GameState,
  content?: ContentBundle,
  complexity?: number,
): GameState {
  const route = state.eu?.aktiveRoute;
  if (!route) return state;

  if (state.month >= route.startMonat + route.dauer) {
    return resolveEURoute(state, content, complexity);
  }
  return state;
}
