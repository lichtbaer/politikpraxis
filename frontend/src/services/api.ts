const API_BASE = import.meta.env.VITE_API_URL || '/api';

interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string | null;
  /** Default: 'include' (HttpOnly Refresh-Cookie) */
  credentials?: RequestCredentials;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token, credentials = 'include' } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    const detail =
      typeof error.detail === 'string'
        ? error.detail
        : Array.isArray(error.detail)
          ? error.detail.map((d: { msg?: string }) => d.msg).join(', ')
          : error.detail;
    throw new Error(detail || `HTTP ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }
  return JSON.parse(text) as T;
}
