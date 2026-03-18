/**
 * SMA-335/SMA-336: Gegenfinanzierungs-Dialog — Auswahl der Finanzierungsoption
 * vor Einbringen eines kostspieligen Gesetzes.
 * Alle 4 Optionen mit disabled-State, Kosten-Hinweis, Ressort-Details, Schuldenbremse, Lehmann-Warnung.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GegenfinanzierungsOption } from '../../../core/systems/gegenfinanzierung';
import { Building2, Coins, BarChart3, Landmark, AlertTriangle } from '../../icons';
import styles from './GegenfinanzierungsModal.module.css';

interface GegenfinanzierungsModalProps {
  gesetzTitel: string;
  optionen: GegenfinanzierungsOption[];
  kosten: number;
  pkKosten: number;
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

function formatMrdShort(wert: number): string {
  return `${wert >= 0 ? '+' : ''}${wert.toFixed(1)} Mrd.`;
}

export function GegenfinanzierungsModal({
  gesetzTitel,
  optionen,
  kosten,
  pkKosten,
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
    selectedOption.verfuegbar &&
    (!needsSubOption || (needsSubOption && selectedSubOption));

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.title}>{t('game:gegenfinanzierung.title')} — {gesetzTitel}</h3>
        <p className={styles.kostenHinweis}>
          {t('game:gegenfinanzierung.kostenHinweis', {
            kosten: formatMrdShort(kosten),
            defaultValue: `Dieses Gesetz kostet ${formatMrdShort(kosten)}/Jahr. Wie soll es finanziert werden?`,
          })}
        </p>
        <div className={styles.options}>
          {optionen.map((opt) => {
            const Icon = OPTION_ICONS[opt.key];
            const isDisabled = !opt.verfuegbar;
            const isSelected = selectedOption?.key === opt.key;
            return (
              <div
                key={opt.key}
                className={`${styles.optionCard} ${isSelected ? styles.selected : ''} ${isDisabled ? styles.disabled : ''}`}
              >
                <button
                  type="button"
                  className={styles.optionButton}
                  disabled={isDisabled}
                  title={isDisabled ? opt.verfuegbar_grund : undefined}
                  onClick={() => {
                    if (isDisabled) return;
                    setSelectedOption(opt);
                    setSelectedSubOption(null);
                  }}
                >
                  {Icon && <Icon size={18} className={styles.optionIcon} />}
                  <div className={styles.optionContent}>
                    <h4 className={styles.optionTitle}>{opt.label_de}</h4>
                    {opt.key === 'ministerium_kuerzen' && (
                      <p className={styles.optionDesc}>{t('game:gegenfinanzierung.ressortDesc', 'Kürzungen in einem Ressort decken die Kosten.')}</p>
                    )}
                    {opt.key === 'schulden' && (
                      <p className={styles.optionDesc}>
                        {t('game:gegenfinanzierung.schuldenSpielraum', {
                          spielraum: (opt.schuldenbremse_spielraum ?? 0).toFixed(1),
                          defaultValue: `Schuldenbremse-Spielraum: ${formatMrdShort(opt.schuldenbremse_spielraum ?? 0)} verbleibend`,
                        })}
                      </p>
                    )}
                    {opt.key === 'steuergesetz' && (
                      <p className={styles.optionDesc}>{t('game:gegenfinanzierung.steuergesetzDesc', 'Das Gesetz tritt erst in Kraft, wenn das Steuergesetz beschlossen ist.')}</p>
                    )}
                    {opt.key === 'ueberschuss' && (
                      <p className={styles.optionDesc}>
                        {t('game:gegenfinanzierung.ueberschussSpielraum', {
                          saldo: (opt.haushalt_saldo ?? 0).toFixed(1),
                          defaultValue: `Aktueller Überschuss: ${formatMrdShort(opt.haushalt_saldo ?? 0)}`,
                        })}
                      </p>
                    )}
                    {opt.key === 'schulden' && opt.hat_lehmann && (
                      <span className={styles.lehmannWarning}>
                        <AlertTriangle size={14} /> {t('game:gegenfinanzierung.lehmannWarnung', 'Robert Lehmann wird negativ reagieren')}
                      </span>
                    )}
                    {isDisabled && opt.verfuegbar_grund && (
                      <span className={styles.verfuegbarGrund}>{opt.verfuegbar_grund}</span>
                    )}
                  </div>
                </button>
                {isSelected && needsSubOption && opt.suboptionen && (
                  <div className={styles.suboptions}>
                    <label className={styles.suboptionsLabel}>
                      {opt.key === 'ministerium_kuerzen'
                        ? t('game:gegenfinanzierung.ressortWaehlen')
                        : t('game:gegenfinanzierung.steuergesetzWaehlen')}
                    </label>
                    <div className={styles.suboptionsList}>
                      {opt.suboptionen.map((sub) => {
                        const isRessort = 'ressort' in sub && sub.ressort;
                        const isSteuergesetz = 'gesetzId' in sub;
                        const key = isRessort ? sub.ressort! : (isSteuergesetz ? sub.gesetzId! : '');
                        const label =
                          isRessort
                            ? (t(`game:gegenfinanzierung.ressort.${sub.ressort}`, { defaultValue: sub.ressort ?? key }) as string)
                            : (isSteuergesetz && sub.gesetzId && getGesetzTitel ? getGesetzTitel(sub.gesetzId) : (isSteuergesetz ? sub.gesetzId : key));
                        const einsparung = 'kosten_einsparung' in sub ? sub.kosten_einsparung : ('einnahmeeffekt' in sub ? sub.einnahmeeffekt : undefined);
                        const ministerName = 'minister_name' in sub ? sub.minister_name : undefined;
                        const moodMalus = 'minister_mood' in sub ? sub.minister_mood : undefined;
                        const milieuReaktionen = 'milieu_reaktionen' in sub ? sub.milieu_reaktionen : undefined;
                        return (
                          <button
                            key={key}
                            type="button"
                            className={`${styles.suboption} ${selectedSubOption === key ? styles.selected : ''}`}
                            onClick={() => setSelectedSubOption(key)}
                          >
                            <span className={styles.suboptionLabel}>{label}</span>
                            {ministerName && (
                              <span className={styles.suboptionMinister}>{ministerName}</span>
                            )}
                            {einsparung != null && (
                              <span className={styles.einsparung}>+{einsparung} Mrd.</span>
                            )}
                            {moodMalus != null && moodMalus < 0 && (
                              <span className={styles.moodMalus}>Mood {moodMalus}</span>
                            )}
                            {milieuReaktionen && Object.keys(milieuReaktionen).length > 0 && (
                              <span className={styles.milieuEffekte}>
                                {Object.entries(milieuReaktionen)
                                  .map(([m, d]) => `${m} ${d >= 0 ? '+' : ''}${d}`)
                                  .join(', ')}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
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
            {t('game:gegenfinanzierung.bestaetigenEinbringen', { pk: pkKosten, defaultValue: `Bestätigen & Einbringen (${pkKosten} PK)` })}
          </button>
        </div>
      </div>
    </div>
  );
}
