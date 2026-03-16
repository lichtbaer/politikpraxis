import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import type { RouteType } from '../../core/types';
import styles from './EbeneView.module.css';

interface EbeneViewProps {
  type: 'eu' | 'land' | 'kommune';
}

const COLOR_VAR: Record<RouteType, string> = {
  eu: 'var(--eu-c)',
  land: 'var(--land-c)',
  kommune: 'var(--kom-c)',
};

export function EbeneView({ type }: EbeneViewProps) {
  const { t } = useTranslation('game');
  const { state } = useGameStore();
  const activeLaws = state.gesetze.filter(
    (g) => g.status === 'ausweich' && g.route === type
  );
  const color = COLOR_VAR[type];

  return (
    <div className={styles.root}>
      <h1 className={styles.title} style={{ color }}>
        {t(`game:routes.${type}`)}
      </h1>
      <p className={styles.desc}>{t(`game:ebene.${type}`)}</p>
      <div className={styles.list}>
        {activeLaws.length === 0 ? (
          <p className={styles.empty}>{t('game:ebene.empty')}</p>
        ) : (
          activeLaws.map((law) => (
            <div key={law.id} className={styles.lawCard}>
              <div className={styles.lawHeader}>
                <span className={styles.lawTitle}>{t(`game:laws.${law.id}.kurz`)}</span>
                <span className={styles.lawProgress}>
                  {t('game:ebene.monate', { progress: law.rprog, duration: law.rdur })}
                </span>
              </div>
              <div className={styles.progressTrack}>
                <div
                  className={styles.progressFill}
                  style={{
                    width: `${(law.rprog / law.rdur) * 100}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
