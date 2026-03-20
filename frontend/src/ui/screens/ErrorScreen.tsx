import { useTranslation } from 'react-i18next';
import styles from './ErrorScreen.module.css';

interface ErrorScreenProps {
  message: string;
  onRetry: () => void;
}

export function ErrorScreen({ message, onRetry }: ErrorScreenProps) {
  const { t } = useTranslation('game');
  return (
    <div className={styles.root}>
      <p className={styles.message}>{message}</p>
      <button type="button" className={styles.retry} onClick={onRetry}>
        {t('ui.retry')}
      </button>
    </div>
  );
}
