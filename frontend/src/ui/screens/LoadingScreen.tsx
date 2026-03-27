import { useTranslation } from 'react-i18next';
import styles from './LoadingScreen.module.css';

export function LoadingScreen() {
  const { t } = useTranslation();
  return (
    <div className={styles.root}>
      <div className={styles.spinner} aria-hidden />
      <p className={styles.text}>{t('loading.gameContent')}</p>
    </div>
  );
}
