import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  SAVE_DEBOUNCE_MS,
  SAVE_KEY,
  _resetStorageProbeForTests,
  flushPendingSave,
  saveGameDebounced,
} from './localStorageSave';
import type { GameState } from '../core/types';

function payload(month: number) {
  return {
    gameState: { month } as unknown as GameState,
    playerName: 'Test',
    complexity: 4,
    ausrichtung: { wirtschaft: 0, gesellschaft: 0, staat: 0 },
  };
}

describe('saveGameDebounced (Qualitätsplan 2.3: kein JSON.stringify pro Tick)', () => {
  let store: Record<string, string>;

  beforeEach(() => {
    vi.useFakeTimers();
    _resetStorageProbeForTests();
    store = {};
    vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
      store[key] = value;
    });
    vi.spyOn(localStorage, 'removeItem').mockImplementation((key) => {
      delete store[key];
    });
  });

  afterEach(() => {
    flushPendingSave();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('schreibt innerhalb des Debounce-Fensters nur den letzten Stand', () => {
    const setItem = vi.mocked(localStorage.setItem);
    saveGameDebounced(payload(1));
    saveGameDebounced(payload(2));
    saveGameDebounced(payload(3));
    // Bis zum Ablauf des Fensters kein Save-Write (nur ggf. die Storage-Probe).
    expect(setItem.mock.calls.filter(([k]) => k === SAVE_KEY)).toHaveLength(0);

    vi.advanceTimersByTime(SAVE_DEBOUNCE_MS);

    const writes = setItem.mock.calls.filter(([k]) => k === SAVE_KEY);
    expect(writes).toHaveLength(1);
    expect(JSON.parse(store[SAVE_KEY]).gameState.month).toBe(3);
  });

  it('flushPendingSave schreibt sofort (pagehide/visibilitychange)', () => {
    saveGameDebounced(payload(7));
    flushPendingSave();
    expect(JSON.parse(store[SAVE_KEY]).gameState.month).toBe(7);
    // Kein zweiter Write nach Ablauf des Timers.
    const before = vi.mocked(localStorage.setItem).mock.calls.length;
    vi.advanceTimersByTime(SAVE_DEBOUNCE_MS * 2);
    expect(vi.mocked(localStorage.setItem).mock.calls.length).toBe(before);
  });

  it('meldet Fehlschlag über onResult, wenn localStorage nicht verfügbar ist', () => {
    vi.mocked(localStorage.setItem).mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    const onResult = vi.fn();
    saveGameDebounced(payload(1), onResult);
    vi.advanceTimersByTime(SAVE_DEBOUNCE_MS);
    expect(onResult).toHaveBeenCalledWith(false);
  });

  it('prüft die Storage-Verfügbarkeit nur einmal pro Sitzung', () => {
    const setItem = vi.mocked(localStorage.setItem);
    for (let i = 0; i < 5; i++) {
      saveGameDebounced(payload(i));
      vi.advanceTimersByTime(SAVE_DEBOUNCE_MS);
    }
    const probes = setItem.mock.calls.filter(([k]) => k === '__politikpraxis_test__');
    expect(probes).toHaveLength(1);
  });
});
