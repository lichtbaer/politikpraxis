import { useUIStore } from '../../../store/uiStore';
import styles from './Toast.module.css';

export function Toast() {
  const toastMessage = useUIStore((s) => s.toastMessage);

  if (!toastMessage) return null;

  return (
    <div className={styles.root} aria-live="polite">
      {toastMessage}
    </div>
  );
}
