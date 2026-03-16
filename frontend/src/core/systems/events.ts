import type { GameState, GameEvent, EventChoice } from '../types';
import { addLog } from '../engine';
import { applyMoodChange } from './characters';

export function checkRandomEvents(state: GameState, eventPool: GameEvent[]): GameState {
  if (state.activeEvent) return state;
  if (Math.random() >= 0.22) return state;

  const available = eventPool.filter(e => !state.firedEvents.includes(e.id));
  if (!available.length) return state;

  const ev = available[Math.floor(Math.random() * available.length)];
  return {
    ...state,
    firedEvents: [...state.firedEvents, ev.id],
    activeEvent: ev,
    speed: 0,
  };
}

export function resolveEvent(state: GameState, event: GameEvent, choice: EventChoice): GameState {
  if (state.pk < (choice.cost || 0)) return state;

  let newState: GameState = { ...state, pk: state.pk - (choice.cost || 0), kpi: { ...state.kpi } };

  for (const [k, v] of Object.entries(choice.effect || {})) {
    const key = k as keyof typeof newState.kpi;
    newState.kpi[key] = +Math.max(0, newState.kpi[key] + v).toFixed(2);
    if (key === 'zf') newState.kpi.zf = Math.min(100, newState.kpi.zf);
  }

  if (choice.charMood) {
    newState = applyMoodChange(newState, choice.charMood, choice.loyalty);
  }

  const logType = choice.type === 'danger' ? 'r' : 'g';
  newState = addLog(newState, choice.log, logType);
  newState.ticker = event.ticker;
  newState.activeEvent = null;

  return newState;
}
