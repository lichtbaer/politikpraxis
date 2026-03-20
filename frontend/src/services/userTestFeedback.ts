import { apiFetch } from './api';

export interface UserTestFeedbackPayload {
  session_id: string;
  kontext: 'header' | 'spielende';
  game_stat_id?: string | null;
  bewertung_gesamt?: number | null;
  verstaendlichkeit?: number | null;
  fehler_gemeldet: boolean;
  fehler_beschreibung?: string | null;
  positives?: string | null;
  verbesserungen?: string | null;
  sonstiges?: string | null;
}

export async function submitUserTestFeedback(
  payload: UserTestFeedbackPayload,
  accessToken?: string | null,
): Promise<{ id: string; created_at: string }> {
  return apiFetch<{ id: string; created_at: string }>('/usertest-feedback', {
    method: 'POST',
    body: payload,
    ...(accessToken ? { token: accessToken } : {}),
  });
}
