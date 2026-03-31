import { logger } from '../utils/logger';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string | null;
  /** Default: 'include' (HttpOnly Refresh-Cookie) */
  credentials?: RequestCredentials;
  /** Skip automatic token refresh on 401 (used internally to prevent recursion) */
  _skipRefresh?: boolean;
}

/** Unterscheidet API-Fehlertypen für bessere Fehlerbehandlung im UI */
export class ApiError extends Error {
  status: number;
  type: 'network' | 'http' | 'parse';

  constructor(message: string, status: number, type: 'network' | 'http' | 'parse') {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.type = type;
  }
}

/**
 * Callback to refresh the access token. Set by authStore at init time
 * to avoid circular imports between api.ts and auth.ts.
 * Returns the new access token or null if refresh failed.
 */
let tokenRefresher: (() => Promise<string | null>) | null = null;
/** Deduplication: only one refresh in-flight at a time */
let activeRefreshPromise: Promise<string | null> | null = null;

export function setTokenRefresher(fn: () => Promise<string | null>): void {
  tokenRefresher = fn;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token, credentials = 'include', _skipRefresh = false } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      credentials,
    });
  } catch {
    logger.warn('API network error', { path, method });
    throw new ApiError('Netzwerkfehler — Server nicht erreichbar', 0, 'network');
  }

  // Auto-refresh: on 401 with a token, try refreshing once then retry.
  // Deduplicate: if multiple requests hit 401 simultaneously, only one refresh runs.
  if (response.status === 401 && token && !_skipRefresh && tokenRefresher) {
    if (!activeRefreshPromise) {
      activeRefreshPromise = tokenRefresher().finally(() => {
        activeRefreshPromise = null;
      });
    }
    const newToken = await activeRefreshPromise;
    if (newToken) {
      return apiFetch<T>(path, { ...options, token: newToken, _skipRefresh: true });
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    const detail =
      typeof error.detail === 'string'
        ? error.detail
        : Array.isArray(error.detail)
          ? error.detail.map((d: { msg?: string }) => d.msg).join(', ')
          : error.detail;
    logger.warn('API HTTP error', { path, status: response.status, detail });
    throw new ApiError(detail || `HTTP ${response.status}`, response.status, 'http');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError('Ungültige Server-Antwort', response.status, 'parse');
  }
}
