import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LoginModal } from '../LoginModal/LoginModal';
import { Lightbulb, X as XIcon } from '../../icons';
import styles from './SaveHintBanner.module.css';

/**
 * Der Hinweis stand als 46 px hohes Band dauerhaft über dem Spielbrett — zusammen
 * mit Offline-Banner, Header und Tableiste waren das 166 px Kopfzone auf 900 px
 * Höhe, auf dem Phone über die Hälfte des Bildschirms. Jetzt einzeilig, kompakt
 * und wegklickbar; die Entscheidung überlebt den Reload.
 */
const STORAGE_KEY = 'politikpraxis_save_hint_dismissed';

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function SaveHintBanner() {
  const { t } = useTranslation();
  const [showAuth, setShowAuth] = useState(false);
  const [dismissed, setDismissed] = useState(wasDismissed);

  if (dismissed) return null;

  const schliessen = () => {
    setDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // Privater Modus o. Ä. — dann gilt die Entscheidung nur für diese Sitzung.
    }
  };

  return (
    <>
      <div className={styles.banner}>
        <Lightbulb className={styles.icon} size={14} aria-hidden />
        <span className={styles.text}>
          {t('game.saveHintBanner', {
            defaultValue:
              'Melde dich an, um deinen Spielstand zu speichern und auf mehreren Geräten weiterzuspielen.',
          })}
        </span>
        <button type="button" className={styles.btn} onClick={() => setShowAuth(true)}>
          {t('game.saveHintLogin')}
        </button>
        <button
          type="button"
          className={styles.close}
          onClick={schliessen}
          aria-label={t('game.saveHintDismiss', { defaultValue: 'Hinweis ausblenden' })}
        >
          <XIcon size={14} aria-hidden />
        </button>
      </div>
      {showAuth && <LoginModal onClose={() => setShowAuth(false)} />}
    </>
  );
}
