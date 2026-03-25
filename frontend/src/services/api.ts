const API_BASE = import.meta.env.VITE_API_URL || '/api';

interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string | null;
  /** Default: 'include' (HttpOnly Refresh-Cookie) */
  credentials?: RequestCredentials;
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

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token, credentials = 'include' } = options;

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
    throw new ApiError('Netzwerkfehler — Server nicht erreichbar', 0, 'network');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    const detail =
      typeof error.detail === 'string'
        ? error.detail
        : Array.isArray(error.detail)
          ? error.detail.map((d: { msg?: string }) => d.msg).join(', ')
          : error.detail;
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
