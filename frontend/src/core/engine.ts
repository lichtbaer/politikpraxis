import type { GameState, ContentBundle, TickLogEntry } from './types';
import { withPause, getAutoPauseLevel } from './eventPause';
import { PK_REGEN_DIVISOR, PK_MAX } from './constants';
import { applyPendingEffects, applyKPIDrift, recalcApproval } from './systems/economy';
import { berechneWahlprognose } from './systems/wahlprognose';
import { applyCharBonuses, checkUltimatums } from './systems/characters';
import { updateCoalitionStability } from './systems/coalition';
import { advanceRoutes } from './systems/levels';
import { checkRandomEvents, checkBundesratEvents, checkKommunalEvents, checkKommunalLaenderEvents, checkSteuerEvents } from './systems/events';
import { checkGameEnd } from './systems/election';
import { executeBundesratVote } from './systems/bundesrat';
import { resolveEingebrachteAbstimmung } from './systems/parliament';
import { tickKoalitionspartner, checkKoalitionsbruch, updateKoalitionsvertragScore } from './systems/koalition';
import { checkPolitikfeldDruck } from './systems/politikfeldDruck';
import { checkVerbandsAktionen } from './systems/verbaende';
import { checkMinisterialInitiativen } from './systems/ministerialInitiativen';
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
  tickWahlkampfPrognose,
  triggerWahlnacht,
} from './systems/wahlkampf';
import { tickMedienKlima } from './systems/medienklima';
import { featureActive } from './systems/features';
import { tickExtremismusDruck } from './ideologie';
import { SPRECHER_ERSATZ, LANDTAGSWAHL_TRANSITIONS } from '../stores/contentStore';

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

  const tickLog: TickLogEntry[] = [];
  let s: GameState = { ...state, month: state.month + 1, kpiPrev: { ...state.kpi }, tickLog: [] };

  // 1. Zeit: Spielende prüfen
  s = checkGameEnd(s);
  if (s.gameOver) return s;

  // 2. Pending Effects (inkl. SMA-278: Medienklima-Historie)
  const medienVal = s.medienKlima ?? s.zust.g;
  const medienHist = [...(s.medienKlimaHistory ?? []), medienVal].slice(-48);
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
        ? { milieus: content.milieus, complexity }
        : undefined;
      s = resolveEingebrachteAbstimmung(s, eg, voteContext);
      const newLaw = s.gesetze.find(g => g.id === eg.gesetzId);
      if (newLaw?.status === 'beschlossen') {
        s = updateKoalitionsvertragScore(s, eg.gesetzId, content, complexity);
      }
    }
  }

  const routesResult = advanceRoutes(s);
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
  s = advanceEURoute(s);
  s = tickGesetzVorstufen(s, content, complexity);

  // 4. Haushalt
  const kpiBeforeHaushalt = { ...s.kpi };
  s = tickKonjunktur(s, complexity);
  s = applySchuldenbremsenEffekte(s, complexity, content);
  s = checkLehmannSparvorschlag(s, complexity);
  s = checkLehmannDefizitStart(s, content, complexity);
  s = checkHaushaltskrise(s, content, complexity);
  s = triggerHaushaltsdebatte(s, complexity, content.politikfelder ?? []);

  for (const key of ['al', 'hh', 'gi', 'zf'] as const) {
    const delta = +(s.kpi[key] - kpiBeforeHaushalt[key]).toFixed(2);
    if (delta !== 0) {
      tickLog.push({ source: 'Haushalt & Konjunktur', target: key, delta });
    }
  }
  // 5. Politikfeld-Druck
  const allEvents = [...(content.events ?? []), ...Object.values(content.charEvents ?? {})];
  s = checkPolitikfeldDruck(s, content.politikfelder ?? [], complexity, allEvents);

  // 5b. Extremismus-Druck (SMA-280): Koalitionspartner-Warnung, Verfassungsgericht
  if (
    featureActive(complexity, 'extremismus_eskalation') &&
    ausrichtung &&
    content.extremismusEvents?.length
  ) {
    s = tickExtremismusDruck(s, ausrichtung, content.extremismusEvents, complexity);
  }

  // 6. PK-Regen (skaliert nach Schwierigkeitsgrad: höhere Stufe = weniger PK)
  const pkRegenDivisor = PK_REGEN_DIVISOR + (complexity - 1) * 3; // Stufe 1: 25, Stufe 2: 28, Stufe 3: 31, Stufe 4: 34
  const pkRegen = Math.max(1, Math.floor(s.zust.g / pkRegenDivisor));
  s = { ...s, pk: Math.min(PK_MAX, s.pk + pkRegen) };

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
  s = tickKoalitionspartner(s, content, complexity);
  s = checkKoalitionsbruch(s, content, complexity);
  // 9. Verbände & Ministerial
  s = checkVerbandsAktionen(s, content.verbaende ?? [], complexity);
  s = checkMinisterialInitiativen(s, content.ministerialInitiativen ?? [], complexity);
  // 10. EU
  s = tickEUKlima(s, content.verbaende ?? [], complexity);
  s = checkEUEreignisse(s, content, complexity);

  // 11. Chars: Ultimatums
  s = checkUltimatums(s, content.charEvents);
  // 12. Bundesrat (SMA-291: Stufe 1 unsichtbar — keine Abstimmung, keine Events)
  if (featureActive(complexity, 'bundesrat_sichtbar')) {
    s = processBundesratVotes(s, content, complexity);
    s = checkBundesratEvents(s, {
      bundesratEvents: content.bundesratEvents ?? [],
      sprecherErsatz: SPRECHER_ERSATZ,
      landtagswahlTransitions: LANDTAGSWAHL_TRANSITIONS,
    });
  }
  // 12b. Medienklima (SMA-277): Drift, Opposition, Skandale, positive Events
  s = tickMedienKlima(s, content, complexity);

  // 13. Events
  s = checkKommunalEvents(s, { kommunalEvents: content.kommunalEvents ?? [] }, complexity);
  if (featureActive(complexity, 'kommunal_pilot') && content.kommunalLaenderEvents?.length) {
    s = checkKommunalLaenderEvents(s, content.kommunalLaenderEvents, complexity);
  }
  if (content.steuerEvents?.length) {
    s = checkSteuerEvents(s, content.steuerEvents, complexity);
  }
  s = checkRandomEvents(s, content.events);

  // 14. Wahlkampf (SMA-278: Monat 43+)
  s = checkWahlkampfBeginn(s, content, complexity);
  if (s.wahlkampfAktiv) {
    s = { ...s, wahlkampfAktionenGenutzt: 0 };
    if (!s.activeEvent) s = checkTVDuell(s, content, complexity);
    if (!s.activeEvent) s = checkKoalitionspartnerAlleingang(s, content, complexity);
  }

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
      const next = [...arr, val].slice(-3);
      history[mid] = next;
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
  if (lowMonths >= 3 && lowMonths < 6) {
    const remaining = 6 - lowMonths;
    s = {
      ...s,
      log: [
        { time: formatTickTime(s.month), msg: `⚠ Misstrauensvotum droht! Noch ${remaining} Monat(e) unter 20% bis zum Sturz.`, type: 'danger' },
        ...s.log,
      ].slice(0, 60),
    };
  }

  // Attach the tick change log
  s = { ...s, tickLog };

  return s;
}

/** Führt Bundesratsabstimmungen durch, wenn brVoteMonth erreicht */
function processBundesratVotes(state: GameState, content: ContentBundle, complexity: number): GameState {
  let s = state;
  const voteContext = content.milieus
    ? { milieus: content.milieus, complexity }
    : undefined;
  for (const law of s.gesetze) {
    if (law.status === 'bt_passed' && law.brVoteMonth != null && s.month >= law.brVoteMonth) {
      const prevLaw = s.gesetze.find(g => g.id === law.id);
      s = executeBundesratVote(s, law.id, voteContext);
      const newLaw = s.gesetze.find(g => g.id === law.id);
      if (prevLaw?.status === 'bt_passed' && newLaw?.status === 'beschlossen') {
        s = updateKoalitionsvertragScore(s, law.id, content, complexity);
      }
    }
  }
  return s;
}
