import type { GameState, ContentBundle } from './types';
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

export function tick(state: GameState, content: ContentBundle, complexity: number = 4): GameState {
  if (state.gameOver) return state;

  let s: GameState = { ...state, month: state.month + 1, kpiPrev: { ...state.kpi } };

  s = checkGameEnd(s);
  if (s.gameOver) return s;

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

  s = tickKonjunktur(s, complexity);
  s = applySchuldenbremsenEffekte(s, complexity, content);
  s = checkLehmannSparvorschlag(s, complexity);
  s = triggerHaushaltsdebatte(s, complexity, content.politikfelder ?? []);

  const allEvents = [...(content.events ?? []), ...Object.values(content.charEvents ?? {})];
  s = checkPolitikfeldDruck(s, content.politikfelder ?? [], complexity, allEvents);

  const pkRegen = Math.max(1, Math.floor(s.zust.g / 25));
  s = { ...s, pk: Math.min(150, s.pk + pkRegen) };

  s = { ...s, kpi: applyKPIDrift(s.kpi) };
  s = applyCharBonuses(s);
  s = updateCoalitionStability(s);

  s = tickKoalitionspartner(s, content, complexity);
  s = checkKoalitionsbruch(s, content, complexity);
  s = checkVerbandsAktionen(s, content.verbaende ?? [], complexity);
  s = checkMinisterialInitiativen(s, content.ministerialInitiativen ?? [], complexity);
  s = tickEUKlima(s, content.verbaende ?? [], complexity);
  s = checkEUEreignisse(s, content, complexity);

  s = checkUltimatums(s, content.charEvents);
  s = processBundesratVotes(s, content, complexity);
  s = checkBundesratEvents(s, {
    bundesratEvents: content.bundesratEvents ?? [],
    sprecherErsatz: SPRECHER_ERSATZ,
    landtagswahlTransitions: LANDTAGSWAHL_TRANSITIONS,
  });
  s = checkKommunalEvents(s, { kommunalEvents: content.kommunalEvents ?? [] }, complexity);
  s = checkRandomEvents(s, content.events);

  let newZust = recalcApproval(s.kpi, s.zust);
  if (content.milieus && content.milieus.length > 0) {
    const g = berechneWahlprognose({ ...s, zust: newZust }, content, complexity);
    newZust = { ...newZust, g };
  }
  s = { ...s, zust: newZust };

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
