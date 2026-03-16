import type { GameState } from '../core/types';
import type { Ausrichtung } from '../core/systems/ausrichtung';

/** Kompatibel mit v0.5.x */
const SAVE_VERSION = '0.5.0';

export const SAVE_KEY = 'politikpraxis_save' as const;

export interface SaveFile {
  version: string;
  savedAt: string;
  gameState: GameState;
  playerName: string;
  complexity: number;
  ausrichtung: Ausrichtung;
}

function isLocalStorageAvailable(): boolean {
  try {
    const key = '__politikpraxis_test__';
    localStorage.setItem(key, '1');
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

function parseVersion(version: string): [number, number, number] {
  const parts = version.split('.').map(Number);
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
}

/** Prüft ob Save-Version kompatibel ist (gleiche Major.Minor) */
function isVersionCompatible(saveVersion: string): boolean {
  const [saveMajor, saveMinor] = parseVersion(saveVersion);
  const [appMajor, appMinor] = parseVersion(SAVE_VERSION);
  return saveMajor === appMajor && saveMinor === appMinor;
}

/**
 * Speichert den Spielstand in localStorage.
 * Schlägt lautlos fehl wenn localStorage nicht verfügbar.
 */
export function saveGame(data: Omit<SaveFile, 'version' | 'savedAt'>): boolean {
  if (!isLocalStorageAvailable()) {
    console.warn('[politikpraxis] localStorage nicht verfügbar – Autosave übersprungen');
    return false;
  }
  try {
    const save: SaveFile = {
      ...data,
      version: SAVE_VERSION,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    return true;
  } catch (e) {
    console.warn('[politikpraxis] Autosave fehlgeschlagen:', e);
    return false;
  }
}

export type LoadResult = { ok: true; data: SaveFile } | { ok: false; reason: 'no_save' | 'parse_error' | 'version_mismatch' };

/**
 * Lädt den Spielstand aus localStorage.
 * Validiert Version – bei inkompatiblem Format wird nicht geladen.
 */
export function loadGame(): LoadResult {
  if (!isLocalStorageAvailable()) {
    return { ok: false, reason: 'no_save' };
  }
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { ok: false, reason: 'no_save' };

    const parsed = JSON.parse(raw) as SaveFile;
    if (!parsed.version || !parsed.gameState) {
      return { ok: false, reason: 'parse_error' };
    }

    if (!isVersionCompatible(parsed.version)) {
      console.warn(
        `[politikpraxis] Save-Version ${parsed.version} inkompatibel mit App ${SAVE_VERSION} – Laden übersprungen`,
      );
      return { ok: false, reason: 'version_mismatch' };
    }

    return { ok: true, data: parsed };
  } catch {
    return { ok: false, reason: 'parse_error' };
  }
}

/** Prüft ob ein gültiger, ladbarer Spielstand existiert */
export function hasSaveAvailable(): boolean {
  const result = loadGame();
  return result.ok;
}
