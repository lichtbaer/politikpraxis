/**
 * SMA-279: Framing-Auswahl beim Gesetz-Einbringen (ab Stufe 2)
 * SMA-303: Label, Slogan, lesbare Milieu-Effekte
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Law, FramingOption } from '../../../core/types';
import { Users, Newspaper } from '../../icons';
import styles from './FramingModal.module.css';

interface FramingModalProps {
  law: Law;
  onConfirm: (framingKey: string | null) => void;
  onClose: () => void;
}

function getMilieuName(t: (key: string) => string, milieuId: string): string {
  const name = t(`milieu.${milieuId}`);
  return name !== `milieu.${milieuId}` ? name : milieuId;
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
              <h4 className={styles.optionLabel}>
                {option.label ?? t(`game:framing.${option.key}.label`, option.key)}
              </h4>
              {option.slogan && (
                <p className={styles.optionSlogan}>&quot;{option.slogan}&quot;</p>
              )}
              <div className={styles.effekte}>
                {option.milieu_effekte && Object.keys(option.milieu_effekte).length > 0 && (
                  <>
                    {Object.entries(option.milieu_effekte).map(([mid, delta]) => (
                      <span
                        key={mid}
                        className={delta > 0 ? styles.effektPositiv : styles.effektNegativ}
                      >
                        <Users size={14} /> {getMilieuName(t, mid)} {delta > 0 ? '+' : ''}{delta}%
                      </span>
                    ))}
                  </>
                )}
                {option.medienklima_delta !== 0 && (
                  <span
                    className={
                      option.medienklima_delta > 0 ? styles.effektPositiv : styles.effektNegativ
                    }
                  >
                    <Newspaper size={14} /> {t('game:medienklima.label')} {option.medienklima_delta > 0 ? '+' : ''}
                    {option.medienklima_delta}
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
