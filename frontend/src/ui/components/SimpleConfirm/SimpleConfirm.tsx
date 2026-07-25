import { Modal } from '../Modal/Modal';
import styles from './SimpleConfirm.module.css';

interface SimpleConfirmProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function SimpleConfirm({
  title,
  message,
  confirmLabel = 'OK',
  cancelLabel = 'Abbrechen',
  confirmDisabled = false,
  onConfirm,
  onCancel,
}: SimpleConfirmProps) {
  return (
    <Modal
      onClose={onCancel}
      overlayClassName={styles.overlay}
      dialogClassName={styles.dialog}
      ariaLabelledBy="simple-confirm-title"
    >
      <h3 id="simple-confirm-title" className={styles.title}>{title}</h3>
      <p className={styles.message}>{message}</p>
      <div className={styles.buttons}>
        <button type="button" className={styles.btnCancel} onClick={onCancel}>
          {cancelLabel}
        </button>
        <button type="button" className={styles.btnConfirm} onClick={onConfirm} disabled={confirmDisabled}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
