import { apiFetch } from './api';
import type { GameState } from '../core/types';

interface SaveResponse {
  id: string;
  name: string;
  month: number;
  approval: number;
  scenario_id: string;
  updated_at: string;
}

interface SaveDetailResponse extends SaveResponse {
  state: GameState;
}

export async function listSaves(token: string): Promise<SaveResponse[]> {
  return apiFetch<SaveResponse[]>('/saves', { token });
}

export async function getSave(token: string, saveId: string): Promise<SaveDetailResponse> {
  return apiFetch<SaveDetailResponse>(`/saves/${saveId}`, { token });
}

export async function createSave(
  token: string,
  name: string,
  state: GameState,
): Promise<SaveResponse> {
  return apiFetch<SaveResponse>('/saves', {
    method: 'POST',
    token,
    body: {
      name,
      state,
      month: state.month,
      approval: state.zust.g,
      scenario_id: 'standard',
    },
  });
}

export async function updateSave(
  token: string,
  saveId: string,
  state: GameState,
): Promise<SaveResponse> {
  return apiFetch<SaveResponse>(`/saves/${saveId}`, {
    method: 'PUT',
    token,
    body: {
      state,
      month: state.month,
      approval: state.zust.g,
    },
  });
}

export async function deleteSave(token: string, saveId: string): Promise<void> {
  await apiFetch(`/saves/${saveId}`, { method: 'DELETE', token });
}
