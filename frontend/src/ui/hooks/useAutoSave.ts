import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';

const AUTO_SAVE_INTERVAL = 120_000; // 2 minutes
const LOCALSTORAGE_KEY = 'bundesrepublik_autosave';

export function useAutoSave() {
  const { t } = useTranslation();
  const stateRef = useRef(useGameStore.getState().state);
  // Warnung nur einmal pro Sitzung — sonst nervt der Toast alle 2 Minuten
  const warnedRef = useRef(false);

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
          warnedRef.current = false;
        } catch {
          // Storage voll oder blockiert — Spieler warnen statt still Fortschritt zu riskieren
          if (!warnedRef.current) {
            warnedRef.current = true;
            useUIStore.getState().showToast(t('game.autoSaveFailed'), 'warning');
          }
        }
      }
    }, AUTO_SAVE_INTERVAL);

    return () => clearInterval(id);
  }, [t]);
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
