import type { GameState, SpielerParteiState } from './types';
import type { Ausrichtung } from './systems/ausrichtung';
import { upsertSaveSlot, type UpsertPayload } from '../services/saves';
import { useUIStore } from '../store/uiStore';

const AUTOSAVE_INTERVAL = 5;

export interface AutosaveMeta {
  playerName: string;
  complexity: number;
  ausrichtung: Ausrichtung;
  spielerPartei: SpielerParteiState | null;
  kanzlerGeschlecht: 'sie' | 'er' | 'they';
}

/**
 * Autosave alle AUTOSAVE_INTERVAL Monate in Slot 1 (nur eingeloggte Nutzer).
 * Bei Fehler: lokales Speichern übernimmt weiterhin gameStore.saveGame.
 */
export function checkAutosave(monat: number, token: string | null, state: GameState, meta: AutosaveMeta): void {
  if (!token) return;
  if (monat < 1 || state.gameOver) return;
  if (monat % AUTOSAVE_INTERVAL !== 0) return;

  const payload: UpsertPayload = {
    gameState: state,
    complexity: meta.complexity,
    playerName: meta.playerName,
    ausrichtung: meta.ausrichtung,
    spielerPartei: meta.spielerPartei,
    kanzlerGeschlecht: meta.kanzlerGeschlecht,
  };

  void upsertSaveSlot(token, 1, payload)
    .then(() => {
      useUIStore.getState().showToast(`Spielstand gespeichert (Monat ${monat})`, 'success');
    })
    .catch(() => {
      useUIStore.getState().showToast('Cloud-Speichern fehlgeschlagen – lokal gesichert', 'warning');
    });
}
