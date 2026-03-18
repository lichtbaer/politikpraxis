import styles from './ConfirmDialog.module.css';

interface ConfirmDialogProps {
  title: string;
  message: string;
  cost: number;
  currentPk: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ title, message, cost, currentPk, onConfirm, onCancel }: ConfirmDialogProps) {
  const remaining = currentPk - cost;

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.message}>{message}</p>
        <div className={styles.costInfo}>
          <div className={styles.costLine}>
            <span>Kosten</span>
            <span className={styles.costValue}>{cost} PK</span>
          </div>
          <div className={styles.costLine}>
            <span>Verbleibend</span>
            <span className={remaining < 10 ? styles.remainWarning : styles.remainValue}>
              {remaining} PK
            </span>
          </div>
        </div>
        <div className={styles.buttons}>
          <button type="button" className={styles.btnCancel} onClick={onCancel}>
            Abbrechen
          </button>
          <button type="button" className={styles.btnConfirm} onClick={onConfirm}>
            Bestätigen
          </button>
        </div>
      </div>
    </div>
  );
}
