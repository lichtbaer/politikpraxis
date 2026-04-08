import { apiFetch } from './api';

const STATS_SESSION_KEY = 'br_stats_session_v1';

/** Fallback wenn localStorage nicht verfügbar — stabil pro App-Session */
let fallbackSessionId: string | null = null;

/** Stabile anonyme Session für Community-Stats (ohne Login) */
export function getOrCreateStatsSessionId(): string {
  try {
    let id = localStorage.getItem(STATS_SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(STATS_SESSION_KEY, id);
    }
    return id;
  } catch {
    // localStorage nicht verfügbar — ID pro App-Session stabil halten
    if (!fallbackSessionId) {
      fallbackSessionId = crypto.randomUUID();
    }
    return fallbackSessionId;
  }
}

export interface GameStatPayload {
  session_id: string;
  partei: string;
  complexity: number;
  gewonnen: boolean;
  wahlprognose: number;
  monate_gespielt: number;
  gesetze_beschlossen?: number;
  gesetze_gescheitert?: number;
  koalitionsbruch: boolean;
  saldo_final?: number;
  gini_final?: number;
  arbeitslosigkeit_final?: number;
  medienklima_final?: number;
  skandale_gesamt?: number;
  pk_verbraucht?: number;
  top_politikfeld?: string | null;
  bewertung_gesamt?: string;
  /** SMA-499: Gesamtpunkte 0–100 (Bilanz/Agenda/Urteil + Wahlbonus) */
  spielziel_gesamtpunkte?: number;
  titel?: string;
  opt_in_community: boolean;
}

export async function postGameStats(
  payload: GameStatPayload,
  accessToken?: string | null,
): Promise<{ id: string }> {
  return apiFetch<{ id: string }>('/stats', {
    method: 'POST',
    body: payload,
    ...(accessToken ? { token: accessToken } : {}),
  });
}

export interface CommunityStats {
  gesamt: number;
  gewinnrate: number;
  wahlprognose_avg: number;
  nach_partei: Array<{
    partei: string;
    anzahl: number;
    gewinnrate: number;
    wahlprognose_avg: number;
  }>;
  top_politikfelder: Array<{ feld: string; anzahl: number }>;
  titel_verteilung: Array<{ titel: string; anzahl: number }>;
}

export async function fetchCommunityStats(): Promise<CommunityStats> {
  return apiFetch<CommunityStats>('/stats/community');
}

export interface HighscoreItem {
  titel: string | null;
  partei: string;
  wahlprognose: number;
  gesetze_beschlossen: number | null;
  saldo_final: number | null;
  complexity: number;
  created_at: string;
}

export async function fetchHighscores(partei?: string, complexity?: number, limit = 20) {
  const q = new URLSearchParams();
  if (partei) q.set('partei', partei);
  if (complexity != null) q.set('complexity', String(complexity));
  q.set('limit', String(limit));
  const qs = q.toString();
  return apiFetch<{ items: HighscoreItem[] }>(`/stats/highscores${qs ? `?${qs}` : ''}`);
}
