import styles from './ErrorScreen.module.css';

interface ErrorScreenProps {
  message: string;
  onRetry: () => void;
}

export function ErrorScreen({ message, onRetry }: ErrorScreenProps) {
  return (
    <div className={styles.root}>
      <p className={styles.message}>{message}</p>
      <button type="button" className={styles.retry} onClick={onRetry}>
        Erneut versuchen
      </button>
    </div>
  );
}
