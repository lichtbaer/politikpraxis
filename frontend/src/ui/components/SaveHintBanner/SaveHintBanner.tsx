import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LoginModal } from '../LoginModal/LoginModal';
import styles from './SaveHintBanner.module.css';

export function SaveHintBanner() {
  const { t } = useTranslation();
  const [showAuth, setShowAuth] = useState(false);

  return (
    <>
      <div className={styles.banner}>
        <span className={styles.icon} aria-hidden>💡</span>
        <span className={styles.text}>
          {t('game.saveHintBanner', {
            defaultValue: 'Melde dich an, um deinen Spielstand zu speichern und auf mehreren Geräten weiterzuspielen.',
          })}
        </span>
        <button type="button" className={styles.btn} onClick={() => setShowAuth(true)}>
          {t('game.saveHintLogin', { defaultValue: 'Anmelden' })}
        </button>
      </div>
      {showAuth && (
        <LoginModal onClose={() => setShowAuth(false)} />
      )}
    </>
  );
}
