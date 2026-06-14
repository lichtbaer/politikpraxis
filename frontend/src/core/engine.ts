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

/** Ein einzelnes Engine-System: eine benannte, abgegrenzte Operation im Tick-Durchlauf. */
interface EngineSystem {
  /** Eindeutiger Name — erscheint im Fehler-Log und in Engine-Diagnostiken. */
  id: string;
  /** Führt die System-Logik aus; schreibt Ergebnisse direkt in `ctx.s`. */
  run(ctx: TickContext): void;
  /** Wenn true, wird run() in try-catch gewrappt (Fehler werden geloggt, kein Crash). */
  safe: boolean;
  /** Optionaler Feature-Key: System wird nur ausgeführt wenn featureActive(complexity, feature). */
  feature?: string;
}

/** Eine Tick-Phase: geordnete Folge von Systemen, die gemeinsam eine fachliche Stufe bilden. */
interface EnginePhase {
  /** Eindeutiger Name der Phase — wird in `ctx.phase` gesetzt. */
  id: string;
  /** Systeme dieser Phase, in der Reihenfolge ihrer Ausführung. */
  systems: EngineSystem[];
  /** Wenn gesetzt und true zurückliefert, bricht tick() nach dieser Phase ab (z. B. gameOver). */
  checkAbort?: (ctx: TickContext) => boolean;
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

/** Führt ein EngineSystem aus: prüft Feature-Gate, then safe oder direkt. */
function runSystem(ctx: TickContext, system: EngineSystem): void {
  if (system.feature && !featureActive(ctx.complexity, system.feature)) return;
  if (system.safe) {
    try {
      system.run(ctx);
    } catch (err) {
      logger.error(`Engine: System "${system.id}" failed in phase "${ctx.phase}" tick ${ctx.s.month}`, {
        error: String(err),
        phase: ctx.phase,
      });
      (ctx.failedSystems ??= []).push({ name: system.id, phase: ctx.phase });
    }
  } else {
    system.run(ctx);
  }
}

/**
 * Deklarative Pipeline-Registry: alle Phasen und Systeme des monatlichen Engine-Ticks.
 * tick() iteriert generisch darüber; Reihenfolge, Feature-Gating und Early-Exit sind
 * hier hinterlegt statt in imperativem tick()-Code.
 */
const ENGINE_PIPELINE: EnginePhase[] = [
  // ─── Phase 1: Pre-Tick ───────────────────────────────────────────────────────
  {
    id: 'phasePreTick',
    checkAbort: (ctx) => ctx.s.gameOver,
    systems: [
      {
        id: 'pruneExpiredCooldowns',
        safe: false,
        run(ctx) { ctx.s = pruneExpiredCooldowns(ctx.s); },
      },
      {
        // checkGameEnd + Early-Exit + medienKlima-Init + pendingEffects + tickLog als eine Einheit,
        // da der gameOver-Early-Exit den Rest dieser Gruppe überspringen muss.
        id: 'checkGameEndAndPendingEffects',
        safe: false,
        run(ctx) {
          ctx.s = checkGameEnd(ctx.s, ctx.content);
          if (ctx.s.gameOver) return;
          if (ctx.s.medienKlima == null) ctx.s = { ...ctx.s, medienKlima: MEDIEN_KLIMA_DEFAULT };
          const kpiBeforePending = { ...ctx.s.kpi };
          ctx.s = applyPendingEffects(ctx.s);
          for (const key of ['al', 'hh', 'gi', 'zf'] as const) {
            const delta = +(ctx.s.kpi[key] - kpiBeforePending[key]).toFixed(2);
            if (delta !== 0) ctx.tickLog.push({ source: 'Gesetzwirkung', target: key, delta });
          }
        },
      },
    ],
  },

  // ─── Phase 2: Policy & Legislation ──────────────────────────────────────────
  {
    id: 'phasePolicyAndLegislation',
    systems: [
      {
        id: 'resolveEingebrachteGesetze',
        safe: false,
        run(ctx) {
          const { content, complexity } = ctx;
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
        },
      },
      {
        id: 'tickVermittlungsausschuss',
        safe: true,
        run(ctx) {
          const { content, complexity } = ctx;
          const vermittlungCtx = content.milieus
            ? { milieus: content.milieus, complexity, gesetzRelationen: content.gesetzRelationen, content }
            : undefined;
          ctx.s = tickVermittlungsausschuss(ctx.s, vermittlungCtx);
        },
      },
      {
        id: 'advanceRoutes',
        safe: false,
        run(ctx) {
          const { content, complexity } = ctx;
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
        },
      },
      {
        id: 'advanceEURoute',
        safe: false,
        run(ctx) { ctx.s = advanceEURoute(ctx.s, ctx.content, ctx.complexity); },
      },
      {
        id: 'tickGesetzVorstufen',
        safe: false,
        run(ctx) { ctx.s = tickGesetzVorstufen(ctx.s, ctx.content, ctx.complexity); },
      },
    ],
  },

  // ─── Phase 3: Economy & Budget ───────────────────────────────────────────────
  {
    id: 'phaseEconomyAndBudget',
    systems: [
      {
        // Haushalt-Systeme als Gruppe: kpiBeforeHaushalt muss vor dem ersten System
        // und nach dem letzten für tickLog ausgelesen werden → bleibt ein Block.
        id: 'economyHaushaltBlock',
        safe: false,
        run(ctx) {
          const { content, complexity } = ctx;
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
            if (delta !== 0) ctx.tickLog.push({ source: 'Haushalt & Konjunktur', target: key, delta });
          }
        },
      },
      {
        id: 'checkPolitikfeldDruck',
        safe: true,
        run(ctx) {
          const { content, complexity } = ctx;
          const allEvents = [...(content.events ?? []), ...Object.values(content.charEvents ?? {})];
          ctx.s = checkPolitikfeldDruck(ctx.s, content.politikfelder ?? [], complexity, allEvents);
        },
      },
      {
        id: 'tickExtremismusDruck',
        safe: true,
        feature: 'extremismus_eskalation',
        run(ctx) {
          if (ctx.ausrichtung && ctx.content.extremismusEvents?.length) {
            ctx.s = tickExtremismusDruck(ctx.s, ctx.ausrichtung, ctx.content.extremismusEvents, ctx.complexity);
          }
        },
      },
      {
        id: 'pkRegenBlock',
        safe: false,
        run(ctx) {
          const pkRegen = berechnePkRegen(ctx.s.zust.g, ctx.complexity);
          ctx.s = { ...ctx.s, pk: Math.min(PK_MAX, ctx.s.pk + pkRegen) };
          if ((ctx.s.lowApprovalMonths ?? 0) >= 2) {
            ctx.s = { ...ctx.s, pk: Math.min(PK_MAX, ctx.s.pk + 5) };
          }
        },
      },
      {
        id: 'applyKPIDriftWithLog',
        safe: false,
        run(ctx) {
          const kpiBeforeDrift = { ...ctx.s.kpi };
          ctx.s = { ...ctx.s, kpi: applyKPIDrift(ctx.s.kpi) };
          for (const key of ['al', 'hh', 'gi', 'zf'] as const) {
            const delta = +(ctx.s.kpi[key] - kpiBeforeDrift[key]).toFixed(2);
            if (delta !== 0) ctx.tickLog.push({ source: 'Konjunkturdrift', target: key, delta });
          }
        },
      },
    ],
  },

  // ─── Phase 4: Actors & Institutions ─────────────────────────────────────────
  {
    id: 'phaseActorsAndInstitutions',
    systems: [
      {
        id: 'applyCharBonuses',
        safe: false,
        run(ctx) { ctx.s = applyCharBonuses(ctx.s); },
      },
      {
        id: 'updateCoalitionStability',
        safe: false,
        run(ctx) { ctx.s = updateCoalitionStability(ctx.s); },
      },
      {
        id: 'tickKoalitionspartner',
        safe: true,
        run(ctx) { ctx.s = tickKoalitionspartner(ctx.s, ctx.content, ctx.complexity); },
      },
      {
        id: 'checkKoalitionsbruch',
        safe: true,
        run(ctx) { ctx.s = checkKoalitionsbruch(ctx.s, ctx.content, ctx.complexity); },
      },
      {
        id: 'checkVerbandsAktionen',
        safe: true,
        run(ctx) { ctx.s = checkVerbandsAktionen(ctx.s, ctx.content.verbaende ?? [], ctx.complexity); },
      },
      {
        id: 'checkMinisterialInitiativen',
        safe: true,
        run(ctx) { ctx.s = checkMinisterialInitiativen(ctx.s, ctx.content.ministerialInitiativen ?? [], ctx.complexity); },
      },
      {
        id: 'checkMinisterAgenden',
        safe: true,
        run(ctx) { ctx.s = checkMinisterAgenden(ctx.s, ctx.complexity); },
      },
      {
        id: 'checkSachverstaendigenrat',
        safe: true,
        run(ctx) { ctx.s = checkSachverstaendigenrat(ctx.s, ctx.content, ctx.complexity); },
      },
      {
        id: 'tickEUKlima',
        safe: true,
        run(ctx) { ctx.s = tickEUKlima(ctx.s, ctx.content.verbaende ?? [], ctx.complexity); },
      },
      {
        id: 'checkEUEreignisse',
        safe: true,
        run(ctx) { ctx.s = checkEUEreignisse(ctx.s, ctx.content, ctx.complexity); },
      },
      {
        id: 'checkUltimatums',
        safe: true,
        run(ctx) { ctx.s = checkUltimatums(ctx.s, ctx.content.charEvents); },
      },
      {
        id: 'processBundesratVotes',
        safe: true,
        feature: 'bundesrat_sichtbar',
        run(ctx) { ctx.s = processBundesratVotes(ctx.s, ctx.content, ctx.complexity); },
      },
      {
        id: 'checkBundesratEvents',
        safe: true,
        feature: 'bundesrat_sichtbar',
        run(ctx) {
          ctx.s = checkBundesratEvents(ctx.s, {
            bundesratEvents: ctx.content.bundesratEvents ?? [],
            sprecherErsatz: SPRECHER_ERSATZ,
            landtagswahlTransitions: LANDTAGSWAHL_TRANSITIONS,
          });
        },
      },
      {
        id: 'checkBundesratLaenderEvents',
        safe: true,
        feature: 'bundesrat_sichtbar',
        run(ctx) { ctx.s = checkBundesratLaenderEvents(ctx.s, ctx.content, ctx.complexity); },
      },
      {
        id: 'tickNormenkontrolle',
        safe: true,
        run(ctx) { ctx.s = tickNormenkontrolle(ctx.s, ctx.complexity, ctx.content); },
      },
    ],
  },

  // ─── Phase 5: Public & Media ─────────────────────────────────────────────────
  {
    id: 'phasePublicAndMedia',
    systems: [
      {
        id: 'tickMedienKlima',
        safe: true,
        run(ctx) { ctx.s = tickMedienKlima(ctx.s, ctx.content, ctx.complexity); },
      },
      {
        id: 'berechneMedianklima',
        safe: false,
        feature: 'medien_akteure_2',
        run(ctx) {
          if (ctx.s.medienAkteure && Object.keys(ctx.s.medienAkteure).length > 0) {
            ctx.s = { ...ctx.s, medienKlima: berechneMedianklima(ctx.s) };
          }
        },
      },
      {
        id: 'checkKommunalEvents',
        safe: true,
        run(ctx) {
          ctx.s = checkKommunalEvents(ctx.s, { kommunalEvents: ctx.content.kommunalEvents ?? [] }, ctx.complexity);
        },
      },
      {
        id: 'checkKommunalLaenderEvents',
        safe: true,
        feature: 'kommunal_pilot',
        run(ctx) {
          if (ctx.content.kommunalLaenderEvents?.length) {
            ctx.s = checkKommunalLaenderEvents(ctx.s, ctx.content.kommunalLaenderEvents!, ctx.complexity);
          }
        },
      },
      {
        id: 'checkSteuerEvents',
        safe: true,
        run(ctx) {
          if (ctx.content.steuerEvents?.length) {
            ctx.s = checkSteuerEvents(ctx.s, ctx.content.steuerEvents!, ctx.complexity, ctx.content);
          }
        },
      },
      {
        id: 'checkFollowupEvents',
        safe: true,
        run(ctx) { ctx.s = checkFollowupEvents(ctx.s, ctx.content.events); },
      },
      {
        id: 'checkRandomEvents',
        safe: true,
        run(ctx) { ctx.s = checkRandomEvents(ctx.s, ctx.content.events); },
      },
      {
        id: 'syncMediaStatePublic',
        safe: false,
        run(ctx) { ctx.s = syncMediaState(ctx.s); },
      },
    ],
  },

  // ─── Phase 6: Election & Game End ────────────────────────────────────────────
  {
    id: 'phaseElectionAndGameEnd',
    systems: [
      {
        id: 'wahlkampfBlock',
        safe: false,
        run(ctx) {
          const { content, complexity } = ctx;
          ctx.s = checkWahlkampfBeginn(ctx.s, content, complexity);
          if (ctx.s.wahlkampfAktiv) {
            ctx.s = { ...ctx.s, wahlkampfAktionenGenutzt: 0 };
            if (!ctx.s.activeEvent) ctx.s = checkWahlkampfThemaWahl(ctx.s, content, complexity);
            if (!ctx.s.activeEvent) ctx.s = checkWahlkampfZwischenbilanz(ctx.s, content, complexity);
            if (!ctx.s.activeEvent) ctx.s = checkTVDuell(ctx.s, content, complexity);
            if (!ctx.s.activeEvent) ctx.s = checkWahlkampfVersprechen(ctx.s, content, complexity);
            if (!ctx.s.activeEvent) ctx.s = checkKoalitionspartnerAlleingang(ctx.s, content, complexity);
          }
        },
      },
      {
        id: 'roundKpi',
        safe: false,
        run(ctx) { ctx.s = { ...ctx.s, kpi: roundKpi(ctx.s.kpi) }; },
      },
      {
        id: 'zustimmungBlock',
        safe: false,
        run(ctx) {
          const { content, complexity } = ctx;
          ctx.s = { ...ctx.s, zustOffsets: decayZustOffsets(ctx.s.zustOffsets) };
          let newZust = recalcApproval(ctx.s.kpi, ctx.s.zust, ctx.s.zustOffsets);
          if (content.milieus && content.milieus.length > 0) {
            let g = berechneWahlprognose({ ...ctx.s, zust: newZust }, content, complexity);
            if (ctx.s.verfassungsgerichtAktiv && !ctx.s.verfassungsgerichtPausiert) {
              g = Math.max(0, g - 3);
            }
            newZust = { ...newZust, g };
          }
          ctx.s = { ...ctx.s, zust: newZust };
          if (content.milieus && content.milieus.length > 0) {
            ctx.s = applyMilieuDrift(ctx.s, content.milieus, complexity);
          }
        },
      },
      {
        id: 'syncMediaStateElection',
        safe: false,
        run(ctx) { ctx.s = syncMediaState(ctx.s); },
      },
    ],
  },

  // ─── Phase 7: History & Diagnostics ─────────────────────────────────────────
  {
    id: 'phaseHistoryAndDiagnostics',
    systems: [
      {
        id: 'trackApprovalHistory',
        safe: false,
        run(ctx) {
          ctx.s = { ...ctx.s, approvalHistory: trimHistory(ctx.s.approvalHistory ?? [], ctx.s.zust.g, HISTORY_MAX_MONTHS) };
        },
      },
      {
        id: 'trackKPIAndSaldoHistory',
        safe: false,
        run(ctx) {
          const prevKpiHist = ctx.s.kpiHistory ?? { al: [], hh: [], gi: [], zf: [] };
          ctx.s = {
            ...ctx.s,
            kpiHistory: {
              al: trimHistory(prevKpiHist.al, ctx.s.kpi.al, KPI_HISTORY_MAX_MONTHS),
              hh: trimHistory(prevKpiHist.hh, ctx.s.kpi.hh, KPI_HISTORY_MAX_MONTHS),
              gi: trimHistory(prevKpiHist.gi, ctx.s.kpi.gi, KPI_HISTORY_MAX_MONTHS),
              zf: trimHistory(prevKpiHist.zf, ctx.s.kpi.zf, KPI_HISTORY_MAX_MONTHS),
            },
            haushaltSaldoHistory: trimHistory(ctx.s.haushaltSaldoHistory ?? [], ctx.s.haushalt?.saldo ?? 0, KPI_HISTORY_MAX_MONTHS),
            konjunkturIndexHistory: trimHistory(
              ctx.s.konjunkturIndexHistory ?? [],
              ctx.s.haushalt?.konjunkturIndex ?? 0,
              KPI_HISTORY_MAX_MONTHS,
            ),
          };
        },
      },
      {
        id: 'cleanupVerfassungsgericht',
        safe: false,
        run(ctx) {
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
        },
      },
      {
        id: 'trackMilieuHistory',
        safe: false,
        run(ctx) {
          if (ctx.s.milieuZustimmung && Object.keys(ctx.s.milieuZustimmung).length > 0) {
            const history = { ...(ctx.s.milieuZustimmungHistory ?? {}) };
            for (const [mid, val] of Object.entries(ctx.s.milieuZustimmung)) {
              const arr = history[mid] ?? [];
              history[mid] = trimHistory(arr, val, HISTORY_MAX_MONTHS);
            }
            ctx.s = { ...ctx.s, milieuZustimmungHistory: history };
          }
        },
      },
      {
        id: 'tickWahlkampfPrognoseFn',
        safe: false,
        run(ctx) {
          if (ctx.s.wahlkampfAktiv) ctx.s = tickWahlkampfPrognose(ctx.s, ctx.content, ctx.complexity);
        },
      },
      {
        id: 'triggerWahlnachtFn',
        safe: false,
        run(ctx) {
          if (ctx.s.month === 48) ctx.s = triggerWahlnacht(ctx.s, ctx.content, ctx.complexity);
        },
      },
      {
        id: 'misstrauensvotumWarnung',
        safe: false,
        run(ctx) {
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
        },
      },
      {
        id: 'attachTickLogAndDiagnostics',
        safe: false,
        run(ctx) {
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
        },
      },
      {
        id: 'berechneMonatsDiffFn',
        safe: false,
        run(ctx) {
          ctx.s = { ...ctx.s, letzterMonatsDiff: berechneMonatsDiff(ctx.originalState, ctx.s, ctx.content) };
        },
      },
      {
        // mkEnd wird sowohl für medienKlimaHistory als auch updateAgendaHistoryTrackers benötigt
        // → beide Aufrufe als eine Einheit, gefolgt von syncMediaState.
        id: 'trackMedienKlimaHistoryAndSync',
        safe: false,
        run(ctx) {
          const mkEnd = roundMedienKlimaIndex(ctx.s.medienKlima ?? ctx.s.zust.g);
          ctx.s = {
            ...ctx.s,
            medienKlimaHistory: trimHistory(ctx.s.medienKlimaHistory ?? [], mkEnd, HISTORY_MAX_MONTHS),
          };
          ctx.s = updateAgendaHistoryTrackers(ctx.s, mkEnd);
          ctx.s = syncMediaState(ctx.s);
        },
      },
      {
        id: 'logSlowTick',
        safe: false,
        run(ctx) {
          const tickDuration = performance.now() - ctx.t0;
          if (tickDuration > 50) {
            logger.warn(`Engine: Tick ${ctx.s.month} took ${tickDuration.toFixed(1)}ms`, { durationMs: tickDuration });
          }
        },
      },
    ],
  },
];

/** Führt alle Systeme einer Phase aus (interne Hilfsfunktion für Phase-Wrapper). */
function runPhase(ctx: TickContext, phaseIndex: number): void {
  for (const sys of ENGINE_PIPELINE[phaseIndex].systems) {
    runSystem(ctx, sys);
  }
}

/**
 * Phase 1 — Pre-Tick: Cooldowns aufräumen, Spielende prüfen, Pending Effects.
 * Setzt `ctx.s.gameOver`, wenn der Tick abgebrochen werden soll; tick() prüft das
 * danach und kehrt frühzeitig zurück.
 */
export function phasePreTick(ctx: TickContext): void { runPhase(ctx, 0); }

/**
 * Phase 2 — Policy & Legislation: eingebrachte Gesetze, Vermittlungsausschuss,
 * Vorstufen-Routes (Kommunal/Länder), EU-Route, Gesetz-Vorstufen.
 */
export function phasePolicyAndLegislation(ctx: TickContext): void { runPhase(ctx, 1); }

/**
 * Phase 3 — Economy & Budget: Haushalt/Konjunktur, Politikfeld-Druck,
 * Extremismus-Druck, PK-Regen und Konjunkturdrift.
 */
export function phaseEconomyAndBudget(ctx: TickContext): void { runPhase(ctx, 2); }

/**
 * Phase 4 — Actors & Institutions: Char-Boni & Koalitionsstabilität, Koalition,
 * Verbände & Ministerial, Sachverständigenrat, EU, Ultimatums, Bundesrat,
 * Normenkontrolle.
 */
export function phaseActorsAndInstitutions(ctx: TickContext): void { runPhase(ctx, 3); }

/**
 * Phase 5 — Public & Media: Medienklima und alle Event-Checks
 * (Kommunal, Länder, Steuer, Follow-up, Zufall).
 */
export function phasePublicAndMedia(ctx: TickContext): void { runPhase(ctx, 4); }

/**
 * Phase 6 — Election & Game End: Wahlkampf-Trigger, KPI-Rundung, Zustimmung &
 * Wahlprognose neu berechnen, Milieu-Drift.
 */
export function phaseElectionAndGameEnd(ctx: TickContext): void { runPhase(ctx, 5); }

/**
 * Phase 7 — History & Diagnostics: alle Verlaufs-Tracker, späte Wahl-Hooks
 * (Wahlkampf-Prognose, Wahlnacht), Misstrauensvotum-Warnung, tickLog/Monatsdiff
 * anhängen und Performance-Logging.
 */
export function phaseHistoryAndDiagnostics(ctx: TickContext): void { runPhase(ctx, 6); }

/**
 * Monatlicher Engine-Tick: öffentlicher Einstiegspunkt. Iteriert generisch über
 * ENGINE_PIPELINE; Reihenfolge, Feature-Gating und Early-Exit sind dort deklariert.
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
    phase: ENGINE_PIPELINE[0].id,
  };

  for (const phase of ENGINE_PIPELINE) {
    ctx.phase = phase.id;
    for (const sys of phase.systems) {
      runSystem(ctx, sys);
    }
    if (phase.checkAbort?.(ctx)) return ctx.s;
  }

  return ctx.s;
}

export type { TickContext, EngineSystem, EnginePhase };
export { ENGINE_PIPELINE };
