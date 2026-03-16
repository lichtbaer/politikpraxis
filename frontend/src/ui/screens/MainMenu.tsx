import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';
import type { GameState } from '../../core/types';
import styles from './MainMenu.module.css';

const SAVE_KEYS = ['politikpraxis_save', 'bundesrepublik_autosave'] as const;

function hasSave(): boolean {
  try {
    return SAVE_KEYS.some((key) => !!localStorage.getItem(key));
  } catch {
    return false;
  }
}

function loadFromLocalStorage(): GameState | null {
  for (const key of SAVE_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw) as GameState;
    } catch {
      // Corrupt or invalid
    }
  }
  return null;
}

export function MainMenu() {
  const navigate = useNavigate();
  const loadSave = useGameStore((s) => s.loadSave);
  const startGame = useGameStore((s) => s.startGame);
  const [saveAvailable, setSaveAvailable] = useState(hasSave);

  useEffect(() => {
    setSaveAvailable(hasSave());
  }, []);

  const handleNewGame = () => {
    navigate('/setup');
  };

  const handleLoadGame = () => {
    const saved = loadFromLocalStorage();
    if (saved) {
      loadSave(saved);
      startGame();
      navigate('/game');
    }
  };

  const handleCredits = () => {
    navigate('/credits');
  };

  return (
    <div className={styles.root}>
      <div className={styles.content}>
        <h1 className={styles.title}>Bundesrepublik</h1>
        <p className={styles.subtitle}>Eine Politiksimulation</p>

        <nav className={styles.buttons}>
          <button
            type="button"
            className={styles.primary}
            onClick={handleNewGame}
          >
            Neues Spiel
          </button>
          {saveAvailable && (
            <button
              type="button"
              className={styles.secondary}
              onClick={handleLoadGame}
            >
              Spiel laden
            </button>
          )}
          <button type="button" className={styles.secondary} disabled>
            Einstellungen
          </button>
          <button
            type="button"
            className={styles.secondary}
            onClick={handleCredits}
          >
            Credits
          </button>
        </nav>
      </div>

      <span className={styles.version}>v{__APP_VERSION__}</span>
    </div>
  );
}
