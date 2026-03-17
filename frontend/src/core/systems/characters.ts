import type { GameState } from '../types';
import { withPause, getAutoPauseLevel } from '../eventPause';

export function applyCharBonuses(state: GameState): GameState {
  const newState = { ...state, kpi: { ...state.kpi }, zust: { ...state.zust } };
  const gesetze = newState.gesetze.map(g => ({ ...g }));

  const wolf = newState.chars.find(c => c.id === 'um');
  if (wolf && wolf.mood >= 4) {
    newState.zust.prog = Math.min(90, newState.zust.prog + 0.3);
  }

  const lehmann = newState.chars.find(c => c.id === 'fm');
  if (lehmann && lehmann.mood >= 4 && newState.kpi.hh < 0) {
    newState.kpi.hh = +Math.min(0, newState.kpi.hh + 0.05).toFixed(2);
  }

  const braun = newState.chars.find(c => c.id === 'im');
  if (braun && braun.mood <= 1 && Math.random() < 0.3) {
    gesetze.forEach(g => {
      if ((g.status === 'aktiv' || g.status === 'entwurf') && Math.random() < 0.4) {
        g.ja = Math.max(30, g.ja - 1);
        g.nein = 100 - g.ja;
      }
    });
  }

  const maier = newState.chars.find(c => c.id === 'wm');
  if (maier && maier.mood >= 4 && Math.random() < 0.3) {
    newState.kpi.al = +Math.max(2, newState.kpi.al - 0.05).toFixed(2);
  }

  return { ...newState, gesetze };
}

export function checkUltimatums(
  state: GameState,
  charEvents: Record<string, import('../types').GameEvent>,
): GameState {
  if (state.activeEvent) return state;

  for (const c of state.chars) {
    const thresh = c.ultimatum?.moodThresh ?? -1;
    const evId = c.ultimatum?.event;
    if (evId && c.mood <= thresh && !state.firedCharEvents.includes(evId)) {
      const ev = charEvents[evId];
      if (ev) {
        return {
          ...state,
          firedCharEvents: [...state.firedCharEvents, evId],
          activeEvent: ev,
          ...withPause(state, getAutoPauseLevel(ev)),
        };
      }
    }
  }

  return state;
}

export function updateCoalition(state: GameState): GameState {
  const avgMood = state.chars.reduce((s, c) => s + c.mood, 0) / state.chars.length;
  const avgLoy = state.chars.reduce((s, c) => s + c.loyalty, 0) / state.chars.length;
  const coalition = Math.round(Math.min(100, Math.max(0, (avgMood / 4) * 50 + (avgLoy / 5) * 50)));
  return { ...state, coalition };
}

export function applyMoodChange(
  state: GameState,
  charMood: Record<string, number>,
  loyalty?: Record<string, number>,
): GameState {
  const chars = state.chars.map(c => {
    const newChar = { ...c };
    if (charMood[c.id] !== undefined) {
      newChar.mood = Math.max(0, Math.min(4, newChar.mood + charMood[c.id]));
    }
    if (loyalty && loyalty[c.id] !== undefined) {
      newChar.loyalty = Math.max(0, Math.min(5, newChar.loyalty + loyalty[c.id]));
    }
    return newChar;
  });
  return { ...state, chars };
}
