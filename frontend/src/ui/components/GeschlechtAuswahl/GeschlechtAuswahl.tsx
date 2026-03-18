/**
 * SMA-327: Geschlechtsauswahl für Kanzler — Pronomen/Anrede (sie/er/they)
 */
import { useTranslation } from 'react-i18next';
import styles from './GeschlechtAuswahl.module.css';

export type KanzlerGeschlecht = 'sie' | 'er' | 'they';

export interface GeschlechtOption {
  value: KanzlerGeschlecht;
  label: string;
}

const DEFAULT_OPTIONS: GeschlechtOption[] = [
  { value: 'sie', label: 'Bundeskanzlerin (sie/ihr)' },
  { value: 'er', label: 'Bundeskanzler (er/ihm)' },
  { value: 'they', label: 'Bundeskanzler*in (they/them)' },
];

export interface GeschlechtAuswahlProps {
  value: KanzlerGeschlecht;
  onChange: (value: KanzlerGeschlecht) => void;
  options?: GeschlechtOption[];
}

export function GeschlechtAuswahl({ value, onChange, options = DEFAULT_OPTIONS }: GeschlechtAuswahlProps) {
  const { t } = useTranslation('game');
  const opts = options.map((o) => ({
    ...o,
    label: t(`gameSetup.geschlecht.${o.value}`) || o.label,
  }));
  return (
    <div className={styles.root} role="group" aria-label={t('gameSetup.geschlechtLabel')}>
      {opts.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`${styles.option} ${value === opt.value ? styles.selected : ''}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
