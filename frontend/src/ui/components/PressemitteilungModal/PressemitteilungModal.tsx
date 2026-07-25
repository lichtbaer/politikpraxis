/**
 * SMA-279: Pressemitteilung-Modal (ab Stufe 3) — 4 Themen-Optionen
 */
import { useTranslation } from 'react-i18next';
import { Modal } from '../Modal/Modal';
import styles from './PressemitteilungModal.module.css';

type PressemitteilungThema = 'haushalt' | 'koalition' | 'politikfeld' | 'opposition';

interface PressemitteilungModalProps {
  onConfirm: (thema: PressemitteilungThema) => void;
  onClose: () => void;
}

const THEMEN: PressemitteilungThema[] = ['haushalt', 'koalition', 'politikfeld', 'opposition'];

export function PressemitteilungModal({ onConfirm, onClose }: PressemitteilungModalProps) {
  const { t } = useTranslation('game');

  return (
    <Modal
      onClose={onClose}
      overlayClassName={styles.overlay}
      dialogClassName={styles.modal}
      ariaLabelledBy="pressemitteilung-title"
    >
      <h3 id="pressemitteilung-title" className={styles.title}>{t('game:pressemitteilung.title')}</h3>
      <p className={styles.desc}>{t('game:pressemitteilung.desc')}</p>
      <div className={styles.options}>
        {THEMEN.map((thema) => (
          <button
            key={thema}
            type="button"
            className={styles.option}
            onClick={() => {
              onConfirm(thema);
              onClose();
            }}
          >
            {t(`game:pressemitteilung.thema.${thema}`)}
          </button>
        ))}
      </div>
      <button type="button" className={styles.close} onClick={onClose}>
        {t('game:framing.abbrechen')}
      </button>
    </Modal>
  );
}
