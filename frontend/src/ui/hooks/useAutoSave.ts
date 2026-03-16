import { useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';

const AUTO_SAVE_INTERVAL = 120_000; // 2 minutes
const LOCALSTORAGE_KEY = 'bundesrepublik_autosave';

export function useAutoSave() {
  const state = useGameStore(s => s.state);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      if (state.month > 1 && !state.gameOver) {
        try {
          localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(state));
        } catch {
          // Storage full or unavailable
        }
      }
    }, AUTO_SAVE_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state]);
}

export function loadAutoSave(): ReturnType<typeof useGameStore.getState>['state'] | null {
  try {
    const saved = localStorage.getItem(LOCALSTORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {
    // Corrupt save
  }
  return null;
}

export function clearAutoSave() {
  localStorage.removeItem(LOCALSTORAGE_KEY);
}
