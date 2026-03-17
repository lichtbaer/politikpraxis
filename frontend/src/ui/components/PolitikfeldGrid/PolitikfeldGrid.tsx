import { useTranslation } from 'react-i18next';
import { useContentStore } from '../../../stores/contentStore';
import { useGameStore } from '../../../store/gameStore';
import { featureActive } from '../../../core/systems/features';
import styles from './PolitikfeldGrid.module.css';

const EMPTY_DRUCK: Record<string, number> = {};

const FELD_ICONS: Record<string, string> = {
  umwelt_energie: '🌱',
  wirtschaft_finanzen: '📊',
  bildung_forschung: '📚',
  arbeit_soziales: '👷',
  umwelt: '🌱',
  wirtschaft: '📊',
  arbeit: '👷',
};

interface PolitikfeldGridProps {
  /** Auswahlmodus: max. N Felder wählbar */
  selectable?: number;
  /** Callback bei Auswahländerung */
  onSelect?: (ids: string[]) => void;
  /** Aktuell ausgewählte IDs (kontrolliert) */
  selectedIds?: string[];
  /** Druck-Scores überschreiben (z.B. für Haushaltsdebatte) */
  druckScores?: Record<string, number>;
  /** Felder überschreiben (z.B. verfuegbarePrioritaeten) */
  felder?: { id: string }[];
}

export function PolitikfeldGrid(props?: PolitikfeldGridProps) {
  const { t } = useTranslation('game');
  const contentPolitikfelder = useContentStore((s) => s.politikfelder);
  const politikfeldDruck = useGameStore((s) => s.state.politikfeldDruck ?? EMPTY_DRUCK);
  const complexity = useGameStore((s) => s.complexity);

  const {
    selectable,
    onSelect,
    selectedIds = [],
    druckScores,
    felder,
  } = props ?? {};

  const politikfelder = felder ?? contentPolitikfelder;
  const druck = druckScores ?? politikfeldDruck;

  if (politikfelder.length === 0) return null;
  if (!selectable && !featureActive(complexity, 'politikfeld_druck')) return null;
  if (selectable && !featureActive(complexity, 'haushaltsdebatte')) return null;

  const handleClick = (feldId: string) => {
    if (!selectable || !onSelect) return;
    const next = selectedIds.includes(feldId)
      ? selectedIds.filter((id) => id !== feldId)
      : selectedIds.length < selectable
        ? [...selectedIds, feldId]
        : selectedIds;
    onSelect(next);
  };

  return (
    <div className={styles.grid}>
      {politikfelder.map((feld) => {
        const druckVal = druck[feld.id] ?? 0;
        const druckClass =
          druckVal > 70 ? styles.kritisch : druckVal > 40 ? styles.warn : styles.ok;
        const isSelected = selectedIds.includes(feld.id);
        const isClickable = !!selectable;

        return (
          <div
            key={feld.id}
            className={`${styles.feldItem} ${isClickable ? styles.clickable : ''} ${isSelected ? styles.selected : ''}`}
            onClick={isClickable ? () => handleClick(feld.id) : undefined}
            role={isClickable ? 'button' : undefined}
          >
            <span className={styles.feldIcon}>
              {FELD_ICONS[feld.id] ?? '📋'}
            </span>
            <div className={styles.druckBar}>
              <div
                className={`${styles.druckFill} ${druckClass}`}
                style={{ width: `${Math.min(100, druckVal)}%` }}
              />
            </div>
            <span className={styles.feldName}>
              {t(`game:politikfeld.${feld.id}`, feld.id)}
            </span>
            {isSelected && <span className={styles.check}>✓</span>}
          </div>
        );
      })}
    </div>
  );
}
