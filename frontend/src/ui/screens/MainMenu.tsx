import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
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

function toggleLang() {
  const next = i18n.language === 'de' ? 'en' : 'de';
  i18n.changeLanguage(next);
  localStorage.setItem('politikpraxis_lang', next);
}

export function MainMenu() {
  const { t } = useTranslation();
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
      <button
        type="button"
        className={styles.langToggle}
        onClick={toggleLang}
        aria-label={i18n.language === 'de' ? 'Switch to English' : 'Auf Deutsch wechseln'}
      >
        {i18n.language === 'de' ? 'EN' : 'DE'}
      </button>
      <div className={styles.content}>
        <h1 className={styles.title}>{t('app.title')}</h1>
        <p className={styles.subtitle}>{t('app.subtitle')}</p>

        <nav className={styles.buttons}>
          <button
            type="button"
            className={styles.primary}
            onClick={handleNewGame}
          >
            {t('menu.newGame')}
          </button>
          {saveAvailable && (
            <button
              type="button"
              className={styles.secondary}
              onClick={handleLoadGame}
            >
              {t('menu.loadGame')}
            </button>
          )}
          <button type="button" className={styles.secondary} disabled>
            {t('menu.settings')}
          </button>
          <button
            type="button"
            className={styles.secondary}
            onClick={handleCredits}
          >
            {t('menu.credits')}
          </button>
        </nav>
      </div>

      <span className={styles.version}>v{__APP_VERSION__}</span>
    </div>
  );
}
