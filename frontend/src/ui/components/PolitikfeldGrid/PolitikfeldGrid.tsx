import { useTranslation } from 'react-i18next';
import { useContentStore } from '../../../stores/contentStore';
import { useGameStore } from '../../../store/gameStore';
import { featureActive } from '../../../core/systems/features';
import styles from './PolitikfeldGrid.module.css';

const FELD_ICONS: Record<string, string> = {
  umwelt_energie: '🌱',
  wirtschaft_finanzen: '📊',
  bildung_forschung: '📚',
  arbeit_soziales: '👷',
  umwelt: '🌱',
  wirtschaft: '📊',
  arbeit: '👷',
};

export function PolitikfeldGrid() {
  const { t } = useTranslation('game');
  const politikfelder = useContentStore((s) => s.politikfelder);
  const politikfeldDruck = useGameStore((s) => s.state.politikfeldDruck ?? {});
  const complexity = useGameStore((s) => s.complexity);

  if (!featureActive(complexity, 'politikfeld_druck') || politikfelder.length === 0) {
    return null;
  }

  return (
    <div className={styles.grid}>
      {politikfelder.map((feld) => {
        const druck = politikfeldDruck[feld.id] ?? 0;
        const druckClass =
          druck > 70 ? styles.kritisch : druck > 40 ? styles.warn : styles.ok;
        return (
          <div className={styles.feldItem} key={feld.id}>
            <span className={styles.feldIcon}>
              {FELD_ICONS[feld.id] ?? '📋'}
            </span>
            <div className={styles.druckBar}>
              <div
                className={`${styles.druckFill} ${druckClass}`}
                style={{ width: `${Math.min(100, druck)}%` }}
              />
            </div>
            <span className={styles.feldName}>
              {t(`game:politikfeld.${feld.id}`, feld.id)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
