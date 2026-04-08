import type { GameState, SpielerParteiState } from './types';
import type { Ausrichtung } from './systems/ausrichtung';
import { upsertSaveSlot, type UpsertPayload } from '../services/saves';
import { useUIStore } from '../store/uiStore';

const AUTOSAVE_INTERVAL = 5;

/** Wird von gameStore nach create() registriert — vermeidet Zirkelimport */
let cloudSaveIdSetter: ((id: string) => void) | null = null;

export function registerAutosaveCloudSaveHandler(fn: (id: string) => void): void {
  cloudSaveIdSetter = fn;
}

export interface AutosaveMeta {
  playerName: string;
  complexity: number;
  ausrichtung: Ausrichtung;
  spielerPartei: SpielerParteiState | null;
  kanzlerGeschlecht: 'sie' | 'er' | 'they';
}

/** Track consecutive failures to avoid spamming retries */
let consecutiveFailures = 0;
const MAX_CONSECUTIVE_FAILURES = 3;

/**
 * Autosave alle AUTOSAVE_INTERVAL Monate in Slot 1 (nur eingeloggte Nutzer).
 * Bei Fehler: lokales Speichern übernimmt weiterhin gameStore.saveGame.
 * Retries einmal nach 2s bei Netzwerkfehler; pausiert nach 3 aufeinanderfolgenden Fehlern.
 */
export function checkAutosave(monat: number, token: string | null, state: GameState, meta: AutosaveMeta): void {
  if (!token) return;
  if (monat < 1 || state.gameOver) return;
  if (monat % AUTOSAVE_INTERVAL !== 0) return;
  if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
    // Pause cloud saves after repeated failures; decrement gradually so saves
    // resume after a few skipped intervals instead of retrying immediately.
    consecutiveFailures--;
    return;
  }

  const payload: UpsertPayload = {
    gameState: state,
    complexity: meta.complexity,
    playerName: meta.playerName,
    ausrichtung: meta.ausrichtung,
    spielerPartei: meta.spielerPartei,
    kanzlerGeschlecht: meta.kanzlerGeschlecht,
  };

  void upsertSaveSlot(token, 1, payload)
    .then((item) => {
      consecutiveFailures = 0;
      cloudSaveIdSetter?.(item.id);
      useUIStore.getState().showToast(`Spielstand gespeichert (Monat ${monat})`, 'success');
    })
    .catch(() => {
      consecutiveFailures++;
      // Single retry after 2s delay
      setTimeout(() => {
        void upsertSaveSlot(token, 1, payload)
          .then((item) => {
            consecutiveFailures = 0;
            cloudSaveIdSetter?.(item.id);
          })
          .catch(() => {
            useUIStore.getState().showToast('Cloud-Speichern fehlgeschlagen – lokal gesichert', 'warning');
          });
      }, 2000);
    });
}

/** Reset failure counter (e.g. on fresh login) */
export function resetAutosaveFailures(): void {
  consecutiveFailures = 0;
}
