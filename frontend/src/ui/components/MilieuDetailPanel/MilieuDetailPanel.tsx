import { useTranslation } from 'react-i18next';
import { useContentStore } from '../../../store/contentStore';
import { useGameStore } from '../../../store/gameStore';
import { featureActive } from '../../../core/systems/features';
import type { Milieu } from '../../../core/types';
import { CheckCircle, AlertTriangle, ArrowRight } from '../../icons';
import styles from './MilieuDetailPanel.module.css';

interface MilieuDetailPanelProps {
  milieu: Milieu;
  onClose: () => void;
}

function getTrendDelta(history: number[]): number | null {
  if (!history || history.length < 2) return null;
  const recent = history[history.length - 1];
  const older = history[history.length - 2];
  return Math.round(recent - older);
}

export function MilieuDetailPanel({ milieu, onClose }: MilieuDetailPanelProps) {
  const { t } = useTranslation('game');
  const gesetze = useContentStore((s) => s.gesetze);
  const complexity = useGameStore((s) => s.complexity);
  const state = useGameStore((s) => s.state);
  const ausrichtung = useGameStore((s) => s.ausrichtung);

  const zustimmung = state.milieuZustimmung?.[milieu.id] ?? 50;
  const history = state.milieuZustimmungHistory?.[milieu.id] ?? [];
  const reaktionen = state.milieuGesetzReaktionen?.[milieu.id] ?? [];
  const trendDelta = getTrendDelta(history);
  const showIdeologie = featureActive(complexity, 'milieu_drift') || complexity >= 3;

  const spielerIdeologie = ausrichtung ?? { wirtschaft: 0, gesellschaft: 0, staat: 0 };
  const ideo = milieu.ideologie ?? { wirtschaft: 0, gesellschaft: 0, staat: 0 };
  const wDiff = ideo.wirtschaft - spielerIdeologie.wirtschaft;
  const gDiff = ideo.gesellschaft - spielerIdeologie.gesellschaft;
  const sDiff = ideo.staat - spielerIdeologie.staat;

  return (
    <div className={styles.panel} role="dialog" aria-labelledby="milieu-detail-title">
      <div className={styles.header}>
        <h4 id="milieu-detail-title" className={styles.title}>
          {t(`game:milieu.${milieu.id}`, milieu.kurz ?? milieu.id)}
        </h4>
        <span className={styles.zustimmung}>{Math.round(zustimmung)}%</span>
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          aria-label={t('game:milieu.milieuDetail.close')}
        >
          ×
        </button>
      </div>
      <div className={styles.divider} />
      {milieu.beschreibung && (
        <p className={styles.beschreibung}>{milieu.beschreibung}</p>
      )}
      <div className={styles.meta}>
        <span>{t('game:milieu.milieuDetail.anteil', { percent: milieu.gewicht ?? 14 })}</span>
      </div>
      {reaktionen.length > 0 && (
        <div className={styles.section}>
          <h5 className={styles.sectionTitle}>{t('game:milieu.milieuDetail.reaktionen')}</h5>
          <ul className={styles.reaktionenListe}>
            {reaktionen.slice().reverse().map((r, i) => {
              const gesetz = gesetze.find((g) => g.id === r.gesetzId);
              const kurz = gesetz?.kurz ?? r.gesetzId;
              const icon = r.delta > 0 ? <CheckCircle size={12} /> : r.delta < 0 ? <AlertTriangle size={12} /> : <ArrowRight size={12} />;
              const sign = r.delta > 0 ? '+' : '';
              return (
                <li key={`${r.gesetzId}-${i}`} className={styles.reaktionItem}>
                  <span>{icon}</span>
                  <span>{kurz}: {sign}{r.delta}%</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {history.length >= 2 && (
        <div className={styles.trend}>
          <span>{t('game:milieu.milieuDetail.trend')}:</span>
          {trendDelta !== null && (
            <span className={trendDelta > 0 ? styles.trendUp : trendDelta < 0 ? styles.trendDown : ''}>
              {trendDelta > 0 ? '↑' : trendDelta < 0 ? '↓' : '→'} {trendDelta > 0 ? '+' : ''}{trendDelta}%
            </span>
          )}
        </div>
      )}
      {showIdeologie && (
        <div className={styles.ideologie}>
          <span>{t('game:milieu.milieuDetail.ideologie')}:</span>
          <span>W:{wDiff >= 0 ? '+' : ''}{wDiff} / G:{gDiff >= 0 ? '+' : ''}{gDiff} / S:{sDiff >= 0 ? '+' : ''}{sDiff}</span>
        </div>
      )}
    </div>
  );
}
