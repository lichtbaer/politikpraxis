import { apiFetch } from './api';

interface AnalyticsEvent {
  event_type: string;
  payload: Record<string, unknown>;
  game_month: number;
  save_id?: string;
}

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

  if (!flushTimeout) {
    flushTimeout = setTimeout(() => flushEvents(), 30_000);
  }
}

export async function flushEvents(token?: string) {
  if (!eventBuffer.length) return;

  const events = [...eventBuffer];
  eventBuffer = [];

  if (flushTimeout) {
    clearTimeout(flushTimeout);
    flushTimeout = null;
  }

  if (!token) return;

  try {
    await apiFetch('/analytics/batch', {
      method: 'POST',
      token,
      body: { events },
    });
  } catch {
    eventBuffer.push(...events);
  }
}
