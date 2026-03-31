import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { useGameStore } from '../../store/gameStore';
import { useAuthStore } from '../../store/authStore';
import { hasSaveAvailable, loadGame, clearSave, type SaveFile } from '../../services/localStorageSave';
import { upsertSaveSlot } from '../../services/saves';
import { StartMapView } from '../components/StartMapView/StartMapView';
import { LegalFooter } from '../components/LegalFooter/LegalFooter';
import { SaveSlots } from '../components/SaveSlots/SaveSlots';
import { LoginModal } from '../components/LoginModal/LoginModal';
import { SimpleConfirm } from '../components/SimpleConfirm/SimpleConfirm';
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
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const accessToken = useAuthStore((s) => s.accessToken);
  const email = useAuthStore((s) => s.email);
  const logout = useAuthStore((s) => s.logout);

  const [saveAvailable] = useState(hasSaveAvailable);
  const [saveInfo] = useState(getSaveInfo);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [migrateOpen, setMigrateOpen] = useState(false);
  const [migrateBusy, setMigrateBusy] = useState(false);

  const handleNewGame = () => {
    navigate('/setup');
  };

  const handleLoadGame = () => {
    const result = loadGame();
    if (result.ok) {
      loadSaveFromFile(result.data);
      navigate('/game');
    } else if (result.reason === 'version_mismatch') {
      setLoadError(t('menu.loadVersionError'));
    } else if (result.reason === 'parse_error') {
      setLoadError(t('menu.loadParseError'));
    }
  };

  const handleCredits = () => {
    navigate('/credits');
  };

  const handleCloudLoad = (save: SaveFile) => {
    loadSaveFromFile(save);
    navigate('/game');
  };

  const handleMigrateConfirm = async () => {
    const tok = useAuthStore.getState().accessToken;
    const local = loadGame();
    if (!tok || !local.ok) {
      setMigrateOpen(false);
      return;
    }
    setMigrateBusy(true);
    try {
      const d = local.data;
      await upsertSaveSlot(tok, 1, {
        gameState: d.gameState,
        name: d.playerName || undefined,
        complexity: d.complexity,
        playerName: d.playerName,
        ausrichtung: d.ausrichtung,
        spielerPartei: d.spielerPartei ?? null,
        kanzlerGeschlecht: d.kanzlerGeschlecht ?? 'sie',
      });
      clearSave();
      setMigrateOpen(false);
    } catch {
      setLoadError(t('menu.migrateError'));
      setMigrateOpen(false);
    } finally {
      setMigrateBusy(false);
    }
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

          <div className={styles.betaBanner} role="status" aria-label={t('beta.badge')}>
            <span className={styles.betaBadge}>{t('beta.badge')}</span>
            <p className={styles.betaNotice}>{t('beta.notice')}</p>
          </div>

          <div className={styles.authRow}>
            {isLoggedIn && email ? (
              <>
                <span className={styles.userLabel} title={email}>
                  {email.length > 32 ? `${email.slice(0, 30)}…` : email}
                </span>
                <button type="button" className={styles.secondary} onClick={() => void logout()}>
                  {t('menu.logout')}
                </button>
              </>
            ) : (
              <button type="button" className={styles.secondary} onClick={() => setAuthOpen(true)}>
                {t('menu.login')}
              </button>
            )}
          </div>

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

          {isLoggedIn && accessToken && (
            <SaveSlots token={accessToken} onLoadSave={handleCloudLoad} />
          )}
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
        <div className={styles.jugendschutzRow}>
          <span className={styles.jugendschutzBadge}>12+</span>
          <span className={styles.jugendschutzText}>
            {t('jugendschutz.freigabe')} {t('jugendschutz.selbsteinstufung')} · {t('jugendschutz.hinweis')}
          </span>
        </div>
        <LegalFooter />
        <span className={styles.version}>v{__APP_VERSION__}</span>
      </div>

      {authOpen && (
        <LoginModal
          onClose={() => setAuthOpen(false)}
          onAuthenticated={() => {
            if (loadGame().ok) setMigrateOpen(true);
          }}
        />
      )}

      {migrateOpen && (
        <SimpleConfirm
          title={t('menu.migrateTitle')}
          message={t('menu.migrateDesc')}
          confirmLabel={migrateBusy ? '…' : t('menu.migrateConfirm')}
          cancelLabel={t('menu.migrateSkip')}
          confirmDisabled={migrateBusy}
          onConfirm={() => void handleMigrateConfirm()}
          onCancel={() => setMigrateOpen(false)}
        />
      )}
    </div>
  );
}
