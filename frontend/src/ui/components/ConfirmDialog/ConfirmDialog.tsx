import { useTranslation } from 'react-i18next';
import { Modal } from '../Modal/Modal';
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
  const { t } = useTranslation('game');
  const remaining = currentPk - cost;

  return (
    <Modal
      onClose={onCancel}
      overlayClassName={styles.overlay}
      dialogClassName={styles.dialog}
      ariaLabelledBy="confirm-dialog-title"
    >
      <h3 id="confirm-dialog-title" className={styles.title}>{title}</h3>
      <p className={styles.message}>{message}</p>
      <div className={styles.costInfo}>
        <div className={styles.costLine}>
          <span>{t('ui.cost')}</span>
          <span className={styles.costValue}>{cost} PK</span>
        </div>
        <div className={styles.costLine}>
          <span>{t('ui.remaining')}</span>
          <span className={remaining < 10 ? styles.remainWarning : styles.remainValue}>
            {remaining} PK
          </span>
        </div>
      </div>
      <div className={styles.buttons}>
        <button type="button" className={styles.btnCancel} onClick={onCancel}>
          {t('ui.cancel')}
        </button>
        <button type="button" className={styles.btnConfirm} onClick={onConfirm}>
          {t('ui.confirm')}
        </button>
      </div>
    </Modal>
  );
}
