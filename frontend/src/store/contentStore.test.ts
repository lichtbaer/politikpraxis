/**
 * Offline-Fallback: Wenn das Backend komplett nicht erreichbar ist, muss das
 * Spiel mit gebündeltem Fallback-Content starten statt im Fehlerscreen zu enden.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../services/api', () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from '../services/api';
import { useContentStore, getContentBundle } from './contentStore';
import { createInitialState } from '../core/state';

const apiFetchMock = vi.mocked(apiFetch);

describe('contentStore Offline-Fallback', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('startet bei komplettem API-Ausfall im Offline-Modus mit Fallback-Content', async () => {
    apiFetchMock.mockRejectedValue(new Error('network down'));

    await useContentStore.getState().load('de');

    const s = useContentStore.getState();
    expect(s.offline).toBe(true);
    expect(s.loaded).toBe(true);
    expect(s.error).toBeNull();
    expect(s.chars.length).toBeGreaterThan(0);
    expect(s.gesetze.length).toBeGreaterThan(0);
    expect(s.events.length).toBeGreaterThan(0);
    expect(s.bundesratFraktionen.length).toBeGreaterThan(0);
  });

  it('Fallback-Content überlebt createInitialState (Smoke-Test, alle Stufen)', async () => {
    apiFetchMock.mockRejectedValue(new Error('network down'));

    await useContentStore.getState().load('de');
    const bundle = getContentBundle();

    for (const complexity of [1, 2, 3, 4]) {
      const state = createInitialState(bundle, complexity);
      expect(state.month).toBe(1);
      expect(state.chars.length).toBeGreaterThan(0);
      expect(state.gesetze.length).toBeGreaterThan(0);
    }
  });

  it('Fallback-Fraktionen decken alle 16 Länder ab', async () => {
    apiFetchMock.mockRejectedValue(new Error('network down'));

    await useContentStore.getState().load('de');
    const s = useContentStore.getState();
    const laender = s.bundesratFraktionen.flatMap((f) => f.laender);
    expect(new Set(laender).size).toBe(16);
  });

  it('Teilausfall kritischer Endpoints bleibt ein harter Fehler (kein Mischzustand)', async () => {
    apiFetchMock.mockImplementation((path: string) => {
      if (path.startsWith('/content/chars')) return Promise.resolve([]);
      return Promise.reject(new Error('network down'));
    });

    await useContentStore.getState().load('de');

    const s = useContentStore.getState();
    expect(s.offline).toBe(false);
    expect(s.loaded).toBe(false);
    expect(s.error).not.toBeNull();
  });
});
