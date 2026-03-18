/**
 * SMA-335: Gegenfinanzierungs-Dialog — Auswahl der Finanzierungsoption
 * vor Einbringen eines kostspieligen Gesetzes
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GegenfinanzierungsOption } from '../../../core/systems/gegenfinanzierung';
import { Building2, Coins, BarChart3, Landmark } from '../../icons';
import styles from './GegenfinanzierungsModal.module.css';

interface GegenfinanzierungsModalProps {
  gesetzTitel: string;
  optionen: GegenfinanzierungsOption[];
  getGesetzTitel?: (id: string) => string;
  onConfirm: (option: GegenfinanzierungsOption, subOption?: string) => void;
  onClose: () => void;
}

const OPTION_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  ministerium_kuerzen: Building2,
  schulden: Coins,
  steuergesetz: BarChart3,
  ueberschuss: Landmark,
};

export function GegenfinanzierungsModal({
  gesetzTitel,
  optionen,
  getGesetzTitel,
  onConfirm,
  onClose,
}: GegenfinanzierungsModalProps) {
  const { t } = useTranslation('game');
  const [selectedOption, setSelectedOption] = useState<GegenfinanzierungsOption | null>(null);
  const [selectedSubOption, setSelectedSubOption] = useState<string | null>(null);

  const handleConfirm = () => {
    if (!selectedOption) return;
    if (
      (selectedOption.key === 'ministerium_kuerzen' || selectedOption.key === 'steuergesetz') &&
      selectedOption.suboptionen?.length &&
      !selectedSubOption
    ) {
      return;
    }
    onConfirm(selectedOption, selectedSubOption ?? undefined);
    onClose();
  };

  const needsSubOption =
    selectedOption &&
    (selectedOption.key === 'ministerium_kuerzen' || selectedOption.key === 'steuergesetz') &&
    (selectedOption.suboptionen?.length ?? 0) > 0;
  const canConfirm =
    selectedOption &&
    (!needsSubOption || (needsSubOption && selectedSubOption));

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.title}>{t('game:gegenfinanzierung.title')}</h3>
        <p className={styles.desc}>
          {t('game:gegenfinanzierung.desc', { gesetz: gesetzTitel })}
        </p>
        <div className={styles.options}>
          {optionen.map((opt) => {
            const Icon = OPTION_ICONS[opt.key];
            return (
              <button
                key={opt.key}
                type="button"
                className={`${styles.option} ${selectedOption?.key === opt.key ? styles.selected : ''}`}
                onClick={() => {
                  setSelectedOption(opt);
                  setSelectedSubOption(null);
                }}
              >
                {Icon && <Icon size={18} className={styles.optionIcon} />}
                <span className={styles.optionLabel}>{opt.label_de}</span>
                {opt.verfuegbar_grund && (
                  <span className={styles.verfuegbarGrund}>({opt.verfuegbar_grund})</span>
                )}
              </button>
            );
          })}
        </div>
        {needsSubOption && selectedOption && (
          <div className={styles.suboptions}>
            <label className={styles.suboptionsLabel}>
              {selectedOption.key === 'ministerium_kuerzen'
                ? t('game:gegenfinanzierung.ressortWaehlen')
                : t('game:gegenfinanzierung.steuergesetzWaehlen')}
            </label>
            <div className={styles.suboptionsList}>
              {selectedOption.suboptionen?.map((sub) => {
                const key = sub.ressort ?? sub.gesetzId ?? '';
                const label =
                  sub.ressort
                    ? t(`game:gegenfinanzierung.ressort.${sub.ressort}`, sub.ressort)
                    : (sub.gesetzId && getGesetzTitel ? getGesetzTitel(sub.gesetzId) : sub.gesetzId ?? key);
                const einsparung = sub.kosten_einsparung ?? sub.einnahmeeffekt;
                return (
                  <button
                    key={key}
                    type="button"
                    className={`${styles.suboption} ${selectedSubOption === key ? styles.selected : ''}`}
                    onClick={() => setSelectedSubOption(key)}
                  >
                    {label}
                    {einsparung != null && (
                      <span className={styles.einsparung}>
                        {einsparung > 0 ? '+' : ''}{einsparung} Mrd.
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <div className={styles.actions}>
          <button type="button" className={styles.btnSecondary} onClick={onClose}>
            {t('game:framing.abbrechen')}
          </button>
          <button
            type="button"
            className={styles.btnPrimary}
            disabled={!canConfirm}
            onClick={handleConfirm}
          >
            {t('game:agenda.einbringen')}
          </button>
        </div>
      </div>
    </div>
  );
}
