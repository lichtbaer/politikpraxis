import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { useGameStore } from '../../store/gameStore';
import { hasSaveAvailable, loadGame } from '../../services/localStorageSave';
import { StartMapView } from '../components/StartMapView/StartMapView';
import { LegalFooter } from '../components/LegalFooter/LegalFooter';
import styles from './MainMenu.module.css';

function toggleLang() {
  const next = i18n.language === 'de' ? 'en' : 'de';
  i18n.changeLanguage(next);
  localStorage.setItem('politikpraxis_lang', next);
}

function getSaveInfo(): { month: number; savedAt: string; approval: number } | null {
  const result = loadGame();
  if (!result.ok) return null;
  const s = result.data;
  const month = s.gameState.month ?? 0;
  const approval = s.gameState.zust?.g ?? 0;
  return { month, savedAt: s.savedAt, approval };
}

export function MainMenu() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const loadSaveFromFile = useGameStore((s) => s.loadSaveFromFile);
  const [saveAvailable] = useState(hasSaveAvailable);
  const [saveInfo] = useState(getSaveInfo);
  const [loadError, setLoadError] = useState<string | null>(null);

  const handleNewGame = () => {
    navigate('/setup');
  };

  const handleLoadGame = () => {
    const result = loadGame();
    if (result.ok) {
      loadSaveFromFile(result.data);
      navigate('/game');
    } else if (result.reason === 'version_mismatch') {
      setLoadError(t('menu.loadVersionError', { defaultValue: 'Spielstand ist nicht kompatibel mit dieser Version.' }));
    } else if (result.reason === 'parse_error') {
      setLoadError(t('menu.loadParseError', { defaultValue: 'Spielstand konnte nicht gelesen werden.' }));
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
        aria-label={i18n.language === 'de' ? t('game:mainMenu.switchToEnglish') : t('game:mainMenu.switchToGerman')}
      >
        {i18n.language === 'de' ? 'EN' : 'DE'}
      </button>
      <div className={styles.startScreen}>
        <div className={styles.startLeft} aria-hidden="true">
          <StartMapView />
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
                {saveInfo && (
                  <span className={styles.saveInfo}>
                    {t('game:mainMenu.saveInfo', { month: saveInfo.month, approval: Math.round(saveInfo.approval) })} · {new Date(saveInfo.savedAt).toLocaleDateString(i18n.language === 'de' ? 'de-DE' : 'en-US')}
                  </span>
                )}
              </button>
            )}
            {loadError && (
              <p className={styles.loadError}>{loadError}</p>
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

      <div className={styles.bottomBar}>
        <LegalFooter />
        <span className={styles.version}>v{__APP_VERSION__}</span>
      </div>
    </div>
  );
}
