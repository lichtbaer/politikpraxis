import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { useGameActions } from '../hooks/useGameActions';
import type { MilieuKey } from '../../core/systems/media';
import styles from './MediaView.module.css';

const MILIEU_KEYS: MilieuKey[] = ['arbeit', 'mitte', 'prog'];
const MILIEU_COLORS: Record<MilieuKey, string> = {
  arbeit: 'var(--land-c)',
  mitte: 'var(--eu-c)',
  prog: 'var(--blue)',
};

export function MediaView() {
  const { t } = useTranslation('game');
  const { state } = useGameStore();
  const { medienkampagne } = useGameActions();
  const pk = state.pk;
  const canCampaign = pk >= 10;

  return (
    <div className={styles.root}>
      <h1 className={styles.title}>{t('game:media.title')}</h1>
      <p className={styles.desc}>
        {t('game:media.desc')}
      </p>
      <div className={styles.cards}>
        {MILIEU_KEYS.map((key) => (
          <div key={key} className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle} style={{ color: MILIEU_COLORS[key] }}>
                {t(`game:media.${key}.name`)}
              </h3>
              <span className={styles.percentage}>{Math.round(state.zust[key])}%</span>
            </div>
            <p className={styles.cardDesc}>{t(`game:media.${key}.desc`)}</p>
            <button
              type="button"
              className={styles.btn}
              disabled={!canCampaign}
              onClick={() => medienkampagne(key)}
            >
              {t('game:media.kampagne')}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
