import type { GameState, ContentBundle, TickLogEntry } from './types';
import { withPause, getAutoPauseLevel } from './eventPause';
import {
  PK_REGEN_DIVISOR, PK_REGEN_MIN, PK_MAX,
  HISTORY_MAX_MONTHS, KPI_HISTORY_MAX_MONTHS, MAX_LOG_ENTRIES,
  MISSTRAUENSVOTUM_MONATE, trimHistory,
} from './constants';
import { applyPendingEffects, applyKPIDrift, recalcApproval, roundKpi } from './systems/economy';
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
import { tickGesetzVorstufen } from './systems/gesetzLebenszyklus';
import {
  checkWahlkampfBeginn,
  checkTVDuell,
  checkKoalitionspartnerAlleingang,
  checkWahlkampfThemaWahl,
  checkWahlkampfVersprechen,
  tickWahlkampfPrognose,
  triggerWahlnacht,
} from './systems/wahlkampf';
import { tickMedienKlima, berechneMedianklima } from './systems/medienklima';
import { tickVermittlungsausschuss } from './systems/vermittlung';
import { featureActive } from './systems/features';
import { applyMilieuDrift } from './systems/milieus';
import { tickExtremismusDruck } from './ideologie';
import { checkSachverstaendigenrat } from './systems/sachverstaendigenrat';
import { tickNormenkontrolle } from './systems/verfassungsgericht';
import { SPRECHER_ERSATZ, LANDTAGSWAHL_TRANSITIONS } from '../data/defaults/bundesratEvents';
import { berechneMonatsDiff } from './monatszusammenfassung';

export { addLog } from './log';

function formatTickTime(month: number): string {
  const yr = 2025 + Math.floor((month - 1) / 12);
  const mo = ((month - 1) % 12) + 1;
  return `${String(mo).padStart(2, '0')}/${yr}`;
}

/**
 * Monatlicher Engine-Tick: Reihenfolge der Systeme.
 *
 * 1. Zeit: Monat erhöhen, Spielende prüfen
 * 2. Pending Effects: geplante KPI-/State-Änderungen anwenden
 * 3. Vorstufen: Routes (Kommunal/Länder) + EU-Route + Gesetz-Vorstufen
 * 4. Haushalt: Konjunktur, Schuldenbremse, Lehmann, Haushaltsdebatte
 * 5. Politikfeld-Druck: Ideologie-Events
 * 6. PK-Regen: Politik-Kapital aus Zustimmung
 * 7. KPI/Chars: KPIDrift, Char-Boni, Koalitionsstabilität
 * 8. Koalition: Partner-Tick, Koalitionsbruch
 * 9. Verbände & Ministerial: Verbandsaktionen, Ministerial-Initiativen
 * 10. EU: Klima-Tick, EU-Ereignisse
 * 11. Chars: Ultimatums
 * 12. Bundesrat: Abstimmungen, Events (Landtagswahl, Sprecher)
 * 13. Events: Kommunal, Zufall
 * 14. Wahlkampf: Beginn, TV-Duell, Koalitionspartner-Alleingang (Monat 43+)
 * 15. Zustimmung: Milieu-Wahlprognose, Zustimmung neu berechnen
 * 16. Milieu-History: Zustimmung pro Milieu speichern
 */
export function tick(
  state: GameState,
  content: ContentBundle,
  complexity: number = 4,
  ausrichtung?: { wirtschaft: number; gesellschaft: number; staat: number },
): GameState {
  if (state.gameOver) return state;

  const t0 = performance.now();
  const tickLog: TickLogEntry[] = [];
  let s: GameState = { ...state, month: state.month + 1, kpiPrev: { ...state.kpi }, tickLog: [] };

  /** Wraps a system call in try-catch to prevent a single failing system from crashing the game.
   *  On failure, returns the current state `s` — since `s` is reassigned after each successful
   *  system call, this preserves all prior successful changes instead of reverting to an earlier snapshot. */
  function safeSystem(fn: (current: GameState) => GameState, name: string): GameState {
    try {
      return fn(s);
    } catch (err) {
      console.error(`[Engine] System "${name}" failed in tick ${s.month}:`, err);
      return s;
    }
  }

  // 0. Prune expired event cooldowns to prevent unbounded growth
  s = pruneExpiredCooldowns(s);

  // 1. Zeit: Spielende prüfen
  s = checkGameEnd(s);
  if (s.gameOver) return s;

  // 2. Pending Effects (inkl. SMA-278: Medienklima-Historie)
  const medienVal = s.medienKlima ?? s.zust.g;
  const medienHist = trimHistory(s.medienKlimaHistory ?? [], medienVal, HISTORY_MAX_MONTHS);
  s = { ...s, medienKlimaHistory: medienHist };
  if (s.medienKlima == null) s = { ...s, medienKlima: 55 };

  const kpiBeforePending = { ...s.kpi };
  s = applyPendingEffects(s);
  // Track KPI changes from pending effects
  for (const key of ['al', 'hh', 'gi', 'zf'] as const) {
    const delta = +(s.kpi[key] - kpiBeforePending[key]).toFixed(2);
    if (delta !== 0) {
      tickLog.push({ source: 'Gesetzwirkung', target: key, delta });
    }
  }

  // SMA-304: Eingebrachte Gesetze — Abstimmung wenn Abstimmungsmonat erreicht
  const eingebrachte = s.eingebrachteGesetze ?? [];
  for (const eg of eingebrachte) {
    if (s.month >= eg.abstimmungMonat) {
      const voteContext = content.milieus
        ? { milieus: content.milieus, complexity, gesetzRelationen: content.gesetzRelationen, content }
        : undefined;
      s = resolveEingebrachteAbstimmung(s, eg, voteContext);
      const newLaw = s.gesetze.find(g => g.id === eg.gesetzId);
      if (newLaw?.status === 'beschlossen') {
        s = updateKoalitionsvertragScore(s, eg.gesetzId, content, complexity);
        s = applyRessortKonflikt(s, newLaw.politikfeldId);
      }
    }
  }

  // 2b. Vermittlungsausschuss: abschließen wenn Frist erreicht
  const vermittlungCtx = content.milieus
    ? { milieus: content.milieus, complexity, gesetzRelationen: content.gesetzRelationen, content }
    : undefined;
  s = safeSystem((st) => tickVermittlungsausschuss(st, vermittlungCtx), 'tickVermittlungsausschuss');

  const routesResult = advanceRoutes(s, content, complexity);
  s = routesResult.state;
  if (routesResult.completedVorstufe && !s.activeEvent) {
    const ev = routesResult.completedVorstufe.route === 'kommune'
      ? (content.vorstufenEvents ?? []).find(e => e.id === 'vorstufe_kommunal_erfolg')
      : (content.vorstufenEvents ?? []).find(e => e.id === 'vorstufe_laender_erfolg');
    if (ev) {
      const evWithLaw = { ...ev, lawId: routesResult.completedVorstufe.lawId };
      s = { ...s, activeEvent: evWithLaw, ...withPause(s, getAutoPauseLevel(ev)) };
    }
  }
  s = advanceEURoute(s, content, complexity);
  s = tickGesetzVorstufen(s, content, complexity);

  // 4. Haushalt
  const kpiBeforeHaushalt = { ...s.kpi };
  s = safeSystem((st) => tickKonjunktur(st, complexity), 'tickKonjunktur');
  s = safeSystem((st) => applySchuldenbremsenEffekte(st, complexity, content), 'applySchuldenbremsenEffekte');
  s = safeSystem((st) => checkLehmannSparvorschlag(st, complexity), 'checkLehmannSparvorschlag');
  s = safeSystem((st) => checkLehmannDefizitStart(st, content, complexity), 'checkLehmannDefizitStart');
  s = safeSystem((st) => checkHaushaltskrise(st, content, complexity), 'checkHaushaltskrise');
  s = safeSystem((st) => checkDynamischeEvents(st, content, complexity), 'checkDynamischeEvents');
  s = safeSystem((st) => triggerHaushaltsdebatte(st, complexity, content.politikfelder ?? []), 'triggerHaushaltsdebatte');

  for (const key of ['al', 'hh', 'gi', 'zf'] as const) {
    const delta = +(s.kpi[key] - kpiBeforeHaushalt[key]).toFixed(2);
    if (delta !== 0) {
      tickLog.push({ source: 'Haushalt & Konjunktur', target: key, delta });
    }
  }
  // 5. Politikfeld-Druck
  const allEvents = [...(content.events ?? []), ...Object.values(content.charEvents ?? {})];
  s = safeSystem((st) => checkPolitikfeldDruck(st, content.politikfelder ?? [], complexity, allEvents), 'checkPolitikfeldDruck');

  // 5b. Extremismus-Druck (SMA-280): Koalitionspartner-Warnung, Verfassungsgericht
  if (
    featureActive(complexity, 'extremismus_eskalation') &&
    ausrichtung &&
    content.extremismusEvents?.length
  ) {
    s = safeSystem((st) => tickExtremismusDruck(st, ausrichtung!, content.extremismusEvents!, complexity), 'tickExtremismusDruck');
  }

  // 6. PK-Regen (skaliert nach Schwierigkeitsgrad: höhere Stufe = weniger PK)
  const pkRegenDivisor = PK_REGEN_DIVISOR + (complexity - 1) * 3; // Stufe 1: 25, Stufe 2: 28, Stufe 3: 31, Stufe 4: 34
  const pkRegenMin = PK_REGEN_MIN + Math.max(0, 4 - complexity); // Stufe 1: 6, Stufe 2: 5, Stufe 3: 4, Stufe 4: 3
  const pkRegen = Math.max(pkRegenMin, Math.floor(s.zust.g / pkRegenDivisor));
  s = { ...s, pk: Math.min(PK_MAX, s.pk + pkRegen) };

  // Krisen-PK: Bei drohendem Misstrauensvotum (2+ Monate unter 20%) erhält Spieler Bonus-PK
  if ((s.lowApprovalMonths ?? 0) >= 2) {
    s = { ...s, pk: Math.min(PK_MAX, s.pk + 5) };
  }

  // 7. KPI/Chars
  const kpiBeforeDrift = { ...s.kpi };
  s = { ...s, kpi: applyKPIDrift(s.kpi) };
  for (const key of ['al', 'hh', 'gi', 'zf'] as const) {
    const delta = +(s.kpi[key] - kpiBeforeDrift[key]).toFixed(2);
    if (delta !== 0) {
      tickLog.push({ source: 'Konjunkturdrift', target: key, delta });
    }
  }
  s = applyCharBonuses(s);
  s = updateCoalitionStability(s);

  // 8. Koalition
  s = safeSystem((st) => tickKoalitionspartner(st, content, complexity), 'tickKoalitionspartner');
  s = safeSystem((st) => checkKoalitionsbruch(st, content, complexity), 'checkKoalitionsbruch');
  // 9. Verbände & Ministerial
  s = safeSystem((st) => checkVerbandsAktionen(st, content.verbaende ?? [], complexity), 'checkVerbandsAktionen');
  s = safeSystem((st) => checkMinisterialInitiativen(st, content.ministerialInitiativen ?? [], complexity), 'checkMinisterialInitiativen');
  // 9b. SMA-330: Minister-Agenden (kontinuierliche Forderungen)
  s = safeSystem((st) => checkMinisterAgenden(st, complexity), 'checkMinisterAgenden');
  // 9c. Sachverständigenrat (SVR-Jahresgutachten alle 12 Monate, Stufe 2+)
  s = safeSystem((st) => checkSachverstaendigenrat(st, content, complexity), 'checkSachverstaendigenrat');

  // 10. EU
  s = safeSystem((st) => tickEUKlima(st, content.verbaende ?? [], complexity), 'tickEUKlima');
  s = safeSystem((st) => checkEUEreignisse(st, content, complexity), 'checkEUEreignisse');

  // 11. Chars: Ultimatums
  s = safeSystem((st) => checkUltimatums(st, content.charEvents), 'checkUltimatums');
  // 12. Bundesrat (SMA-291: Stufe 1 unsichtbar — keine Abstimmung, keine Events)
  if (featureActive(complexity, 'bundesrat_sichtbar')) {
    s = safeSystem((st) => processBundesratVotes(st, content, complexity), 'processBundesratVotes');
    s = safeSystem((st) => checkBundesratEvents(st, {
      bundesratEvents: content.bundesratEvents ?? [],
      sprecherErsatz: SPRECHER_ERSATZ,
      landtagswahlTransitions: LANDTAGSWAHL_TRANSITIONS,
    }), 'checkBundesratEvents');
    s = safeSystem(
      (st) => checkBundesratLaenderEvents(st, content, complexity),
      'checkBundesratLaenderEvents',
    );
  }
  // 12b. Normenkontrolle: BVerfG-Verfahren abschließen (Stufe 3+)
  s = safeSystem((st) => tickNormenkontrolle(st, complexity, content), 'tickNormenkontrolle');

  // 12c. Medienklima (SMA-277): Drift, Opposition, Skandale, positive Events
  s = safeSystem((st) => tickMedienKlima(st, content, complexity), 'tickMedienKlima');
  if (featureActive(complexity, 'medien_akteure_2') && s.medienAkteure && Object.keys(s.medienAkteure).length > 0) {
    s = { ...s, medienKlima: berechneMedianklima(s) };
  }

  // 13. Events
  s = safeSystem((st) => checkKommunalEvents(st, { kommunalEvents: content.kommunalEvents ?? [] }, complexity), 'checkKommunalEvents');
  if (featureActive(complexity, 'kommunal_pilot') && content.kommunalLaenderEvents?.length) {
    s = safeSystem((st) => checkKommunalLaenderEvents(st, content.kommunalLaenderEvents!, complexity), 'checkKommunalLaenderEvents');
  }
  if (content.steuerEvents?.length) {
    s = safeSystem((st) => checkSteuerEvents(st, content.steuerEvents!, complexity, content), 'checkSteuerEvents');
  }
  // 13b. Follow-up Events (complexity >= 4)
  s = safeSystem((st) => checkFollowupEvents(st, content.events), 'checkFollowupEvents');
  s = safeSystem((st) => checkRandomEvents(st, content.events), 'checkRandomEvents');

  // 14. Wahlkampf (SMA-278: Monat 43+)
  s = checkWahlkampfBeginn(s, content, complexity);
  if (s.wahlkampfAktiv) {
    s = { ...s, wahlkampfAktionenGenutzt: 0 };
    if (!s.activeEvent) s = checkWahlkampfThemaWahl(s, content, complexity);
    if (!s.activeEvent) s = checkTVDuell(s, content, complexity);
    if (!s.activeEvent) s = checkWahlkampfVersprechen(s, content, complexity);
    if (!s.activeEvent) s = checkKoalitionspartnerAlleingang(s, content, complexity);
  }

  // 14b. KPI-Rundung: einmalig am Tick-Ende statt pro Einzeleffekt (vermeidet Rundungsfehler-Kaskaden)
  s = { ...s, kpi: roundKpi(s.kpi) };

  // 15. Zustimmung
  let newZust = recalcApproval(s.kpi, s.zust);
  if (content.milieus && content.milieus.length > 0) {
    let g = berechneWahlprognose({ ...s, zust: newZust }, content, complexity);
    // SMA-280: Verfassungsgericht-Verfahren: -3% Wahlprognose
    if (s.verfassungsgerichtAktiv && !s.verfassungsgerichtPausiert) {
      g = Math.max(0, g - 3);
    }
    newZust = { ...newZust, g };
  }
  s = { ...s, zust: newZust };

  // 15b. Milieu-Drift: Milieus passen sich an KPI-basierte Segmentwerte an
  if (content.milieus && content.milieus.length > 0) {
    s = applyMilieuDrift(s, content.milieus, complexity);
  }

  // Approval-History: allgemeine Zustimmung pro Monat tracken
  s = { ...s, approvalHistory: trimHistory(s.approvalHistory ?? [], newZust.g, HISTORY_MAX_MONTHS) };

  // KPI-History: letzte 12 Monate pro KPI für Trendanzeige
  const prevKpiHist = s.kpiHistory ?? { al: [], hh: [], gi: [], zf: [] };
  s = {
    ...s,
    kpiHistory: {
      al: trimHistory(prevKpiHist.al, s.kpi.al, KPI_HISTORY_MAX_MONTHS),
      hh: trimHistory(prevKpiHist.hh, s.kpi.hh, KPI_HISTORY_MAX_MONTHS),
      gi: trimHistory(prevKpiHist.gi, s.kpi.gi, KPI_HISTORY_MAX_MONTHS),
      zf: trimHistory(prevKpiHist.zf, s.kpi.zf, KPI_HISTORY_MAX_MONTHS),
    },
    // SMA-323: Haushalt-Saldo-Verlauf für Chart (Mrd.)
    haushaltSaldoHistory: trimHistory(s.haushaltSaldoHistory ?? [], s.haushalt?.saldo ?? 0, KPI_HISTORY_MAX_MONTHS),
    konjunkturIndexHistory: trimHistory(
      s.konjunkturIndexHistory ?? [],
      s.haushalt?.konjunkturIndex ?? 0,
      KPI_HISTORY_MAX_MONTHS,
    ),
  };

  // SMA-280: Verfassungsgericht-Verfahren beenden wenn Frist abgelaufen
  if (
    s.verfassungsgerichtAktiv &&
    !s.verfassungsgerichtPausiert &&
    s.verfassungsgerichtVerfahrenBisMonat != null &&
    s.month >= s.verfassungsgerichtVerfahrenBisMonat
  ) {
    s = {
      ...s,
      verfassungsgerichtAktiv: false,
      verfassungsgerichtVerfahrenBisMonat: undefined,
      verfassungsgerichtPolitikfeldIds: undefined,
    };
  }

  // 16. Milieu-History
  if (s.milieuZustimmung && Object.keys(s.milieuZustimmung).length > 0) {
    const history = { ...(s.milieuZustimmungHistory ?? {}) };
    for (const [mid, val] of Object.entries(s.milieuZustimmung)) {
      const arr = history[mid] ?? [];
      history[mid] = trimHistory(arr, val, HISTORY_MAX_MONTHS);
    }
    s = { ...s, milieuZustimmungHistory: history };
  }

  if (s.wahlkampfAktiv) {
    s = tickWahlkampfPrognose(s, content, complexity);
  }

  if (s.month === 48) {
    s = triggerWahlnacht(s, complexity);
  }

  // Misstrauensvotum-Warnung im Log
  const lowMonths = s.lowApprovalMonths ?? 0;
  if (lowMonths >= 3 && lowMonths < MISSTRAUENSVOTUM_MONATE) {
    const remaining = MISSTRAUENSVOTUM_MONATE - lowMonths;
    s = {
      ...s,
      log: [
        { time: formatTickTime(s.month), msg: `⚠ Misstrauensvotum droht! Noch ${remaining} Monat(e) unter 20% bis zum Sturz.`, type: 'danger' },
        ...s.log,
      ].slice(0, MAX_LOG_ENTRIES),
    };
  }

  // Attach the tick change log
  s = { ...s, tickLog };

  // SMA-396: Monatszusammenfassung (Diff zum Zustand vor diesem Tick)
  s = { ...s, letzterMonatsDiff: berechneMonatsDiff(state, s, content) };

  // Performance monitoring: log slow ticks (>50ms)
  const tickDuration = performance.now() - t0;
  if (tickDuration > 50) {
    console.warn(`[Engine] Tick ${s.month} took ${tickDuration.toFixed(1)}ms`);
  }

  return s;
}

/** Führt Bundesratsabstimmungen durch, wenn brVoteMonth erreicht */
function processBundesratVotes(state: GameState, content: ContentBundle, complexity: number): GameState {
  let s = flushPendingBundesratLandEvent(state, content.bundesratEvents);
  const voteContext = content.milieus
    ? { milieus: content.milieus, complexity, gesetzRelationen: content.gesetzRelationen, content }
    : undefined;
  for (const law of s.gesetze) {
    if (law.status === 'bt_passed' && law.brVoteMonth != null && s.month >= law.brVoteMonth) {
      const prevLaw = s.gesetze.find(g => g.id === law.id);
      s = executeBundesratVote(s, law.id, voteContext);
      const newLaw = s.gesetze.find(g => g.id === law.id);
      if (prevLaw?.status === 'bt_passed' && newLaw?.status === 'beschlossen') {
        s = updateKoalitionsvertragScore(s, law.id, content, complexity);
        s = applyRessortKonflikt(s, newLaw?.politikfeldId);
      }
    }
  }
  return s;
}
