import { apiFetch } from './api';

interface AnalyticsEvent {
  event_type: string;
  payload: Record<string, unknown>;
  game_month: number;
  save_id?: string;
}

/** Max events to keep in buffer — prevents unbounded memory growth during offline play */
const MAX_BUFFER_SIZE = 1000;

let eventBuffer: AnalyticsEvent[] = [];
let flushTimeout: ReturnType<typeof setTimeout> | null = null;

export function trackEvent(
  eventType: string,
  gameMonth: number,
  payload: Record<string, unknown> = {},
  saveId?: string,
) {
  eventBuffer.push({
    event_type: eventType,
    payload,
    game_month: gameMonth,
    save_id: saveId,
  });

  // Drop oldest events if buffer exceeds limit
  if (eventBuffer.length > MAX_BUFFER_SIZE) {
    eventBuffer = eventBuffer.slice(-MAX_BUFFER_SIZE);
  }

  if (!flushTimeout) {
    flushTimeout = setTimeout(() => flushEvents(), 30_000);
  }
}

export async function flushEvents(token?: string) {
  if (!eventBuffer.length) return;

  if (flushTimeout) {
    clearTimeout(flushTimeout);
    flushTimeout = null;
  }

  // Kein Token → Events im Buffer behalten statt zu verwerfen
  if (!token) return;

  const events = [...eventBuffer];
  eventBuffer = [];

  try {
    await apiFetch('/analytics/batch', {
      method: 'POST',
      token,
      body: { events },
    });
  } catch {
    // Netzwerkfehler → Events zurück in den Buffer (respecting limit)
    eventBuffer = [...events, ...eventBuffer].slice(-MAX_BUFFER_SIZE);
  }
}
