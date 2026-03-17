import type { GameState, ContentBundle } from './types';
import { PK_REGEN_DIVISOR, PK_MAX } from './constants';
import { applyPendingEffects, applyKPIDrift, recalcApproval } from './systems/economy';
import { berechneWahlprognose } from './systems/wahlprognose';
import { applyCharBonuses, checkUltimatums } from './systems/characters';
import { updateCoalitionStability } from './systems/coalition';
import { advanceRoutes } from './systems/levels';
import { checkRandomEvents, checkBundesratEvents, checkKommunalEvents } from './systems/events';
import { checkGameEnd } from './systems/election';
import { executeBundesratVote } from './systems/bundesrat';
import { tickKoalitionspartner, checkKoalitionsbruch, updateKoalitionsvertragScore } from './systems/koalition';
import { checkPolitikfeldDruck } from './systems/politikfeldDruck';
import { checkVerbandsAktionen } from './systems/verbaende';
import { checkMinisterialInitiativen } from './systems/ministerialInitiativen';
import { tickEUKlima, advanceEURoute, checkEUEreignisse } from './systems/eu';
import {
  tickKonjunktur,
  applySchuldenbremsenEffekte,
  checkLehmannSparvorschlag,
  triggerHaushaltsdebatte,
} from './systems/haushalt';
import { tickGesetzVorstufen } from './systems/gesetzLebenszyklus';
import { SPRECHER_ERSATZ, LANDTAGSWAHL_TRANSITIONS } from '../stores/contentStore';

export { addLog } from './log';

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
 * 14. Zustimmung: Milieu-Wahlprognose, Zustimmung neu berechnen
 * 15. Milieu-History: Zustimmung pro Milieu speichern
 */
export function tick(state: GameState, content: ContentBundle, complexity: number = 4): GameState {
  if (state.gameOver) return state;

  let s: GameState = { ...state, month: state.month + 1, kpiPrev: { ...state.kpi } };

  // 1. Zeit: Spielende prüfen
  s = checkGameEnd(s);
  if (s.gameOver) return s;

  // 2. Pending Effects
  s = applyPendingEffects(s);
  const routesResult = advanceRoutes(s);
  s = routesResult.state;
  if (routesResult.completedVorstufe && !s.activeEvent) {
    const ev = routesResult.completedVorstufe.route === 'kommune'
      ? (content.vorstufenEvents ?? []).find(e => e.id === 'vorstufe_kommunal_erfolg')
      : (content.vorstufenEvents ?? []).find(e => e.id === 'vorstufe_laender_erfolg');
    if (ev) {
      s = { ...s, activeEvent: { ...ev, lawId: routesResult.completedVorstufe.lawId }, speed: 0 };
    }
  }
  s = advanceEURoute(s);
  s = tickGesetzVorstufen(s, content, complexity);

  // 4. Haushalt
  s = tickKonjunktur(s, complexity);
  s = applySchuldenbremsenEffekte(s, complexity, content);
  s = checkLehmannSparvorschlag(s, complexity);
  s = triggerHaushaltsdebatte(s, complexity, content.politikfelder ?? []);

  // 5. Politikfeld-Druck
  const allEvents = [...(content.events ?? []), ...Object.values(content.charEvents ?? {})];
  s = checkPolitikfeldDruck(s, content.politikfelder ?? [], complexity, allEvents);

  // 6. PK-Regen
  const pkRegen = Math.max(1, Math.floor(s.zust.g / PK_REGEN_DIVISOR));
  s = { ...s, pk: Math.min(PK_MAX, s.pk + pkRegen) };

  // 7. KPI/Chars
  s = { ...s, kpi: applyKPIDrift(s.kpi) };
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
  // 12. Bundesrat
  s = processBundesratVotes(s, content, complexity);
  s = checkBundesratEvents(s, {
    bundesratEvents: content.bundesratEvents ?? [],
    sprecherErsatz: SPRECHER_ERSATZ,
    landtagswahlTransitions: LANDTAGSWAHL_TRANSITIONS,
  });
  // 13. Events
  s = checkKommunalEvents(s, { kommunalEvents: content.kommunalEvents ?? [] }, complexity);
  s = checkRandomEvents(s, content.events);

  // 14. Zustimmung
  let newZust = recalcApproval(s.kpi, s.zust);
  if (content.milieus && content.milieus.length > 0) {
    const g = berechneWahlprognose({ ...s, zust: newZust }, content, complexity);
    newZust = { ...newZust, g };
  }
  s = { ...s, zust: newZust };

  // 15. Milieu-History
  if (s.milieuZustimmung && Object.keys(s.milieuZustimmung).length > 0) {
    const history = { ...(s.milieuZustimmungHistory ?? {}) };
    for (const [mid, val] of Object.entries(s.milieuZustimmung)) {
      const arr = history[mid] ?? [];
      const next = [...arr, val].slice(-3);
      history[mid] = next;
    }
    s = { ...s, milieuZustimmungHistory: history };
  }

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
