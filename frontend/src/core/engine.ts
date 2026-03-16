import type { GameState, ContentBundle } from './types';
import { applyPendingEffects, applyKPIDrift, recalcApproval } from './systems/economy';
import { applyCharBonuses, checkUltimatums } from './systems/characters';
import { updateCoalitionStability } from './systems/coalition';
import { advanceRoutes } from './systems/levels';
import { checkRandomEvents } from './systems/events';
import { checkGameEnd } from './systems/election';
import { executeBundesratVote, checkKohlSabotage } from './systems/bundesrat';

export function addLog(state: GameState, msg: string, type: string): GameState {
  const yr = 2025 + Math.floor((state.month - 1) / 12);
  const mo = ((state.month - 1) % 12) + 1;
  const time = `${String(mo).padStart(2, '0')}/${yr}`;
  const log = [{ time, msg, type }, ...state.log].slice(0, 60);
  return { ...state, log };
}

export function tick(state: GameState, content: ContentBundle): GameState {
  if (state.gameOver) return state;

  let s: GameState = { ...state, month: state.month + 1, kpiPrev: { ...state.kpi } };

  s = checkGameEnd(s);
  if (s.gameOver) return s;

  s = applyPendingEffects(s);
  s = advanceRoutes(s);

  const pkRegen = Math.max(1, Math.floor(s.zust.g / 25));
  s = { ...s, pk: Math.min(150, s.pk + pkRegen) };

  s = { ...s, kpi: applyKPIDrift(s.kpi) };
  s = applyCharBonuses(s);
  s = updateCoalitionStability(s);

  s = checkUltimatums(s, content.charEvents);
  s = checkKohlSabotageEvent(s, content);
  s = processBundesratVotes(s);
  s = checkRandomEvents(s, content.events);

  s = { ...s, zust: recalcApproval(s.kpi, s.zust) };

  return s;
}

/** Kohl-Sonderregel: Beziehung < 15 → Vermittlungsausschuss-Event, Gesetz +2 Monate verzögert */
function checkKohlSabotageEvent(state: GameState, content: ContentBundle): GameState {
  if (state.activeEvent) return state;
  const { triggered, lawId } = checkKohlSabotage(state);
  if (!triggered || !lawId) return state;

  const kohlEvent = content.charEvents?.['kohl_bundesrat_sabotage'];
  if (!kohlEvent) {
    // Fallback: Gesetz um 2 Monate verzögern
    const idx = state.gesetze.findIndex(g => g.id === lawId);
    if (idx !== -1) {
      const gesetze = state.gesetze.map((g, i) =>
        i === idx
          ? { ...g, brVoteMonth: (g.brVoteMonth ?? state.month) + 2, kohlSabotageTriggered: true }
          : g,
      );
      return { ...state, gesetze };
    }
    return state;
  }

  const idx = state.gesetze.findIndex(g => g.id === lawId);
  if (idx === -1) return state;
  const gesetze = state.gesetze.map((g, i) =>
    i === idx ? { ...g, kohlSabotageTriggered: true, brVoteMonth: (g.brVoteMonth ?? state.month) + 2 } : g,
  );
  return {
    ...state,
    gesetze,
    activeEvent: { ...kohlEvent, lawId },
    firedCharEvents: [...state.firedCharEvents, kohlEvent.id],
    speed: 0,
  };
}

/** Führt Bundesratsabstimmungen durch, wenn brVoteMonth erreicht */
function processBundesratVotes(state: GameState): GameState {
  let s = state;
  for (const law of s.gesetze) {
    if (law.status === 'bt_passed' && law.brVoteMonth != null && s.month >= law.brVoteMonth) {
      s = executeBundesratVote(s, law.id);
    }
  }
  return s;
}
