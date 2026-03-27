/**
 * Balance-Simulation mit der echten Game-Engine.
 * Führt Strategien gegen die echte tick()-Funktion aus.
 */
import { tick } from '../engine';
import { createInitialState } from '../state';
import { einbringen, lobbying, type EinbringenContext } from '../systems/parliament';
import { koalitionsrunde, prioritaetsgespraech } from '../systems/koalition';
import { pressemitteilung } from '../systems/medienklima';
import { medienkampagne } from '../systems/media';
import { kabinettsgespraech } from '../systems/characters';
import { regierungserklaerung } from '../systems/regierung';
import { verbandGespraech } from '../systems/verbaende';
import { wahlkampfRede, wahlkampfKoalition, wahlkampfMedienoffensive } from '../systems/wahlkampf';
import { lobbyFraktion } from '../systems/bundesrat';
import { startKommunalPilot } from '../systems/gesetzLebenszyklus';
import { laenderGipfel } from '../systems/ebeneActions';
import { vermittlungsausschuss } from '../systems/vermittlung';
import { resolveEvent } from '../systems/events';
import type { GameState, ContentBundle } from '../types';
import type { StrategyAction, Strategy } from './strategien';
import { LEGISLATUR_MONATE } from '../constants';

export interface SimResult {
  gewonnen: boolean;
  wahlprognose: number;
  saldo: number;
  koalition: number;
  monat: number;
  gesetze: number;
  crash: boolean;
  error?: string;
}

export interface AggregatedResult {
  n: number;
  gewinnRate: number;
  wahlprognose: { median: number; mittel: number; min: number; max: number; p10: number; p90: number };
  saldo: { median: number; min: number; max: number };
  crashes: number;
}

const DEFAULT_AUSRICHTUNG = { wirtschaft: -20, gesellschaft: -40, staat: -15 };

/**
 * SMA-403: Simuliert die Partner-Widerstand-Modals ohne UI — gleiche Logik wie gameStore
 * (hinweis/widerstand: „trotzdem“ mit Beziehungs-Malus; veto: Koalitionsrunde + Freigabe).
 */
function autoResolvePartnerWiderstandModal(
  state: GameState,
  content: ContentBundle,
  complexity: number,
): GameState {
  const pending = state.pendingPartnerWiderstand;
  if (!pending) return state;

  const baseCtx: EinbringenContext = {
    ausrichtung: DEFAULT_AUSRICHTUNG,
    complexity,
    gesetzRelationen: content.gesetzRelationen,
    content,
  };

  if (pending.intensitaet === 'veto') {
    if (state.pk < 15) {
      return { ...state, pendingPartnerWiderstand: undefined };
    }
    let s = koalitionsrunde(state, content, complexity);
    if (s.pk === state.pk) {
      return { ...state, pendingPartnerWiderstand: undefined };
    }
    s = {
      ...s,
      partnerWiderstandVetoFreigabeGesetzId: pending.lawId,
      pendingPartnerWiderstand: undefined,
    };
    return einbringen(s, pending.lawId, {
      ...baseCtx,
      framingKey: pending.framingKey ?? undefined,
    });
  }

  const kp = state.koalitionspartner;
  if (
    kp &&
    pending.koalitionsMalus !== 0 &&
    kp.beziehung + pending.koalitionsMalus < 28
  ) {
    return { ...state, pendingPartnerWiderstand: undefined };
  }

  return einbringen(state, pending.lawId, {
    ...baseCtx,
    framingKey: pending.framingKey ?? undefined,
    skipPartnerWiderstandCheck: true,
    partnerWiderstandKoalitionsMalus: pending.koalitionsMalus,
    fromPartnerWiderstandConfirm: true,
  });
}

/** Wendet eine Strategie-Aktion auf den GameState an */
function applyAction(
  state: GameState,
  action: StrategyAction,
  content: ContentBundle,
  complexity: number,
): GameState {
  switch (action.typ) {
    case 'einbringen': {
      const { gesetzId } = action;
      let s = einbringen(state, gesetzId, {
        ausrichtung: DEFAULT_AUSRICHTUNG,
        complexity,
        gesetzRelationen: content.gesetzRelationen,
        content,
      });
      s = autoResolvePartnerWiderstandModal(s, content, complexity);
      return s;
    }
    case 'lobbying':
      return lobbying(state, action.gesetzId);
    case 'koalitionsrunde':
      return koalitionsrunde(state, content, complexity);
    case 'pressemitteilung': {
      const result = pressemitteilung(state, 'haushalt', complexity, content);
      return result ?? state;
    }
    case 'fraktionssitzung':
      return fraktionssitzung(state, action.gesetzId);
    case 'medienkampagne':
      return medienkampagne(state, action.milieu);
    case 'kabinettsgespraech':
      return kabinettsgespraech(state, action.charId);
    case 'regierungserklaerung':
      return regierungserklaerung(state, complexity);
    case 'verbandGespraech':
      return verbandGespraech(state, action.verbandId, content.verbaende ?? [], complexity);
    case 'wahlkampfRede':
      return wahlkampfRede(state, action.milieuId, content, DEFAULT_AUSRICHTUNG, complexity);
    case 'wahlkampfKoalition':
      return wahlkampfKoalition(state, content, complexity);
    case 'wahlkampfMedienoffensive':
      return wahlkampfMedienoffensive(state, content, complexity);
    case 'lobbyFraktion':
      return lobbyFraktion(state, action.fraktionId, action.gesetzId, 1);
    case 'startKommunalPilot':
      return startKommunalPilot(state, action.gesetzId, action.stadttyp, undefined, complexity);
    case 'laenderGipfel':
      return laenderGipfel(state, complexity);
    case 'prioritaetsgespraech':
      return prioritaetsgespraech(state, action.gesetzId, complexity);
    case 'vermittlungsausschuss':
      return vermittlungsausschuss(state, action.gesetzId, complexity);
    case 'nichts':
      return state;
  }
}

/** Löst ein aktives Event automatisch auf (wählt die günstigste Option) */
function autoResolveEvent(state: GameState, complexity: number, content: ContentBundle): GameState {
  const event = state.activeEvent;
  if (!event || !event.choices || event.choices.length === 0) {
    return { ...state, activeEvent: null };
  }

  const resolveOpts = { complexity, contentBundle: content };

  // Wähle die Option mit den niedrigsten PK-Kosten, die wir uns leisten können
  const affordableChoices = event.choices.filter(c => state.pk >= (c.cost ?? 0));
  if (affordableChoices.length === 0) {
    // Kann sich keine Option leisten — nimm die billigste
    const cheapest = [...event.choices].sort((a, b) => (a.cost ?? 0) - (b.cost ?? 0))[0];
    return resolveEvent(state, event, cheapest, resolveOpts);
  }

  // Bevorzuge 'safe' Optionen, dann 'primary', dann 'danger'
  const prioritized = [...affordableChoices].sort((a, b) => {
    const prio = { safe: 0, primary: 1, danger: 2 };
    return (prio[a.type] ?? 1) - (prio[b.type] ?? 1);
  });

  return resolveEvent(state, event, prioritized[0], resolveOpts);
}

/** Führt eine einzelne 48-Monats-Simulation durch */
export function runSingleSim(
  content: ContentBundle,
  strategy: Strategy,
  complexity: number = 4,
): SimResult {
  try {
    let state = createInitialState(content, complexity, DEFAULT_AUSRICHTUNG);
    // Balance-Test: etwas niedrigere Schwelle als Standard 40–42 (Monte Carlo soll Erfolg messen, nicht nur Hardcore).
    state = { ...state, electionThreshold: 35 };

    for (let _month = 1; _month <= LEGISLATUR_MONATE; _month++) {
      // Wenn ein Event aktiv ist, zuerst auflösen
      if (state.activeEvent) {
        state = autoResolveEvent(state, complexity, content);
      }

      // Strategie wählt Aktion
      const action = strategy(state, content, complexity);

      // Aktion anwenden
      state = applyAction(state, action, content, complexity);

      // Engine-Tick (echte Engine!)
      state = tick(state, content, complexity, DEFAULT_AUSRICHTUNG);

      // Nach Tick: Event auflösen falls eines getriggert wurde
      if (state.activeEvent) {
        state = autoResolveEvent(state, complexity, content);
      }

      // Spielende prüfen
      if (state.gameOver) break;
    }

    const saldo = state.haushalt?.saldo ?? 0;

    return {
      gewonnen: state.won,
      wahlprognose: state.zust.g,
      saldo,
      koalition: state.coalition,
      monat: state.month,
      gesetze: state.gesetze.filter(g => g.status === 'beschlossen').length,
      crash: false,
    };
  } catch (e) {
    return {
      gewonnen: false,
      wahlprognose: 0,
      saldo: 0,
      koalition: 0,
      monat: 0,
      gesetze: 0,
      crash: true,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/** Aggregiert N Simulationsergebnisse */
export function aggregiere(ergebnisse: SimResult[]): AggregatedResult {
  const n = ergebnisse.length;
  const gewonnen = ergebnisse.filter(e => e.gewonnen).length;
  const crashes = ergebnisse.filter(e => e.crash).length;

  const prognosen = ergebnisse.filter(e => !e.crash).map(e => e.wahlprognose).sort((a, b) => a - b);
  const saldi = ergebnisse.filter(e => !e.crash).map(e => e.saldo).sort((a, b) => a - b);

  if (prognosen.length === 0) prognosen.push(0);
  if (saldi.length === 0) saldi.push(0);

  const median = (arr: number[]) => {
    const mid = Math.floor(arr.length / 2);
    return arr.length % 2 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
  };

  return {
    n,
    gewinnRate: gewonnen / n,
    wahlprognose: {
      median: median(prognosen),
      mittel: prognosen.reduce((a, b) => a + b, 0) / prognosen.length,
      min: prognosen[0],
      max: prognosen[prognosen.length - 1],
      p10: prognosen[Math.floor(prognosen.length * 0.1)] ?? prognosen[0],
      p90: prognosen[Math.floor(prognosen.length * 0.9)] ?? prognosen[prognosen.length - 1],
    },
    saldo: {
      median: median(saldi),
      min: saldi[0],
      max: saldi[saldi.length - 1],
    },
    crashes,
  };
}

/** Führt N Simulationen für eine Strategie durch und aggregiert */
export function monteCarlo(
  content: ContentBundle,
  strategy: Strategy,
  n: number = 200,
  complexity: number = 4,
): AggregatedResult {
  const ergebnisse: SimResult[] = [];
  for (let i = 0; i < n; i++) {
    ergebnisse.push(runSingleSim(content, strategy, complexity));
  }
  return aggregiere(ergebnisse);
}
