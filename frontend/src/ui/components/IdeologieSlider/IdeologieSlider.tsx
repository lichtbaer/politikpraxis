/**
 * SMA-301: Ideologie-Slider mit Pol-Beschriftungen, verständlichen Labels und Farbverlauf.
 */
import { useTranslation } from 'react-i18next';
import { getIdeologieLabelKey } from '../../../core/ideologie';
import type { Ausrichtung } from '../../../core/systems/ausrichtung';
import styles from './IdeologieSlider.module.css';

export type IdeologieAchse = keyof Ausrichtung;

const ACHSE_NAMEN: Record<IdeologieAchse, string> = {
  wirtschaft: 'onboarding.wirtschaft',
  gesellschaft: 'onboarding.gesellschaft',
  staat: 'onboarding.staat',
};

const POL_KEYS: Record<IdeologieAchse, [string, string]> = {
  wirtschaft: ['onboarding.polWirtschaftLinks', 'onboarding.polWirtschaftRechts'],
  gesellschaft: ['onboarding.polGesellschaftLinks', 'onboarding.polGesellschaftRechts'],
  staat: ['onboarding.polStaatLinks', 'onboarding.polStaatRechts'],
};

interface IdeologieSliderProps {
  achse: IdeologieAchse;
  wert: number;
  min: number;
  max: number;
  onChange: (wert: number) => void;
}

export function IdeologieSlider({ achse, wert, min, max, onChange }: IdeologieSliderProps) {
  const { t } = useTranslation('game');
  const [linksKey, rechtsKey] = POL_KEYS[achse];
  const labelKey = getIdeologieLabelKey(achse, wert);

  return (
    <div className={styles.sliderGroup}>
      <div className={styles.sliderHeader}>
        <span className={styles.achseName}>{t(ACHSE_NAMEN[achse])}</span>
      </div>
      <div className={styles.sliderTrackRow}>
        <span className={styles.polLabel}>{t(linksKey)}</span>
        <div className={styles.sliderWrapper}>
          <input
            type="range"
            min={min}
            max={max}
            step={1}
            value={wert}
            onChange={(e) => onChange(Number(e.target.value))}
            className={styles.slider}
          />
        </div>
        <span className={styles.polLabel}>{t(rechtsKey)}</span>
      </div>
      <div className={styles.sliderValueLabel}>{t(labelKey)}</div>
    </div>
  );
}
