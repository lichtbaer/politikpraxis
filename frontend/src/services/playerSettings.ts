/**
 * SMA-396: Spieler-Einstellungen (localStorage), unabhängig vom GameState.
 */
const STORAGE_KEY = 'politikpraxis_player_settings';

export interface PlayerSettings {
  /** Monatszusammenfassungs-Modal nach jedem Tick (Standard: an) */
  monatszusammenfassung: boolean;
}

const DEFAULTS: PlayerSettings = {
  monatszusammenfassung: true,
};

function readRaw(): Partial<PlayerSettings> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as Partial<PlayerSettings>;
  } catch {
    return {};
  }
}

export function loadPlayerSettings(): PlayerSettings {
  const raw = readRaw();
  return {
    ...DEFAULTS,
    ...raw,
    monatszusammenfassung:
      typeof raw.monatszusammenfassung === 'boolean'
        ? raw.monatszusammenfassung
        : DEFAULTS.monatszusammenfassung,
  };
}

export function savePlayerSettings(partial: Partial<PlayerSettings>): PlayerSettings {
  const next = { ...loadPlayerSettings(), ...partial };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}
