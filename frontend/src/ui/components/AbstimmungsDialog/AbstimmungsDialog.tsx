import { useTranslation } from 'react-i18next';
import type { Law } from '../../../core/types';
import type { JaQuoteBreakdown } from '../../../core/systems/parliament';
import { Modal } from '../Modal/Modal';
import styles from './AbstimmungsDialog.module.css';

interface AbstimmungsDialogProps {
  law: Law;
  breakdown: JaQuoteBreakdown;
  onConfirm: () => void;
  onCancel: () => void;
}

function ModifikatorZeile({ label, wert }: { label: string; wert: number }) {
  const farbe = wert > 0 ? styles.positiv : wert < 0 ? styles.negativ : styles.neutral;
  const vorzeichen = wert > 0 ? '+' : '';
  return (
    <div className={styles.row}>
      <span className={styles.rowLabel}>{label}</span>
      <span className={`${styles.rowValue} ${farbe}`}>
        {vorzeichen}
        {wert}%
      </span>
    </div>
  );
}

/** #270 (AC1): Zeigt vor der Abstimmung Basis + jeden aktiven Modifikator der Ja-Quote einzeln an. */
export function AbstimmungsDialog({ law, breakdown, onConfirm, onCancel }: AbstimmungsDialogProps) {
  const { t } = useTranslation('game');
  const titel = law.titel || t(`laws.${law.id}.titel`, { defaultValue: law.id });
  const bestehtMehrheit = breakdown.gesamt > 50;

  return (
    <Modal
      onClose={onCancel}
      overlayClassName={styles.overlay}
      dialogClassName={styles.dialog}
      ariaLabelledBy="abstimmungs-dialog-title"
    >
      <h3 id="abstimmungs-dialog-title" className={styles.title}>
        {t('abstimmung.title', { name: titel, defaultValue: `Abstimmung: ${titel}` })}
      </h3>
      <div className={styles.breakdown}>
        <div className={styles.row}>
          <span className={styles.rowLabel}>{t('abstimmung.basis', 'Basis-Ja-Quote')}</span>
          <span className={styles.rowValue}>{breakdown.basis}%</span>
        </div>
        {breakdown.modifikatoren.map((m) => (
          <ModifikatorZeile
            key={m.key}
            label={t(`abstimmung.modifikator.${m.key}`)}
            wert={m.wert}
          />
        ))}
        <div className={`${styles.row} ${styles.gesamtRow}`}>
          <span className={styles.rowLabel}>{t('abstimmung.gesamt', 'Erwartete Ja-Quote')}</span>
          <span className={styles.rowValue}>{breakdown.gesamt}%</span>
        </div>
      </div>
      <p className={bestehtMehrheit ? styles.prognosePositiv : styles.prognoseNegativ}>
        {bestehtMehrheit
          ? t('abstimmung.prognoseMehrheit', 'Mehrheit wird derzeit erreicht (> 50 %).')
          : t('abstimmung.prognoseKeineMehrheit', 'Mehrheit wird derzeit verfehlt (≤ 50 %).')}
      </p>
      <div className={styles.buttons}>
        <button type="button" className={styles.btnCancel} onClick={onCancel}>
          {t('abstimmung.abbrechen', 'Abbrechen')}
        </button>
        <button type="button" className={styles.btnConfirm} onClick={onConfirm}>
          {t('agenda.abstimmen')}
        </button>
      </div>
    </Modal>
  );
}
