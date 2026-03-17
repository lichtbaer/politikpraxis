import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { useGameStore } from '../../store/gameStore';
import { hasSaveAvailable, loadGame } from '../../services/localStorageSave';
import styles from './MainMenu.module.css';

function toggleLang() {
  const next = i18n.language === 'de' ? 'en' : 'de';
  i18n.changeLanguage(next);
  localStorage.setItem('politikpraxis_lang', next);
}

export function MainMenu() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const loadSaveFromFile = useGameStore((s) => s.loadSaveFromFile);
  const [saveAvailable] = useState(hasSaveAvailable);

  const handleNewGame = () => {
    navigate('/setup');
  };

  const handleLoadGame = () => {
    const result = loadGame();
    if (result.ok) {
      loadSaveFromFile(result.data);
      navigate('/game');
    } else if (result.reason === 'version_mismatch') {
      console.warn('[politikpraxis] Save-Version inkompatibel – Laden übersprungen');
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
      <div className={styles.startScreen}>
        <div className={styles.startLeft} aria-hidden="true">
          <img
            src="/europe-map.svg"
            alt=""
            className={styles.europeMap}
            draggable={false}
          />
        </div>

        <div className={styles.startCenter}>
          <h1 className={styles.title}>{t('app.title')}</h1>
          <p className={styles.subtitle}>{t('app.subtitle')}</p>

          <nav className={styles.startButtons}>
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

        <div className={styles.startRight}>
          <div className={styles.startText}>
            <div className={styles.einladung}>
              <p className={styles.einladungKompakt}>{t('startseite.kompakt')}</p>
              <div className={styles.einladungPrimaer}>
                <p className={styles.einladungText}>{t('startseite.einladung1')}</p>
                <p className={styles.einladungText}>
                  {t('startseite.einladung2')}
                  <br />
                  {t('startseite.einladung3')}
                </p>
                <p className={styles.einladungText}>{t('startseite.einladung4')}</p>
                <p className={styles.einladungText}>{t('startseite.einladung5')}</p>
              </div>
            </div>
          </div>
          <p className={styles.startDisclaimer}>{t('startseite.disclaimer')}</p>
        </div>
      </div>

      <span className={styles.version}>v{__APP_VERSION__}</span>
    </div>
  );
}
