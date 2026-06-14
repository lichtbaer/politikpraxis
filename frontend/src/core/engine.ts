import type { GameState, ContentBundle, EngineDiagnosticEntry, TickLogEntry } from './types';
import { withPause, getAutoPauseLevel } from './eventPause';
import {
  berechnePkRegen, PK_MAX,
  HISTORY_MAX_MONTHS, KPI_HISTORY_MAX_MONTHS, MAX_LOG_ENTRIES,
  MISSTRAUENSVOTUM_MONATE, trimHistory, MEDIEN_KLIMA_DEFAULT,
} from './constants';
import { applyPendingEffects, applyKPIDrift, recalcApproval, decayZustOffsets, roundKpi } from './systems/economy';
import { berechneWahlprognose } from './systems/wahlprognose';
import { applyCharBonuses, checkUltimatums, applyRessortKonflikt } from './systems/characters';
import { updateCoalitionStability } from './systems/coalition';
import { advanceRoutes } from './systems/levels';
import { checkRandomEvents, checkBundesratEvents, checkKommunalEvents, checkKommunalLaenderEvents, checkSteuerEvents, checkFollowupEvents } from './systems/events';
import { checkDynamischeEvents } from './systems/dynamischeEvents';
import { pruneExpiredCooldowns } from './systems/eventUtils';
import { checkGameEnd } from './systems/election';
import { executeBundesratVote } from './systems/bundesrat';
import {
  checkBundesratLaenderEvents,
  flushPendingBundesratLandEvent,
} from './systems/bundesratLaenderEvents';
import { resolveEingebrachteAbstimmung } from './systems/parliament';
import { tickKoalitionspartner, checkKoalitionsbruch, updateKoalitionsvertragScore } from './systems/koalition';
import { checkPolitikfeldDruck } from './systems/politikfeldDruck';
import { checkVerbandsAktionen } from './systems/verbaende';
import { checkMinisterialInitiativen } from './systems/ministerialInitiativen';
import { checkMinisterAgenden } from './systems/ministerAgenden';
import { tickEUKlima, advanceEURoute, checkEUEreignisse } from './systems/eu';
import {
  tickKonjunktur,
  applySchuldenbremsenEffekte,
  checkLehmannSparvorschlag,
  checkLehmannDefizitStart,
  checkHaushaltskrise,
  triggerHaushaltsdebatte,
} from './systems/haushalt';
import { tickWirtschaft } from './systems/wirtschaft';
import { tickGesetzVorstufen } from './systems/gesetzLebenszyklus';
import {
  checkWahlkampfBeginn,
  checkTVDuell,
  checkKoalitionspartnerAlleingang,
  checkWahlkampfThemaWahl,
  checkWahlkampfVersprechen,
  checkWahlkampfZwischenbilanz,
  tickWahlkampfPrognose,
  triggerWahlnacht,
} from './systems/wahlkampf';
import { tickMedienKlima, berechneMedianklima, roundMedienKlimaIndex } from './systems/medienklima';
import { tickVermittlungsausschuss } from './systems/vermittlung';
import { featureActive } from './systems/features';
import { applyMilieuDrift } from './systems/milieus';
import { tickExtremismusDruck } from './ideologie';
import { checkSachverstaendigenrat } from './systems/sachverstaendigenrat';
import { tickNormenkontrolle } from './systems/verfassungsgericht';
import { SPRECHER_ERSATZ, LANDTAGSWAHL_TRANSITIONS } from '../data/defaults/bundesratEvents';
import { berechneMonatsDiff } from './monatszusammenfassung';
import { logger } from '../utils/logger';
import { seedRng } from './rng';
import { updateAgendaHistoryTrackers } from './systems/agendaHistory';
import { syncMediaState } from './state';

export { addLog } from './log';

function formatTickTime(month: number): string {
  const yr = 2025 + Math.floor((month - 1) / 12);
  const mo = ((month - 1) % 12) + 1;
  return `${String(mo).padStart(2, '0')}/${yr}`;
}

/**
 * Veränderlicher Kontext, der zwischen den Pipeline-Phasen eines Ticks geteilt
 * wird. Jede `phaseXxx(ctx)`-Funktion liest und schreibt `ctx.s` (den laufenden
 * GameState) sowie die Diagnostik-Akkumulatoren. Der bisherige Stil
 * `s = system(s)` bleibt erhalten — innerhalb der Phasen einfach als
 * `ctx.s = system(ctx.s)`.
 */
interface TickContext {
  /** Laufender GameState — wird von jeder Phase fortgeschrieben. */
  s: GameState;
  readonly content: ContentBundle;
  readonly complexity: number;
  readonly ausrichtung?: { wirtschaft: number; gesellschaft: number; staat: number };
  /** Eingangs-State (vor dem Tick) — Basis für die Monatszusammenfassung. */
  readonly originalState: GameState;
  /** Startzeit für Performance-Monitoring (performance.now()). */
  readonly t0: number;
  /** Gesammelte KPI-Änderungen pro Quelle, am Tick-Ende an den State gehängt. */
  tickLog: TickLogEntry[];
  /** Systeme, die in diesem Tick eine Exception geworfen haben — mit zugehöriger Phase. */
  failedSystems?: { name: string; phase: string }[];
  /** Name der aktuell laufenden Phase — von tick() vor jeder Phase gesetzt. */
  phase: string;
}

/** Wraps a system call in try-catch to prevent a single failing system from crashing the game.
 *  On failure, keeps the current `ctx.s` — since `ctx.s` is reassigned after each successful
 *  system call and systems return new objects (no in-place mutation), this preserves all
 *  prior successful changes instead of reverting to an earlier snapshot. Der Fehler-Log
 *  enthält weiterhin den Systemnamen sowie die Phase, in der er auftrat. */
function safeSystem(ctx: TickContext, fn: (current: GameState) => GameState, name: string): void {
  try {
    ctx.s = fn(ctx.s);
  } catch (err) {
    logger.error(`Engine: System "${name}" failed in phase "${ctx.phase}" tick ${ctx.s.month}`, {
      error: String(err),
      phase: ctx.phase,
    });
    (ctx.failedSystems ??= []).push({ name, phase: ctx.phase });
  }
}

/**
 * Phase 1 — Pre-Tick: Cooldowns aufräumen, Spielende prüfen, Pending Effects.
 * Setzt `ctx.s.gameOver`, wenn der Tick abgebrochen werden soll; tick() prüft das
 * danach und kehrt frühzeitig zurück.
 */
function phasePreTick(ctx: TickContext): void {
  // 0. Prune expired event cooldowns to prevent unbounded growth
  ctx.s = pruneExpiredCooldowns(ctx.s);

  // 1. Zeit: Spielende prüfen
  ctx.s = checkGameEnd(ctx.s, ctx.content);
  if (ctx.s.gameOver) return;

  // 2. Pending Effects
  if (ctx.s.medienKlima == null) ctx.s = { ...ctx.s, medienKlima: MEDIEN_KLIMA_DEFAULT };

  const kpiBeforePending = { ...ctx.s.kpi };
  ctx.s = applyPendingEffects(ctx.s);
  // Track KPI changes from pending effects
  for (const key of ['al', 'hh', 'gi', 'zf'] as const) {
    const delta = +(ctx.s.kpi[key] - kpiBeforePending[key]).toFixed(2);
    if (delta !== 0) {
      ctx.tickLog.push({ source: 'Gesetzwirkung', target: key, delta });
    }
  }
}

/**
 * Phase 2 — Policy & Legislation: eingebrachte Gesetze, Vermittlungsausschuss,
 * Vorstufen-Routes (Kommunal/Länder), EU-Route, Gesetz-Vorstufen.
 */
function phasePolicyAndLegislation(ctx: TickContext): void {
  const { content, complexity } = ctx;

  // SMA-304: Eingebrachte Gesetze — Abstimmung wenn Abstimmungsmonat erreicht
  const eingebrachte = ctx.s.eingebrachteGesetze ?? [];
  for (const eg of eingebrachte) {
    if (ctx.s.month >= eg.abstimmungMonat) {
      const voteContext = content.milieus
        ? { milieus: content.milieus, complexity, gesetzRelationen: content.gesetzRelationen, content }
        : undefined;
      ctx.s = resolveEingebrachteAbstimmung(ctx.s, eg, voteContext);
      const newLaw = ctx.s.gesetze.find(g => g.id === eg.gesetzId);
      if (newLaw != null && newLaw.status === 'beschlossen') {
        ctx.s = updateKoalitionsvertragScore(ctx.s, eg.gesetzId, content, complexity);
        ctx.s = applyRessortKonflikt(ctx.s, newLaw.politikfeldId);
      }
    }
  }

  // 2b. Vermittlungsausschuss: abschließen wenn Frist erreicht
  const vermittlungCtx = content.milieus
    ? { milieus: content.milieus, complexity, gesetzRelationen: content.gesetzRelationen, content }
    : undefined;
  safeSystem(ctx, (st) => tickVermittlungsausschuss(st, vermittlungCtx), 'tickVermittlungsausschuss');

  const routesResult = advanceRoutes(ctx.s, content, complexity);
  ctx.s = routesResult.state;
  if (routesResult.completedVorstufe && !ctx.s.activeEvent) {
    const ev = routesResult.completedVorstufe.route === 'kommune'
      ? (content.vorstufenEvents ?? []).find(e => e.id === 'vorstufe_kommunal_erfolg')
      : (content.vorstufenEvents ?? []).find(e => e.id === 'vorstufe_laender_erfolg');
    if (ev) {
      const evWithLaw = { ...ev, lawId: routesResult.completedVorstufe.lawId };
      ctx.s = { ...ctx.s, activeEvent: evWithLaw, ...withPause(ctx.s, getAutoPauseLevel(ev)) };
    }
  }
  ctx.s = advanceEURoute(ctx.s, content, complexity);
  ctx.s = tickGesetzVorstufen(ctx.s, content, complexity);
}

/**
 * Phase 3 — Economy & Budget: Haushalt/Konjunktur, Politikfeld-Druck,
 * Extremismus-Druck, PK-Regen und Konjunkturdrift.
 */
function phaseEconomyAndBudget(ctx: TickContext): void {
  const { content, complexity, ausrichtung } = ctx;

  // 4. Haushalt
  const kpiBeforeHaushalt = { ...ctx.s.kpi };
  safeSystem(ctx, (st) => tickKonjunktur(st, complexity), 'tickKonjunktur');
  safeSystem(ctx, (st) => tickWirtschaft(st, complexity), 'tickWirtschaft');
  safeSystem(ctx, (st) => applySchuldenbremsenEffekte(st, complexity, content), 'applySchuldenbremsenEffekte');
  safeSystem(ctx, (st) => checkLehmannSparvorschlag(st, complexity), 'checkLehmannSparvorschlag');
  safeSystem(ctx, (st) => checkLehmannDefizitStart(st, content, complexity), 'checkLehmannDefizitStart');
  safeSystem(ctx, (st) => checkHaushaltskrise(st, content, complexity), 'checkHaushaltskrise');
  safeSystem(ctx, (st) => checkDynamischeEvents(st, content, complexity), 'checkDynamischeEvents');
  safeSystem(ctx, (st) => triggerHaushaltsdebatte(st, complexity, content.politikfelder ?? []), 'triggerHaushaltsdebatte');

  for (const key of ['al', 'hh', 'gi', 'zf'] as const) {
    const delta = +(ctx.s.kpi[key] - kpiBeforeHaushalt[key]).toFixed(2);
    if (delta !== 0) {
      ctx.tickLog.push({ source: 'Haushalt & Konjunktur', target: key, delta });
    }
  }
  // 5. Politikfeld-Druck
  const allEvents = [...(content.events ?? []), ...Object.values(content.charEvents ?? {})];
  safeSystem(ctx, (st) => checkPolitikfeldDruck(st, content.politikfelder ?? [], complexity, allEvents), 'checkPolitikfeldDruck');

  // 5b. Extremismus-Druck (SMA-280): Koalitionspartner-Warnung, Verfassungsgericht
  if (
    featureActive(complexity, 'extremismus_eskalation') &&
    ausrichtung &&
    content.extremismusEvents?.length
  ) {
    safeSystem(ctx, (st) => tickExtremismusDruck(st, ausrichtung!, content.extremismusEvents!, complexity), 'tickExtremismusDruck');
  }

  // 6. PK-Regen: zustimmungsabhängig (Basis je Stufe ± 1 je 15 Punkte um Referenz 40)
  const pkRegen = berechnePkRegen(ctx.s.zust.g, complexity);
  ctx.s = { ...ctx.s, pk: Math.min(PK_MAX, ctx.s.pk + pkRegen) };

  // Krisen-PK: Bei drohendem Misstrauensvotum (2+ Monate unter 20%) erhält Spieler Bonus-PK
  if ((ctx.s.lowApprovalMonths ?? 0) >= 2) {
    ctx.s = { ...ctx.s, pk: Math.min(PK_MAX, ctx.s.pk + 5) };
  }

  // 7. Konjunkturdrift
  const kpiBeforeDrift = { ...ctx.s.kpi };
  ctx.s = { ...ctx.s, kpi: applyKPIDrift(ctx.s.kpi) };
  for (const key of ['al', 'hh', 'gi', 'zf'] as const) {
    const delta = +(ctx.s.kpi[key] - kpiBeforeDrift[key]).toFixed(2);
    if (delta !== 0) {
      ctx.tickLog.push({ source: 'Konjunkturdrift', target: key, delta });
    }
  }
}

/**
 * Phase 4 — Actors & Institutions: Char-Boni & Koalitionsstabilität, Koalition,
 * Verbände & Ministerial, Sachverständigenrat, EU, Ultimatums, Bundesrat,
 * Normenkontrolle.
 */
function phaseActorsAndInstitutions(ctx: TickContext): void {
  const { content, complexity } = ctx;

  ctx.s = applyCharBonuses(ctx.s);
  ctx.s = updateCoalitionStability(ctx.s);

  // 8. Koalition
  safeSystem(ctx, (st) => tickKoalitionspartner(st, content, complexity), 'tickKoalitionspartner');
  safeSystem(ctx, (st) => checkKoalitionsbruch(st, content, complexity), 'checkKoalitionsbruch');
  // 9. Verbände & Ministerial
  safeSystem(ctx, (st) => checkVerbandsAktionen(st, content.verbaende ?? [], complexity), 'checkVerbandsAktionen');
  safeSystem(ctx, (st) => checkMinisterialInitiativen(st, content.ministerialInitiativen ?? [], complexity), 'checkMinisterialInitiativen');
  // 9b. SMA-330: Minister-Agenden (kontinuierliche Forderungen)
  safeSystem(ctx, (st) => checkMinisterAgenden(st, complexity), 'checkMinisterAgenden');
  // 9c. Sachverständigenrat (SVR-Jahresgutachten alle 12 Monate, Stufe 2+)
  safeSystem(ctx, (st) => checkSachverstaendigenrat(st, content, complexity), 'checkSachverstaendigenrat');

  // 10. EU
  safeSystem(ctx, (st) => tickEUKlima(st, content.verbaende ?? [], complexity), 'tickEUKlima');
  safeSystem(ctx, (st) => checkEUEreignisse(st, content, complexity), 'checkEUEreignisse');

  // 11. Chars: Ultimatums
  safeSystem(ctx, (st) => checkUltimatums(st, content.charEvents), 'checkUltimatums');
  // 12. Bundesrat (SMA-291: Stufe 1 unsichtbar — keine Abstimmung, keine Events)
  if (featureActive(complexity, 'bundesrat_sichtbar')) {
    safeSystem(ctx, (st) => processBundesratVotes(st, content, complexity), 'processBundesratVotes');
    safeSystem(ctx, (st) => checkBundesratEvents(st, {
      bundesratEvents: content.bundesratEvents ?? [],
      sprecherErsatz: SPRECHER_ERSATZ,
      landtagswahlTransitions: LANDTAGSWAHL_TRANSITIONS,
    }), 'checkBundesratEvents');
    safeSystem(
      ctx,
      (st) => checkBundesratLaenderEvents(st, content, complexity),
      'checkBundesratLaenderEvents',
    );
  }
  // 12b. Normenkontrolle: BVerfG-Verfahren abschließen (Stufe 3+)
  safeSystem(ctx, (st) => tickNormenkontrolle(st, complexity, content), 'tickNormenkontrolle');
}

/**
 * Phase 5 — Public & Media: Medienklima und alle Event-Checks
 * (Kommunal, Länder, Steuer, Follow-up, Zufall).
 */
function phasePublicAndMedia(ctx: TickContext): void {
  const { content, complexity } = ctx;

  // 12c. Medienklima (SMA-277): Drift, Opposition, Skandale, positive Events
  safeSystem(ctx, (st) => tickMedienKlima(st, content, complexity), 'tickMedienKlima');
  if (featureActive(complexity, 'medien_akteure_2') && ctx.s.medienAkteure && Object.keys(ctx.s.medienAkteure).length > 0) {
    ctx.s = { ...ctx.s, medienKlima: berechneMedianklima(ctx.s) };
  }

  // 13. Events
  safeSystem(ctx, (st) => checkKommunalEvents(st, { kommunalEvents: content.kommunalEvents ?? [] }, complexity), 'checkKommunalEvents');
  if (featureActive(complexity, 'kommunal_pilot') && content.kommunalLaenderEvents?.length) {
    safeSystem(ctx, (st) => checkKommunalLaenderEvents(st, content.kommunalLaenderEvents!, complexity), 'checkKommunalLaenderEvents');
  }
  if (content.steuerEvents?.length) {
    safeSystem(ctx, (st) => checkSteuerEvents(st, content.steuerEvents!, complexity, content), 'checkSteuerEvents');
  }
  // 13b. Follow-up Events (complexity >= 4)
  safeSystem(ctx, (st) => checkFollowupEvents(st, content.events), 'checkFollowupEvents');
  safeSystem(ctx, (st) => checkRandomEvents(st, content.events), 'checkRandomEvents');

  // Issue #223: media-Substate mit flachen Feldern synchron halten
  ctx.s = syncMediaState(ctx.s);
}

/**
 * Phase 6 — Election & Game End: Wahlkampf-Trigger, KPI-Rundung, Zustimmung &
 * Wahlprognose neu berechnen, Milieu-Drift.
 */
function phaseElectionAndGameEnd(ctx: TickContext): void {
  const { content, complexity } = ctx;

  // 14. Wahlkampf (SMA-278: Monat 43+)
  ctx.s = checkWahlkampfBeginn(ctx.s, content, complexity);
  if (ctx.s.wahlkampfAktiv) {
    ctx.s = { ...ctx.s, wahlkampfAktionenGenutzt: 0 };
    if (!ctx.s.activeEvent) ctx.s = checkWahlkampfThemaWahl(ctx.s, content, complexity);
    if (!ctx.s.activeEvent) ctx.s = checkWahlkampfZwischenbilanz(ctx.s, content, complexity);
    if (!ctx.s.activeEvent) ctx.s = checkTVDuell(ctx.s, content, complexity);
    if (!ctx.s.activeEvent) ctx.s = checkWahlkampfVersprechen(ctx.s, content, complexity);
    if (!ctx.s.activeEvent) ctx.s = checkKoalitionspartnerAlleingang(ctx.s, content, complexity);
  }

  // 14b. KPI-Rundung: einmalig am Tick-Ende statt pro Einzeleffekt (vermeidet Rundungsfehler-Kaskaden)
  ctx.s = { ...ctx.s, kpi: roundKpi(ctx.s.kpi) };

  // 15. Zustimmung — Segment-Offsets (Medienkampagne, Ausrichtung) klingen
  // monatlich ab und werden additiv auf die KPI-basierten Segmente angewendet
  ctx.s = { ...ctx.s, zustOffsets: decayZustOffsets(ctx.s.zustOffsets) };
  let newZust = recalcApproval(ctx.s.kpi, ctx.s.zust, ctx.s.zustOffsets);
  if (content.milieus && content.milieus.length > 0) {
    let g = berechneWahlprognose({ ...ctx.s, zust: newZust }, content, complexity);
    // SMA-280: Verfassungsgericht-Verfahren: -3% Wahlprognose
    if (ctx.s.verfassungsgerichtAktiv && !ctx.s.verfassungsgerichtPausiert) {
      g = Math.max(0, g - 3);
    }
    newZust = { ...newZust, g };
  }
  ctx.s = { ...ctx.s, zust: newZust };

  // 15b. Milieu-Drift: Milieus passen sich an KPI-basierte Segmentwerte an
  if (content.milieus && content.milieus.length > 0) {
    ctx.s = applyMilieuDrift(ctx.s, content.milieus, complexity);
  }

  // Issue #223: media-Substate mit Wahlkampf-Medienänderungen synchron halten
  ctx.s = syncMediaState(ctx.s);
}

/**
 * Phase 7 — History & Diagnostics: alle Verlaufs-Tracker, späte Wahl-Hooks
 * (Wahlkampf-Prognose, Wahlnacht), Misstrauensvotum-Warnung, tickLog/Monatsdiff
 * anhängen und Performance-Logging.
 */
function phaseHistoryAndDiagnostics(ctx: TickContext): void {
  const { content, complexity } = ctx;
  const newZust = ctx.s.zust;

  // Approval-History: allgemeine Zustimmung pro Monat tracken
  ctx.s = { ...ctx.s, approvalHistory: trimHistory(ctx.s.approvalHistory ?? [], newZust.g, HISTORY_MAX_MONTHS) };

  // KPI-History: letzte 12 Monate pro KPI für Trendanzeige
  const prevKpiHist = ctx.s.kpiHistory ?? { al: [], hh: [], gi: [], zf: [] };
  ctx.s = {
    ...ctx.s,
    kpiHistory: {
      al: trimHistory(prevKpiHist.al, ctx.s.kpi.al, KPI_HISTORY_MAX_MONTHS),
      hh: trimHistory(prevKpiHist.hh, ctx.s.kpi.hh, KPI_HISTORY_MAX_MONTHS),
      gi: trimHistory(prevKpiHist.gi, ctx.s.kpi.gi, KPI_HISTORY_MAX_MONTHS),
      zf: trimHistory(prevKpiHist.zf, ctx.s.kpi.zf, KPI_HISTORY_MAX_MONTHS),
    },
    // SMA-323: Haushalt-Saldo-Verlauf für Chart (Mrd.)
    haushaltSaldoHistory: trimHistory(ctx.s.haushaltSaldoHistory ?? [], ctx.s.haushalt?.saldo ?? 0, KPI_HISTORY_MAX_MONTHS),
    konjunkturIndexHistory: trimHistory(
      ctx.s.konjunkturIndexHistory ?? [],
      ctx.s.haushalt?.konjunkturIndex ?? 0,
      KPI_HISTORY_MAX_MONTHS,
    ),
  };

  // SMA-280: Verfassungsgericht-Verfahren beenden wenn Frist abgelaufen
  if (
    ctx.s.verfassungsgerichtAktiv &&
    !ctx.s.verfassungsgerichtPausiert &&
    ctx.s.verfassungsgerichtVerfahrenBisMonat != null &&
    ctx.s.month >= ctx.s.verfassungsgerichtVerfahrenBisMonat
  ) {
    ctx.s = {
      ...ctx.s,
      verfassungsgerichtAktiv: false,
      verfassungsgerichtVerfahrenBisMonat: undefined,
      verfassungsgerichtPolitikfeldIds: undefined,
    };
  }

  // 16. Milieu-History
  if (ctx.s.milieuZustimmung && Object.keys(ctx.s.milieuZustimmung).length > 0) {
    const history = { ...(ctx.s.milieuZustimmungHistory ?? {}) };
    for (const [mid, val] of Object.entries(ctx.s.milieuZustimmung)) {
      const arr = history[mid] ?? [];
      history[mid] = trimHistory(arr, val, HISTORY_MAX_MONTHS);
    }
    ctx.s = { ...ctx.s, milieuZustimmungHistory: history };
  }

  if (ctx.s.wahlkampfAktiv) {
    ctx.s = tickWahlkampfPrognose(ctx.s, content, complexity);
  }

  if (ctx.s.month === 48) {
    ctx.s = triggerWahlnacht(ctx.s, content, complexity);
  }

  // Misstrauensvotum-Warnung im Log
  const lowMonths = ctx.s.lowApprovalMonths ?? 0;
  if (lowMonths >= 3 && lowMonths < MISSTRAUENSVOTUM_MONATE) {
    const remaining = MISSTRAUENSVOTUM_MONATE - lowMonths;
    ctx.s = {
      ...ctx.s,
      log: [
        { time: formatTickTime(ctx.s.month), msg: `⚠ Misstrauensvotum droht! Noch ${remaining} Monat(e) unter 20% bis zum Sturz.`, type: 'danger' },
        ...ctx.s.log,
      ].slice(0, MAX_LOG_ENTRIES),
    };
  }

  // Attach the tick change log and engine diagnostics (separate from player KPI deltas)
  if (ctx.failedSystems?.length) {
    const diagnostics: EngineDiagnosticEntry[] = ctx.failedSystems.map(({ name, phase }) => ({
      month: ctx.s.month,
      phase,
      system: name,
      level: 'error',
    }));
    ctx.s = {
      ...ctx.s,
      engineDiagnostics: [...(ctx.s.engineDiagnostics ?? []), ...diagnostics],
    };
  }
  ctx.s = { ...ctx.s, tickLog: ctx.tickLog };

  // SMA-396: Monatszusammenfassung (Diff zum Zustand vor diesem Tick)
  ctx.s = { ...ctx.s, letzterMonatsDiff: berechneMonatsDiff(ctx.originalState, ctx.s, content) };

  // SMA-412: Medienklima-Verlauf — ein Punkt pro abgeschlossenem Monat (Wert nach tickMedienKlima etc.)
  // SMA-409: gerundeter Index (keine Float-Artefakte in Historie/Charts)
  const mkEnd = roundMedienKlimaIndex(ctx.s.medienKlima ?? ctx.s.zust.g);
  ctx.s = {
    ...ctx.s,
    medienKlimaHistory: trimHistory(ctx.s.medienKlimaHistory ?? [], mkEnd, HISTORY_MAX_MONTHS),
  };

  // SMA-502: Agenda-/Bilanz-Tracker (passiv, kein Gameplay-Effekt)
  ctx.s = updateAgendaHistoryTrackers(ctx.s, mkEnd);

  // Issue #223: media-Substate nach klimaHistory + klimaBelowMonths-Update synchron halten
  ctx.s = syncMediaState(ctx.s);

  // Performance monitoring: log slow ticks (>50ms)
  const tickDuration = performance.now() - ctx.t0;
  if (tickDuration > 50) {
    logger.warn(`Engine: Tick ${ctx.s.month} took ${tickDuration.toFixed(1)}ms`, { durationMs: tickDuration });
  }
}

/**
 * Monatlicher Engine-Tick: öffentlicher Einstiegspunkt. Delegiert an klar
 * benannte Pipeline-Phasen, deren fachliche Reihenfolge der vorherigen
 * monolithischen Implementierung entspricht (Issue #207):
 *
 * 1. phasePreTick                — Cooldowns, Spielende, Pending Effects
 * 2. phasePolicyAndLegislation   — Gesetze, Vermittlung, Vorstufen, EU-Route
 * 3. phaseEconomyAndBudget       — Haushalt, Politikfeld-Druck, PK-Regen, Drift
 * 4. phaseActorsAndInstitutions  — Chars, Koalition, Verbände, EU, Bundesrat
 * 5. phasePublicAndMedia         — Medienklima, Events
 * 6. phaseElectionAndGameEnd     — Wahlkampf, Zustimmung, Milieu-Drift
 * 7. phaseHistoryAndDiagnostics  — Historien, Wahlnacht, Diagnostik
 */
export function tick(
  state: GameState,
  content: ContentBundle,
  complexity: number = 4,
  ausrichtung?: { wirtschaft: number; gesellschaft: number; staat: number },
): GameState {
  if (state.gameOver) return state;

  // Deterministischen PRNG für diesen Tick initialisieren (seed + month → jeder Monat reproduzierbar)
  seedRng(state.rngSeed * 1_000_003 + state.month);

  const ctx: TickContext = {
    s: { ...state, month: state.month + 1, kpiPrev: { ...state.kpi }, tickLog: [] },
    content,
    complexity,
    ausrichtung,
    originalState: state,
    t0: performance.now(),
    tickLog: [],
    failedSystems: undefined,
    phase: 'phasePreTick',
  };

  phasePreTick(ctx);
  if (ctx.s.gameOver) return ctx.s;

  ctx.phase = 'phasePolicyAndLegislation';
  phasePolicyAndLegislation(ctx);
  ctx.phase = 'phaseEconomyAndBudget';
  phaseEconomyAndBudget(ctx);
  ctx.phase = 'phaseActorsAndInstitutions';
  phaseActorsAndInstitutions(ctx);
  ctx.phase = 'phasePublicAndMedia';
  phasePublicAndMedia(ctx);
  ctx.phase = 'phaseElectionAndGameEnd';
  phaseElectionAndGameEnd(ctx);
  ctx.phase = 'phaseHistoryAndDiagnostics';
  phaseHistoryAndDiagnostics(ctx);

  return ctx.s;
}

export type { TickContext };
export {
  phasePreTick,
  phasePolicyAndLegislation,
  phaseEconomyAndBudget,
  phaseActorsAndInstitutions,
  phasePublicAndMedia,
  phaseElectionAndGameEnd,
  phaseHistoryAndDiagnostics,
};

/** Führt Bundesratsabstimmungen durch, wenn brVoteMonth erreicht */
function processBundesratVotes(state: GameState, content: ContentBundle, complexity: number): GameState {
  let s = flushPendingBundesratLandEvent(state, content.bundesratEvents);
  const voteContext = content.milieus
    ? { milieus: content.milieus, complexity, gesetzRelationen: content.gesetzRelationen, content }
    : undefined;
  for (const law of s.gesetze) {
    if (law.status === 'bt_passed' && law.brVoteMonth != null && s.month >= law.brVoteMonth) {
      s = executeBundesratVote(s, law.id, voteContext);
      const newLaw = s.gesetze.find(g => g.id === law.id);
      if (newLaw?.status === 'beschlossen') {
        s = updateKoalitionsvertragScore(s, law.id, content, complexity);
        s = applyRessortKonflikt(s, newLaw.politikfeldId);
      }
    }
  }
  return s;
}
