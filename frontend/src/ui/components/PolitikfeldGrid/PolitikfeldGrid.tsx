import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useContentStore } from '../../../store/contentStore';
import { useGameStore } from '../../../store/gameStore';
import { featureActive } from '../../../core/systems/features';
import { PolitikfeldIcon, Check, CircleAlert, AlertTriangle } from '../../icons';
import styles from './PolitikfeldGrid.module.css';

const EMPTY_DRUCK: Record<string, number> = {};

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

function PolitikfeldTooltipContent({
  feldId,
  druckVal,
  verbandKurz,
  offeneGesetze,
  t,
}: {
  feldId: string;
  druckVal: number;
  verbandKurz: string | null;
  offeneGesetze: string[];
  t: TFunction;
}) {
  return (
    <div className={styles.tooltipContent}>
      <div className={styles.tooltipTitle}>{t(`politikfeld.${feldId}`, feldId)}</div>
      <div>{t('politikfeldTooltip.druck', { value: druckVal })}</div>
      {verbandKurz && (
        <div>{t('politikfeldTooltip.aktiverVerband', { verband: verbandKurz })}</div>
      )}
      {offeneGesetze.length > 0 && (
        <div>{t('politikfeldTooltip.offeneGesetze', { list: offeneGesetze.slice(0, 3).join(', ') })}</div>
      )}
      <div className={styles.tooltipAction}>{t('politikfeldTooltip.zurVerbaende')}</div>
    </div>
  );
}

export function PolitikfeldGrid(props?: PolitikfeldGridProps) {
  const { t } = useTranslation('game');
  const contentPolitikfelder = useContentStore((s) => s.politikfelder);
  const verbaende = useContentStore((s) => s.verbaende);
  const gesetze = useGameStore((s) => s.state.gesetze);
  const politikfeldDruck = useGameStore((s) => s.state.politikfeldDruck ?? EMPTY_DRUCK);
  const complexity = useGameStore((s) => s.complexity);
  const setView = useGameStore((s) => s.setView);
  const [tooltipFeld, setTooltipFeld] = useState<string | null>(null);

  const {
    selectable,
    onSelect,
    selectedIds = [],
    druckScores,
    felder,
  } = props ?? {};

  const politikfelder = felder ?? contentPolitikfelder;
  const druck = druckScores ?? politikfeldDruck;
  const showDruckZahl = complexity >= 2;
  const showVerband = featureActive(complexity, 'verbands_lobbying');

  if (politikfelder.length === 0) return null;
  if (!selectable && !featureActive(complexity, 'politikfeld_druck')) return null;
  if (selectable && !featureActive(complexity, 'haushaltsdebatte')) return null;

  const handleClick = (feldId: string) => {
    if (selectable && onSelect) {
      const next = selectedIds.includes(feldId)
        ? selectedIds.filter((id) => id !== feldId)
        : selectedIds.length < selectable
          ? [...selectedIds, feldId]
          : selectedIds;
      onSelect(next);
    } else if (!selectable) {
      setView('verbaende');
    }
  };

  return (
    <div className={styles.grid}>
      {politikfelder.map((feld) => {
        const druckVal = druck[feld.id] ?? 0;
        const druckClass =
          druckVal > 70 ? styles.kritisch : druckVal > 40 ? styles.warn : styles.ok;
        const isSelected = selectedIds.includes(feld.id);
        const fullFeld = contentPolitikfelder.find((p) => p.id === feld.id) ?? feld;
        const verbandId = 'verbandId' in fullFeld ? fullFeld.verbandId : null;
        const verband = verbandId ? verbaende.find((v) => v.id === verbandId) : null;
        const verbandKurz = showVerband && verband ? verband.kurz : null;
        const offeneGesetze = gesetze
          .filter((g) => g.politikfeldId === feld.id && g.status !== 'beschlossen')
          .map((g) => g.kurz);
        const showTooltip = !selectable && (tooltipFeld === feld.id);

        return (
          <div
            key={feld.id}
            className={`${styles.feldItem} ${styles.clickable} ${isSelected ? styles.selected : ''}`}
            onClick={() => handleClick(feld.id)}
            onMouseEnter={() => setTooltipFeld(feld.id)}
            onMouseLeave={() => setTooltipFeld(null)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleClick(feld.id)}
            title={t(`politikfeld.${feld.id}`, feld.id)}
          >
            <div className={styles.feldRow}>
              <span className={styles.feldIcon}>
                <PolitikfeldIcon feldId={feld.id} size={16} />
              </span>
              <span className={styles.feldName}>
                {t(`politikfeld.${feld.id}`, feld.id)}
              </span>
            </div>
            <div className={styles.druckBar}>
              <div
                className={`${styles.druckFill} ${druckClass}`}
                style={{ width: `${Math.min(100, druckVal)}%` }}
              />
            </div>
            <div className={styles.feldMeta}>
              {showDruckZahl && (
                <span className={`${styles.druckZahl} ${druckClass}`}>
                  {Math.round(druckVal)}
                  {druckVal > 70 && <span className={styles.druckWarn}> <CircleAlert size={12} /></span>}
                  {druckVal > 40 && druckVal <= 70 && <span className={styles.druckWarn}> <AlertTriangle size={12} /></span>}
                </span>
              )}
              {showVerband && verbandKurz && (
                <span className={styles.verbandBadge}>[{verbandKurz}]</span>
              )}
            </div>
            {isSelected && <span className={styles.check}><Check size={14} /></span>}
            {showTooltip && (
              <div className={styles.tooltip}>
                <PolitikfeldTooltipContent
                  feldId={feld.id}
                  druckVal={Math.round(druckVal)}
                  verbandKurz={verbandKurz}
                  offeneGesetze={offeneGesetze}
                  t={t}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
