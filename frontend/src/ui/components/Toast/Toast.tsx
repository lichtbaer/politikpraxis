import { useUIStore } from '../../../store/uiStore';
import type { ToastType } from '../../../store/uiStore';
import styles from './Toast.module.css';

const TYPE_CLASS: Record<ToastType, string> = {
  info: '',
  success: styles.success,
  warning: styles.warning,
  danger: styles.danger,
};

export function Toast() {
  const toastQueue = useUIStore((s) => s.toastQueue);

  if (toastQueue.length === 0) return null;

  return (
    <div className={styles.container} aria-live="polite">
      {toastQueue.map((toast, index) => (
        <div
          key={toast.id}
          className={`${styles.root} ${TYPE_CLASS[toast.type] ?? ''}`}
          style={{ bottom: `${24 + index * 48}px` }}
        >
          {toast.msg}
        </div>
      ))}
    </div>
  );
}
