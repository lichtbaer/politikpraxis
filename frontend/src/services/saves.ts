import { apiFetch } from './api';
import type { GameState } from '../core/types';
import type { Ausrichtung } from '../core/systems/ausrichtung';
import type { SpielerParteiState } from '../core/types';
import { SAVE_VERSION, type SaveFile } from './localStorageSave';

export interface SaveListItem {
  id: string;
  slot: number;
  name: string | null;
  partei: string | null;
  monat: number | null;
  wahlprognose: number | null;
  complexity: number | null;
  updated_at: string;
}

export interface SaveDetailResponse {
  id: string;
  slot: number;
  name: string | null;
  partei: string | null;
  monat: number | null;
  wahlprognose: number | null;
  complexity: number | null;
  updated_at: string;
  game_state: GameState;
  client_meta: {
    player_name?: string;
    ausrichtung?: Ausrichtung;
    kanzler_geschlecht?: 'sie' | 'er' | 'they';
  };
}

export async function listSaves(token: string): Promise<SaveListItem[]> {
  return apiFetch<SaveListItem[]>('/saves', { token });
}

export async function getSaveBySlot(token: string, slot: number): Promise<SaveDetailResponse> {
  return apiFetch<SaveDetailResponse>(`/saves/${slot}`, { token });
}

export interface UpsertPayload {
  gameState: GameState;
  name?: string | null;
  complexity: number;
  playerName: string;
  ausrichtung: Ausrichtung;
  spielerPartei: SpielerParteiState | null;
  kanzlerGeschlecht: 'sie' | 'er' | 'they';
}

export async function upsertSaveSlot(
  token: string,
  slot: number,
  payload: UpsertPayload,
): Promise<SaveListItem> {
  return apiFetch<SaveListItem>(`/saves/${slot}`, {
    method: 'POST',
    token,
    body: {
      game_state: payload.gameState,
      name: payload.name ?? undefined,
      complexity: payload.complexity,
      player_name: payload.playerName,
      ausrichtung: payload.ausrichtung,
      kanzler_geschlecht: payload.kanzlerGeschlecht,
    },
  });
}

export interface GameAgendaPayload {
  spielerAgenda: string[];
  koalitionsAgenda?: string[];
}

/** SMA-503: Agenda im Cloud-Spielstand speichern */
export async function postGameAgenda(
  token: string,
  saveId: string,
  payload: GameAgendaPayload,
): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/game/${saveId}/agenda`, {
    method: 'POST',
    token,
    body: {
      spieler_agenda: payload.spielerAgenda,
      koalitions_agenda: payload.koalitionsAgenda,
    },
  });
}

export async function deleteSaveSlot(token: string, slot: number): Promise<void> {
  await apiFetch(`/saves/${slot}`, { method: 'DELETE', token });
}

/** Server-Antwort als SaveFile für loadSaveFromFile */
export function serverDetailToSaveFile(detail: SaveDetailResponse): SaveFile {
  const meta = detail.client_meta ?? {};
  return {
    version: SAVE_VERSION,
    savedAt: detail.updated_at,
    gameState: detail.game_state,
    playerName: String(meta.player_name ?? detail.game_state.kanzlerName ?? ''),
    complexity: detail.complexity ?? 4,
    ausrichtung: meta.ausrichtung ?? { wirtschaft: 0, gesellschaft: 0, staat: 0 },
    spielerPartei: detail.game_state.spielerPartei,
    kanzlerGeschlecht: meta.kanzler_geschlecht ?? detail.game_state.kanzlerGeschlecht ?? 'sie',
    cloudSaveId: detail.id,
  };
}
