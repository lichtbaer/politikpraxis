import type { GameState, SpielerParteiState } from '../core/types';
import type { Ausrichtung } from '../core/systems/ausrichtung';

/** Kompatibel mit v0.5.x */
export const SAVE_VERSION = '0.5.0';

export const SAVE_KEY = 'politikpraxis_save' as const;

export interface SaveFile {
  version: string;
  savedAt: string;
  gameState: GameState;
  playerName: string;
  complexity: number;
  ausrichtung: Ausrichtung;
  /** SMA-289: Spieler-Partei (optional für ältere Saves) */
  spielerPartei?: SpielerParteiState;
  /** SMA-327: Kanzler-Geschlecht (optional für ältere Saves) */
  kanzlerGeschlecht?: 'sie' | 'er' | 'they';
  /** Cloud-Spielstand (game_saves.id) für API-Aufrufe wie POST /api/game/{id}/agenda */
  cloudSaveId?: string;
}

let storageAvailable: boolean | null = null;

/** Einmalige Probe pro Sitzung — vorher lief der Schreib-/Löschtest bei jedem Tick. */
function isLocalStorageAvailable(): boolean {
  if (storageAvailable !== null) return storageAvailable;
  try {
    const key = '__politikpraxis_test__';
    localStorage.setItem(key, '1');
    localStorage.removeItem(key);
    storageAvailable = true;
  } catch {
    storageAvailable = false;
  }
  return storageAvailable;
}

/** Nur für Tests: Verfügbarkeits-Cache zurücksetzen. */
export function _resetStorageProbeForTests(): void {
  storageAvailable = null;
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

type PendingSave = Omit<SaveFile, 'version' | 'savedAt'>;

/** Wartezeit, bis der jüngste Spielstand geschrieben wird (Tick = Monat; im
 *  Vorlauf laufen 4 Ticks/s — jeder Tick serialisierte bisher den kompletten State). */
export const SAVE_DEBOUNCE_MS = 1000;

let pendingSave: PendingSave | null = null;
let pendingTimer: ReturnType<typeof setTimeout> | null = null;
let pendingOnResult: ((ok: boolean) => void) | null = null;

/** Schreibt einen ausstehenden Spielstand sofort (z.B. beim Verlassen der Seite). */
export function flushPendingSave(): void {
  if (pendingTimer !== null) {
    clearTimeout(pendingTimer);
    pendingTimer = null;
  }
  if (pendingSave === null) return;
  const data = pendingSave;
  const onResult = pendingOnResult;
  pendingSave = null;
  pendingOnResult = null;
  const ok = saveGame(data);
  onResult?.(ok);
}

/**
 * Debounced Variante von saveGame: der letzte Aufruf innerhalb von
 * SAVE_DEBOUNCE_MS gewinnt. `onResult` wird mit dem Ergebnis des tatsächlichen
 * Schreibvorgangs aufgerufen.
 */
export function saveGameDebounced(data: PendingSave, onResult?: (ok: boolean) => void): void {
  pendingSave = data;
  pendingOnResult = onResult ?? null;
  if (pendingTimer !== null) clearTimeout(pendingTimer);
  pendingTimer = setTimeout(flushPendingSave, SAVE_DEBOUNCE_MS);
}

if (typeof window !== 'undefined') {
  // pagehide feuert zuverlässig beim Schließen/Navigieren (auch mobil, bfcache);
  // visibilitychange deckt Tab-Wechsel ab, nach denen der Browser den Prozess
  // ggf. beendet, ohne pagehide zu senden.
  window.addEventListener('pagehide', flushPendingSave);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushPendingSave();
  });
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

/** Entfernt den persistierten Spielstand in localStorage (z. B. nach Cloud-Migration). */
export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}
