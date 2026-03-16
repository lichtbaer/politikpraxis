import type { GameState, GameEvent, ContentBundle } from './types';
import { applyPendingEffects, applyKPIDrift, recalcApproval } from './systems/economy';
import { applyCharBonuses, checkUltimatums } from './systems/characters';
import { updateCoalitionStability } from './systems/coalition';
import { advanceRoutes } from './systems/levels';
import { checkRandomEvents } from './systems/events';
import { checkGameEnd } from './systems/election';

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
  s = checkRandomEvents(s, content.events);

  s = { ...s, zust: recalcApproval(s.kpi, s.zust) };

  return s;
}
