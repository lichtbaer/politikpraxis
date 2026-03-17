/**
 * SMA-279: Framing-Auswahl beim Gesetz-Einbringen (ab Stufe 2)
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Law, FramingOption } from '../../../core/types';
import styles from './FramingModal.module.css';

interface FramingModalProps {
  law: Law;
  onConfirm: (framingKey: string | null) => void;
  onClose: () => void;
}

export function FramingModal({ law, onConfirm, onClose }: FramingModalProps) {
  const { t } = useTranslation('game');
  const [selectedFraming, setSelectedFraming] = useState<string | null>(null);

  const options = law.framing_optionen ?? [];
  if (options.length === 0) return null;

  const handleConfirm = () => {
    onConfirm(selectedFraming);
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.title}>{t('game:framing.title')}</h3>
        <div className={styles.options}>
          {options.map((option: FramingOption) => (
            <button
              key={option.key}
              type="button"
              className={`${styles.option} ${selectedFraming === option.key ? styles.selected : ''}`}
              onClick={() => setSelectedFraming(option.key)}
            >
              <span className={styles.optionLabel}>
                {t(`game:framing.${option.key}.label`, option.key)}
              </span>
              <span className={styles.optionDesc}>
                {t(`game:framing.${option.key}.desc`, '')}
              </span>
              <div className={styles.effekte}>
                {option.medienklima_delta !== 0 && (
                  <span className={option.medienklima_delta > 0 ? styles.deltaPositiv : styles.deltaNegativ}>
                    Medienklima {option.medienklima_delta > 0 ? '+' : ''}{option.medienklima_delta}
                  </span>
                )}
                {option.milieu_effekte && Object.keys(option.milieu_effekte).length > 0 && (
                  <span className={styles.milieuTags}>
                    {Object.entries(option.milieu_effekte).map(([k, v]) => (
                      <span key={k} className={styles.tag}>
                        {k}: {v > 0 ? '+' : ''}{v}
                      </span>
                    ))}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
        <button
          type="button"
          className={styles.keinFraming}
          onClick={() => setSelectedFraming(null)}
        >
          {t('game:framing.keinFraming')}
        </button>
        <div className={styles.actions}>
          <button type="button" className={styles.btnSecondary} onClick={onClose}>
            {t('game:framing.abbrechen')}
          </button>
          <button type="button" className={styles.btnPrimary} onClick={handleConfirm}>
            {t('game:agenda.einbringen')}
          </button>
        </div>
      </div>
    </div>
  );
}
