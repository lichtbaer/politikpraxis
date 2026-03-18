import type { GameState } from '../types';
import { addLog } from '../log';
import { withPause, getAutoPauseLevel } from '../eventPause';

export function applyCharBonuses(state: GameState): GameState {
  const newState = { ...state, kpi: { ...state.kpi }, zust: { ...state.zust } };
  const gesetze = newState.gesetze.map(g => ({ ...g }));

  // Wolf (GP Umwelt) — prog-Bonus
  const wolf = newState.chars.find((c) => (c.ressort === 'umwelt' && c.pool_partei === 'gp') || c.id === 'um');
  if (wolf && wolf.mood >= 4) {
    newState.zust.prog = Math.min(90, newState.zust.prog + 0.3);
  }

  // Lehmann (CDP Finanzen) — hh-Bonus
  const lehmann = newState.chars.find((c) => (c.ressort === 'finanzen' && c.pool_partei === 'cdp') || c.id === 'fm');
  if (lehmann && lehmann.mood >= 4 && newState.kpi.hh < 0) {
    newState.kpi.hh = +Math.min(0, newState.kpi.hh + 0.05).toFixed(2);
  }

  // Braun (CDP Innen) — Sabotage
  const braun = newState.chars.find((c) => (c.ressort === 'innen' && c.pool_partei === 'cdp') || c.id === 'im');
  if (braun && braun.mood <= 1 && Math.random() < 0.3) {
    gesetze.forEach(g => {
      if ((g.status === 'aktiv' || g.status === 'entwurf' || g.status === 'eingebracht') && Math.random() < 0.4) {
        g.ja = Math.max(30, g.ja - 1);
        g.nein = 100 - g.ja;
      }
    });
  }

  // Maier (SDP Wirtschaft) — al-Bonus
  const maier = newState.chars.find((c) => (c.ressort === 'wirtschaft' && c.pool_partei === 'sdp') || c.id === 'wm');
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
  /** SMA-321: Ultimatum frühestens ab Monat 4 — Regierung hat noch nichts getan */
  if (state.month < 4) return state;

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

const GESPRAECH_PK_COST = 8;
const GESPRAECH_COOLDOWN_MONTHS = 6;

export function kabinettsgespraech(state: GameState, charId: string): GameState {
  // Check PK
  if (state.pk < GESPRAECH_PK_COST) return state;

  // Find character
  const char = state.chars.find(c => c.id === charId);
  if (!char) return state;

  // Check cooldown
  const cooldowns = state.charGespraechCooldowns ?? {};
  if (cooldowns[charId] != null && state.month < cooldowns[charId]) return state;

  // Apply mood +1, loyalty +0.5
  const chars = state.chars.map(c => {
    if (c.id !== charId) return c;
    return {
      ...c,
      mood: Math.min(4, c.mood + 1),
      loyalty: Math.min(5, c.loyalty + 0.5),
    };
  });

  // Update cooldown and deduct PK
  const newCooldowns = { ...cooldowns, [charId]: state.month + GESPRAECH_COOLDOWN_MONTHS };

  const newState: GameState = {
    ...state,
    pk: state.pk - GESPRAECH_PK_COST,
    chars,
    charGespraechCooldowns: newCooldowns,
  };

  return addLog(newState, `Kabinettsgespräch mit ${char.name}: Stimmung verbessert`, 'g');
}
