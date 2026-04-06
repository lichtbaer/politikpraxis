import type { GameState, Character } from '../types';
import { addLog } from '../log';
import { withPause, getAutoPauseLevel } from '../eventPause';
import { nextRandom } from '../rng';

/**
 * Mapping Legacy-Char-IDs → Ressort.
 * Events und alte Spielstände nutzen Legacy-IDs (fm, wm, …) in char_mood.
 * Diese werden auf den aktuellen Kabinetts-Minister im jeweiligen Ressort aufgelöst.
 */
const LEGACY_ID_TO_RESSORT: Record<string, string> = {
  fm: 'finanzen',
  wm: 'wirtschaft',
  im: 'innen',
  jm: 'justiz',
  um: 'umwelt',
  am: 'arbeit',
  gm: 'gesundheit',
  bm: 'bildung',
};

/** Findet den Minister für eine Char-ID — direkt oder über Ressort-Alias. */
export function resolveCharById(chars: Character[], id: string): Character | undefined {
  const direct = chars.find((c) => c.id === id);
  if (direct) return direct;
  const ressort = LEGACY_ID_TO_RESSORT[id];
  if (ressort) return chars.find((c) => c.ressort === ressort);
  if (id === 'kanzler') return chars.find((c) => c.ist_kanzler);
  return undefined;
}

/** Findet Minister nach Ressort (unabhängig von Partei). */
function findByRessort(chars: Character[], ressort: string): Character | undefined {
  return chars.find((c) => c.ressort === ressort);
}

export function applyCharBonuses(state: GameState): GameState {
  const newState = { ...state, kpi: { ...state.kpi }, zust: { ...state.zust } };
  const gesetze = newState.gesetze.map(g => ({ ...g }));

  // Umweltminister — prog-Bonus (bei Stimmung ≥ 4)
  const umwelt = findByRessort(newState.chars, 'umwelt');
  if (umwelt && umwelt.mood >= 4) {
    newState.zust.prog = Math.min(90, newState.zust.prog + 0.3);
  }

  // Finanzminister — hh-Bonus (bei Stimmung ≥ 4 und negativem Haushalt)
  const finanzen = findByRessort(newState.chars, 'finanzen');
  if (finanzen && finanzen.mood >= 4 && newState.kpi.hh < 0) {
    newState.kpi.hh = +Math.min(0, newState.kpi.hh + 0.05).toFixed(2);
  }

  // Innenminister — Sabotage (bei Stimmung ≤ 1)
  const innen = findByRessort(newState.chars, 'innen');
  if (innen && innen.mood <= 1 && nextRandom() < 0.3) {
    for (let i = 0; i < gesetze.length; i++) {
      const g = gesetze[i];
      if ((g.status === 'aktiv' || g.status === 'entwurf' || g.status === 'eingebracht') && nextRandom() < 0.4) {
        const ja = Math.max(30, g.ja - 1);
        gesetze[i] = { ...g, ja, nein: 100 - ja };
      }
    }
  }

  // Wirtschaftsminister — al-Bonus (bei Stimmung ≥ 4)
  const wirtschaft = findByRessort(newState.chars, 'wirtschaft');
  if (wirtschaft && wirtschaft.mood >= 4 && nextRandom() < 0.3) {
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
  // Resolve legacy IDs (fm, wm, …) zu tatsächlichen Char-IDs im Kabinett
  const resolvedMood = resolveLegacyIds(state.chars, charMood);
  const resolvedLoyalty = loyalty ? resolveLegacyIds(state.chars, loyalty) : undefined;

  const chars = state.chars.map(c => {
    const newChar = { ...c };
    if (resolvedMood[c.id] !== undefined) {
      newChar.mood = Math.max(0, Math.min(4, newChar.mood + resolvedMood[c.id]));
    }
    if (resolvedLoyalty && resolvedLoyalty[c.id] !== undefined) {
      newChar.loyalty = Math.max(0, Math.min(5, newChar.loyalty + resolvedLoyalty[c.id]));
    }
    return newChar;
  });
  return { ...state, chars };
}

/**
 * Löst Legacy-IDs in einem char_mood/loyalty-Dict auf die tatsächlichen Kabinetts-Minister auf.
 * 'fm' → aktuelle ID des Finanzministers, 'wm' → Wirtschaftsminister, etc.
 */
function resolveLegacyIds(
  chars: Character[],
  dict: Record<string, number>,
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [key, value] of Object.entries(dict)) {
    // Direkt im Kabinett vorhanden → übernehmen
    if (chars.some((c) => c.id === key)) {
      result[key] = (result[key] ?? 0) + value;
      continue;
    }
    // Legacy-ID → Ressort-Alias auflösen
    const ressort = LEGACY_ID_TO_RESSORT[key];
    if (ressort) {
      const target = chars.find((c) => c.ressort === ressort);
      if (target) {
        result[target.id] = (result[target.id] ?? 0) + value;
        continue;
      }
    }
    // 'kanzler' → ist_kanzler
    if (key === 'kanzler') {
      const kanzler = chars.find((c) => c.ist_kanzler);
      if (kanzler) {
        result[kanzler.id] = (result[kanzler.id] ?? 0) + value;
        continue;
      }
    }
    // Unbekannte ID → ignorieren (Minister nicht im Kabinett)
  }
  return result;
}

/**
 * Ressortkonflikt-Tabelle: Wenn Politikfeld X erfolgreich ist, reagieren Minister aus Konflikts-Ressorts.
 * Format: politikfeldId → Array von Ressorts die negativ reagieren (mood -1).
 */
const RESSORT_KONFLIKTE: Record<string, string[]> = {
  klima: ['wirtschaft', 'finanzen'],
  wirtschaft: ['umwelt', 'arbeit'],
  soziales: ['finanzen', 'wirtschaft'],
  innere_sicherheit: ['justiz'],
  justiz: ['innen'],
  arbeit: ['wirtschaft'],
  digitalisierung: ['finanzen'],
};

/**
 * Wendet Ressortkonflikt-Effekte an wenn ein Gesetz beschlossen wird.
 * Minister aus Konflikts-Ressorts verlieren 1 Stimmungspunkt.
 * Gibt null zurück wenn keine Konflikte ausgelöst wurden (keine Änderung nötig).
 */
export function applyRessortKonflikt(state: GameState, politikfeldId: string | null | undefined): GameState {
  if (!politikfeldId) return state;

  const konfliktRessorts = RESSORT_KONFLIKTE[politikfeldId];
  if (!konfliktRessorts || konfliktRessorts.length === 0) return state;

  let changed = false;
  const chars = state.chars.map((c) => {
    if (!c.ressort || c.ist_kanzler) return c;
    if (konfliktRessorts.includes(c.ressort) && c.mood > 0) {
      changed = true;
      return { ...c, mood: Math.max(0, c.mood - 1) };
    }
    return c;
  });

  if (!changed) return state;
  return addLog(
    { ...state, chars },
    `Ressortkonflikt: Minister aus ${konfliktRessorts.join(', ')} unzufrieden`,
    'r',
  );
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
