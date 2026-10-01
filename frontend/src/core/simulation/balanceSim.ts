/**
 * Balance-Simulation mit der echten Game-Engine.
 * Führt Strategien gegen die echte tick()-Funktion aus.
 */
import { tick } from '../engine';
import { createInitialState } from '../state';
import { lobbying, fraktionssitzung } from '../systems/parliament/parliament';
import { koalitionsrunde, prioritaetsgespraech } from '../systems/koalition';
import {
  einbringenCommand,
  einbringenPkKosten,
  gegenfinanzierungAuswaehlenCommand,
  partnerWiderstandTrotzdemCommand,
  partnerWiderstandKoalitionsverhandlungCommand,
} from '../commands/einbringen';
import { berechneOptionen, type GegenfinanzierungsOption } from '../systems/economics/gegenfinanzierung';
import { spielerAgendaZielAnzahl } from '../onboardingAgenda';
import { pressemitteilung } from '../systems/medien/medienAktionen';
import { medienkampagne } from '../systems/medien/media';
import { kabinettsgespraech } from '../systems/kabinett/characters';
import { regierungserklaerung } from '../systems/institutions/regierung';
import { verbandGespraech } from '../systems/verbaende';
import { wahlkampfRede, wahlkampfKoalition, wahlkampfMedienoffensive } from '../systems/election/wahlkampf';
import { lobbyFraktion } from '../systems/institutions/bundesrat';
import { startKommunalPilot } from '../systems/legislation/gesetzLebenszyklus';
import { laenderGipfel } from '../systems/ebeneActions';
import { vermittlungsausschuss } from '../systems/legislation/vermittlung';
import { resolveEvent } from '../systems/events/events';
import type { GameState, ContentBundle, SpielendeGrund } from '../types';
import { legislaturMisserfolgGrund, type LegislaturMisserfolgGrund } from '../spielziel';
import type { StrategyAction, Strategy } from './strategien';
import {
  LEGISLATUR_MONATE,
  ELECTION_THRESHOLDS_BY_COMPLEXITY,
  DEFAULT_ELECTION_THRESHOLD,
  berechnePkRegen,
} from '../constants';

/**
 * #482: Grund für eine Niederlage — entweder das vorzeitige Spielende aus
 * `state.spielendeGrund` oder, bei regulärem Legislaturende, der verfehlte Teil des
 * Spielziels (`legislaturMisserfolgGrund`).
 */
export type VerlustGrund = Exclude<SpielendeGrund, 'legislatur'> | LegislaturMisserfolgGrund;

export interface SimResult {
  gewonnen: boolean;
  wahlprognose: number;
  saldo: number;
  koalition: number;
  monat: number;
  gesetze: number;
  crash: boolean;
  error?: string;
  engineErrors: number;
  engineErrorDetails?: string[];
  /** SMA-BalanceTests: Scoring-Dimensionen aus spielziel */
  bilanzPunkte?: number;
  agendaPunkte?: number;
  urteilPunkte?: number;
  wahlbonus?: number;
  gesamtpunkte?: number;
  /** Ob die Wahlhürde überschritten wurde (unabhängig von legislaturErfolg) */
  wahlUeberHuerde?: boolean;
  /** Grund für Niederlage falls !gewonnen (#482: aus state.spielendeGrund bzw. Spielziel) */
  verlustGrund?: VerlustGrund;
  /** Ressourcen-Balance: PK am Legislaturende */
  pkEnde: number;
  /** Anzahl Monate mit PK < 10 (Dauerbankrott-Indikator) */
  pkKnappeMonate: number;
  /** Kumulierter zustimmungsabhängiger PK-Regen über die Legislatur */
  pkRegenSumme: number;
  /** Zufriedenheits-KPI am Legislaturende (Spiral-Indikator) */
  zfEnde: number;
  /**
   * Längste Folge von Monaten, in denen die Strategie dasselbe Gesetz mit ausreichend PK
   * einbringen wollte und es danach noch im Entwurf lag (Deadlock-Indikator).
   */
  einbringenHaengerMax: number;
}

export interface AggregatedResult {
  n: number;
  gewinnRate: number;
  wahlprognose: { median: number; mittel: number; min: number; max: number; p10: number; p90: number; p25: number; p75: number };
  saldo: { median: number; min: number; max: number };
  crashes: number;
  engineErrors: number;
  /** Gesammelte Engine-Fehler-Details aller Runs (für Testdiagnostik) */
  engineErrorDetails?: string[];
  /** Anteil der Runs mit Wahlsieg (wahlUeberHuerde) */
  wahlUeberHuerdeRate: number;
  /** Mediane Scoring-Dimensionen (nur nicht-gecrashhte Runs) */
  gesamtpunkte: { median: number; min: number; max: number };
  bilanzPunkte: { median: number };
  agendaPunkte: { median: number };
  urteilPunkte: { median: number };
  /** Ressourcen-Balance-Metriken (Mediane über nicht-gecrashte Runs) */
  pkEnde: { median: number };
  pkKnappeMonate: { median: number };
  pkRegenSumme: { median: number };
  zfEnde: { median: number };
  /** Beschlossene Gesetze am Legislaturende (Median, nicht-gecrashte Runs) */
  gesetze: { median: number };
  /** Längster Einbringen-Hänger über alle Runs (Monate) */
  einbringenHaengerMax: number;
  /** Verlustgrund-Verteilung über alle Niederlagen (häufigster + Zählung) */
  verlustGrund: {
    haeufigster: VerlustGrund | null;
    counts: Record<VerlustGrund, number>;
  };
}

const DEFAULT_AUSRICHTUNG = { wirtschaft: -20, gesellschaft: -40, staat: -15 };

/** Unter dieser Partnerbeziehung wählt die Sim Event-Optionen partnerfreundlich. */
const PARTNER_KRITISCH = 30;
/** Unter dieser Partnerbeziehung räumt die Sim Partner-Widerstand per Koalitionsrunde aus. */
const PARTNER_ANGESPANNT = 50;

/**
 * Löst pendingPartnerWiderstand in der Simulation automatisch auf (ohne UI).
 * Veto: Koalitionsrunde (bringt direkt ein). Widerstand: Koalitionsrunde, wenn die Beziehung
 * angespannt ist und das PK reicht, sonst „Trotzdem“. Hinweis: „Trotzdem“.
 * Reicht das PK beim Veto nicht, bricht die Sim ab („Später“ im Modal).
 */
function autoResolvePartnerWiderstand(
  state: GameState,
  content: ContentBundle,
  complexity: number,
): GameState {
  const pending = state.pendingPartnerWiderstand;
  if (!pending) return state;
  const input = { ausrichtung: DEFAULT_AUSRICHTUNG, complexity, content };

  const runde =
    pending.intensitaet === 'veto' ||
    (pending.intensitaet === 'widerstand' &&
      (state.koalitionspartner?.beziehung ?? 100) < PARTNER_ANGESPANNT &&
      state.pk >= 15 + einbringenPkKosten(state, pending.lawId, DEFAULT_AUSRICHTUNG, complexity));
  if (runde) {
    const { state: s } = partnerWiderstandKoalitionsverhandlungCommand(state, input);
    return { ...s, pendingPartnerWiderstand: undefined };
  }
  return partnerWiderstandTrotzdemCommand(state, input).state;
}

/** Reihenfolge, in der die Sim Gegenfinanzierungen wählt: erst die ohne Nebenwirkungen. */
const GF_PRAEFERENZ: GegenfinanzierungsOption['key'][] = [
  'ueberschuss',
  'schulden',
  'ministerium_kuerzen',
  'steuergesetz',
];

/**
 * Löst pendingGegenfinanzierung automatisch auf: erste verfügbare Option nach
 * GF_PRAEFERENZ, bei Ressortkürzung das kleinste ausreichende Ressort, bei Steuergesetzen
 * alle angebotenen. Ohne verfügbare Option bricht die Sim ab (Modal schließen) —
 * sonst bliebe der pending-State stehen und das Gesetz wäre für die Sim gesperrt.
 */
function autoResolveGegenfinanzierung(
  state: GameState,
  content: ContentBundle,
  complexity: number,
): GameState {
  const pending = state.pendingGegenfinanzierung;
  if (!pending) return state;
  const law = state.gesetze.find(g => g.id === pending.gesetzId);
  if (!law) return { ...state, pendingGegenfinanzierung: undefined };

  const optionen = berechneOptionen(state, law, content, complexity).filter(o => o.verfuegbar);
  for (const key of GF_PRAEFERENZ) {
    const option = optionen.find(o => o.key === key);
    if (!option) continue;
    let subOption: string | undefined;
    if (key === 'ministerium_kuerzen') {
      const ressorts = (option.suboptionen ?? [])
        .filter((o): o is { ressort: string; kosten_einsparung?: number } => typeof o.ressort === 'string')
        .sort((a, b) => (a.kosten_einsparung ?? 0) - (b.kosten_einsparung ?? 0));
      subOption = ressorts[0]?.ressort;
    } else if (key === 'steuergesetz') {
      subOption = (option.suboptionen ?? [])
        .map(o => ('gesetzId' in o ? o.gesetzId : undefined))
        .filter((id): id is string => typeof id === 'string')
        .join(',');
    }
    if ((key === 'ministerium_kuerzen' || key === 'steuergesetz') && !subOption) continue;
    const { state: s } = gegenfinanzierungAuswaehlenCommand(state, {
      gesetzId: pending.gesetzId,
      option,
      subOption,
      ausrichtung: DEFAULT_AUSRICHTUNG,
      complexity,
      content,
    });
    return s;
  }
  return { ...state, pendingGegenfinanzierung: undefined };
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
      // Reicht das PK nicht, ist der Button im Spiel gesperrt — kein Modal, keine Gegenfinanzierung.
      if (state.pk < einbringenPkKosten(state, gesetzId, DEFAULT_AUSRICHTUNG, complexity)) return state;
      const { state: s1 } = einbringenCommand(state, {
        lawId: gesetzId,
        ausrichtung: DEFAULT_AUSRICHTUNG,
        complexity,
        content,
      });
      // Modals in der Reihenfolge abarbeiten, in der die Engine sie öffnet
      // (Gegenfinanzierung ↔ Partner-Widerstand können einander nachziehen).
      let s = s1;
      for (let i = 0; i < 4 && (s.pendingGegenfinanzierung || s.pendingPartnerWiderstand); i++) {
        s = s.pendingGegenfinanzierung
          ? autoResolveGegenfinanzierung(s, content, complexity)
          : autoResolvePartnerWiderstand(s, content, complexity);
      }
      return { ...s, pendingGegenfinanzierung: undefined, pendingPartnerWiderstand: undefined };
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

  // Bevorzuge 'safe' Optionen, dann 'primary', dann 'danger'. Steht die Partnerbeziehung
  // kurz vor dem Bruch, zählt zuerst, was ihr hilft — ein Spieler sieht die Warnung und
  // wählt nicht stur die sichere Option, die den Partner weiter verärgert.
  const partnerKritisch = (state.koalitionspartner?.beziehung ?? 100) < PARTNER_KRITISCH;
  const partnerEffekt = (c: (typeof affordableChoices)[number]) =>
    partnerKritisch ? (c.koalitionspartnerBeziehung ?? 0) : 0;
  const prioritized = [...affordableChoices].sort((a, b) => {
    const prio = { safe: 0, primary: 1, danger: 2 };
    return partnerEffekt(b) - partnerEffekt(a) || (prio[a.type] ?? 1) - (prio[b.type] ?? 1);
  });

  return resolveEvent(state, event, prioritized[0], resolveOpts);
}

/**
 * #482: Verlustgrund eines beendeten Laufs (`undefined` bei Sieg).
 * Vorzeitiges Ende → der gespeicherte `state.spielendeGrund`; reguläres Legislaturende
 * (bzw. Schleife bis Monat 48 durchgelaufen) → verfehlter Teil des Spielziels via
 * `legislaturMisserfolgGrund`, Fallback `punkte` ohne Spielziel.
 */
export function bestimmeVerlustGrund(
  state: GameState,
  gewonnen: boolean,
  complexity: number,
): VerlustGrund | undefined {
  if (gewonnen) return undefined;
  const grund = state.spielendeGrund;
  if (grund && grund !== 'legislatur') return grund;
  return (state.spielziel ? legislaturMisserfolgGrund(state.spielziel, complexity) : null) ?? 'punkte';
}

/** Führt eine einzelne 48-Monats-Simulation durch */
export function runSingleSim(
  content: ContentBundle,
  strategy: Strategy,
  complexity: number = 4,
  spielerAgendaIds?: string[],
): SimResult {
  try {
    let state = createInitialState(content, complexity, DEFAULT_AUSRICHTUNG);
    // Reale Wahlhürde der simulierten Stufe — die Sim soll messen, was Spieler tatsächlich erleben.
    state = {
      ...state,
      electionThreshold: ELECTION_THRESHOLDS_BY_COMPLEXITY[complexity] ?? DEFAULT_ELECTION_THRESHOLD,
    };
    // SMA-269: Spieler-Agenda setzen (die UI tut dies im Onboarding via setSpielerAgendaIds;
    // die Sim ruft den Store nicht auf, daher hier direkt am State — sonst bleibt die
    // Agenda-Säule des Spielziels konstant beim Default-Wert, egal welche Strategie spielt).
    // Wie im Onboarding: so viele Ziele, wie die Stufe verlangt (Stufe 1: keine).
    const agenda = (spielerAgendaIds ?? []).slice(
      0,
      spielerAgendaZielAnzahl(complexity, spielerAgendaIds?.length ?? 0),
    );
    if (agenda.length > 0) {
      state = { ...state, spielerAgenda: agenda };
    }

    let pkKnappeMonate = 0;
    let pkRegenSumme = 0;
    let engineErrors = 0;
    const engineErrorDetails: string[] = [];
    let haengerId: string | null = null;
    let haengerStreak = 0;
    let einbringenHaengerMax = 0;

    for (let _month = 1; _month <= LEGISLATUR_MONATE; _month++) {
      // Wenn ein Event aktiv ist, zuerst auflösen
      if (state.activeEvent) {
        state = autoResolveEvent(state, complexity, content);
      }

      // Strategie wählt Aktion(en) — Arrays bilden PK-Stacking ab (mehrere
      // Aktionen im selben pausierten Monat, siehe Issue #271)
      const action = strategy(state, content, complexity);
      const actions = Array.isArray(action) ? action : [action];

      // Hänger zählt nur, wenn das PK gereicht hätte — Warten aufs PK ist Spiel, kein Deadlock.
      const versuch = actions.find(
        (a): a is Extract<StrategyAction, { typ: 'einbringen' }> => a.typ === 'einbringen',
      );
      const leistbar =
        versuch != null &&
        state.pk >= einbringenPkKosten(state, versuch.gesetzId, DEFAULT_AUSRICHTUNG, complexity);

      // Aktionen sequenziell anwenden (jede prüft ihre eigene PK-Affordability)
      for (const a of actions) {
        state = applyAction(state, a, content, complexity);
      }

      if (versuch && leistbar && state.gesetze.find(g => g.id === versuch.gesetzId)?.status === 'entwurf') {
        haengerStreak = versuch.gesetzId === haengerId ? haengerStreak + 1 : 1;
        haengerId = versuch.gesetzId;
        einbringenHaengerMax = Math.max(einbringenHaengerMax, haengerStreak);
      } else {
        haengerId = null;
        haengerStreak = 0;
      }

      // Ressourcen-Metrik: zustimmungsabhängiger Regen dieses Monats (gleiche Formel wie tick)
      pkRegenSumme += berechnePkRegen(state.zust.g, complexity);

      // Engine-Tick (echte Engine!)
      state = tick(state, content, complexity, DEFAULT_AUSRICHTUNG);

      // Abgefangene Systemfehler aus engineDiagnostics erfassen (Monat + Phase + System)
      for (const diag of state.engineDiagnostics ?? []) {
        if (diag.month === state.month) {
          engineErrors++;
          engineErrorDetails.push(`Monat ${diag.month}: Engine-Fehler: ${diag.phase}/${diag.system}`);
        }
      }

      // Nach Tick: Event auflösen falls eines getriggert wurde
      if (state.activeEvent) {
        state = autoResolveEvent(state, complexity, content);
      }

      if (state.pk < 10) pkKnappeMonate++;

      // Spielende prüfen
      if (state.gameOver) break;
    }

    const saldo = state.haushalt?.saldo ?? 0;
    const gewonnen = state.legislaturErfolg ?? state.won ?? false;

    const verlustGrund = bestimmeVerlustGrund(state, gewonnen, complexity);

    return {
      gewonnen,
      wahlprognose: state.zust.g,
      saldo,
      koalition: state.coalition,
      monat: state.month,
      gesetze: state.gesetze.filter(g => g.status === 'beschlossen').length,
      crash: false,
      engineErrors,
      engineErrorDetails: engineErrorDetails.length > 0 ? engineErrorDetails : undefined,
      bilanzPunkte: state.spielziel?.bilanzPunkte,
      agendaPunkte: state.spielziel?.agendaPunkte,
      urteilPunkte: state.spielziel?.urteilPunkte,
      wahlbonus: state.spielziel?.wahlbonus,
      gesamtpunkte: state.spielziel?.gesamtpunkte,
      wahlUeberHuerde: state.wahlUeberHuerde,
      verlustGrund,
      pkEnde: state.pk,
      pkKnappeMonate,
      pkRegenSumme,
      zfEnde: state.kpi.zf,
      einbringenHaengerMax,
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
      engineErrors: 0,
      pkEnde: 0,
      pkKnappeMonate: 0,
      pkRegenSumme: 0,
      zfEnde: 0,
      einbringenHaengerMax: 0,
    };
  }
}

/** Aggregiert N Simulationsergebnisse */
export function aggregiere(ergebnisse: SimResult[]): AggregatedResult {
  const n = ergebnisse.length;
  const gewonnen = ergebnisse.filter(e => e.gewonnen).length;
  const crashes = ergebnisse.filter(e => e.crash).length;
  const engineErrors = ergebnisse.reduce((sum, e) => sum + e.engineErrors, 0);
  const engineErrorDetails = ergebnisse.flatMap(e => e.engineErrorDetails ?? []);
  const valid = ergebnisse.filter(e => !e.crash);

  const prognosen = valid.map(e => e.wahlprognose).sort((a, b) => a - b);
  const saldi = valid.map(e => e.saldo).sort((a, b) => a - b);
  const gesamtpunkteArr = valid.map(e => e.gesamtpunkte ?? 0).sort((a, b) => a - b);
  const bilanzArr = valid.map(e => e.bilanzPunkte ?? 0).sort((a, b) => a - b);
  const agendaArr = valid.map(e => e.agendaPunkte ?? 0).sort((a, b) => a - b);
  const urteilArr = valid.map(e => e.urteilPunkte ?? 0).sort((a, b) => a - b);
  const pkEndeArr = valid.map(e => e.pkEnde).sort((a, b) => a - b);
  const pkKnappArr = valid.map(e => e.pkKnappeMonate).sort((a, b) => a - b);
  const pkRegenArr = valid.map(e => e.pkRegenSumme).sort((a, b) => a - b);
  const zfEndeArr = valid.map(e => e.zfEnde).sort((a, b) => a - b);
  const gesetzeArr = valid.map(e => e.gesetze).sort((a, b) => a - b);
  const wahlUeberHuerdeMit = valid.filter(e => e.wahlUeberHuerde === true).length;

  // Verlustgrund-Verteilung über alle Niederlagen (gecrashte Runs ausgenommen)
  const verlustCounts: Record<VerlustGrund, number> = {
    koalitionsbruch: 0,
    partner_kuendigt: 0,
    misstrauensvotum: 0,
    vertrauensfrage: 0,
    ruecktritt: 0,
    kein_gesetz: 0,
    agenda: 0,
    punkte: 0,
  };
  for (const e of ergebnisse) {
    if (!e.crash && !e.gewonnen && e.verlustGrund) {
      verlustCounts[e.verlustGrund]++;
    }
  }
  const verlustHaeufigster = (Object.entries(verlustCounts) as [VerlustGrund, number][])
    .filter(([, c]) => c > 0)
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  if (prognosen.length === 0) prognosen.push(0);
  if (saldi.length === 0) saldi.push(0);
  if (gesamtpunkteArr.length === 0) gesamtpunkteArr.push(0);
  if (bilanzArr.length === 0) bilanzArr.push(0);
  if (agendaArr.length === 0) agendaArr.push(0);
  if (urteilArr.length === 0) urteilArr.push(0);
  if (pkEndeArr.length === 0) pkEndeArr.push(0);
  if (pkKnappArr.length === 0) pkKnappArr.push(0);
  if (pkRegenArr.length === 0) pkRegenArr.push(0);
  if (zfEndeArr.length === 0) zfEndeArr.push(0);
  if (gesetzeArr.length === 0) gesetzeArr.push(0);

  const median = (arr: number[]) => {
    const mid = Math.floor(arr.length / 2);
    return arr.length % 2 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
  };
  const pct = (arr: number[], p: number) =>
    arr[Math.floor(arr.length * p)] ?? arr[arr.length - 1];

  return {
    n,
    gewinnRate: gewonnen / n,
    wahlprognose: {
      median: median(prognosen),
      mittel: prognosen.reduce((a, b) => a + b, 0) / prognosen.length,
      min: prognosen[0],
      max: prognosen[prognosen.length - 1],
      p10: pct(prognosen, 0.1),
      p25: pct(prognosen, 0.25),
      p75: pct(prognosen, 0.75),
      p90: pct(prognosen, 0.9),
    },
    saldo: {
      median: median(saldi),
      min: saldi[0],
      max: saldi[saldi.length - 1],
    },
    crashes,
    engineErrors,
    engineErrorDetails: engineErrorDetails.length > 0 ? engineErrorDetails : undefined,
    wahlUeberHuerdeRate: valid.length > 0 ? wahlUeberHuerdeMit / valid.length : 0,
    gesamtpunkte: {
      median: median(gesamtpunkteArr),
      min: gesamtpunkteArr[0],
      max: gesamtpunkteArr[gesamtpunkteArr.length - 1],
    },
    bilanzPunkte: { median: median(bilanzArr) },
    agendaPunkte: { median: median(agendaArr) },
    urteilPunkte: { median: median(urteilArr) },
    pkEnde: { median: median(pkEndeArr) },
    pkKnappeMonate: { median: median(pkKnappArr) },
    pkRegenSumme: { median: median(pkRegenArr) },
    zfEnde: { median: median(zfEndeArr) },
    gesetze: { median: median(gesetzeArr) },
    einbringenHaengerMax: ergebnisse.reduce((m, e) => Math.max(m, e.einbringenHaengerMax), 0),
    verlustGrund: { haeufigster: verlustHaeufigster, counts: verlustCounts },
  };
}

/** Führt N Simulationen für eine Strategie durch und aggregiert */
export function monteCarlo(
  content: ContentBundle,
  strategy: Strategy,
  n: number = 200,
  complexity: number = 4,
  spielerAgendaIds?: string[],
): AggregatedResult {
  const ergebnisse: SimResult[] = [];
  for (let i = 0; i < n; i++) {
    ergebnisse.push(runSingleSim(content, strategy, complexity, spielerAgendaIds));
  }
  return aggregiere(ergebnisse);
}
