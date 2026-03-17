import { useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';

const AUTO_SAVE_INTERVAL = 120_000; // 2 minutes
const LOCALSTORAGE_KEY = 'bundesrepublik_autosave';

export function useAutoSave() {
  const stateRef = useRef(useGameStore.getState().state);

  useEffect(() => {
    return useGameStore.subscribe((s) => {
      stateRef.current = s.state;
    });
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      const state = stateRef.current;
      if (state.month > 1 && !state.gameOver) {
        try {
          localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(state));
        } catch {
          // Storage full or unavailable
        }
      }
    }, AUTO_SAVE_INTERVAL);

    return () => clearInterval(id);
  }, []);
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
