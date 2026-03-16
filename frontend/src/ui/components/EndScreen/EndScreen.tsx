import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../../store/gameStore';
import styles from './EndScreen.module.css';

export function EndScreen() {
  const { t } = useTranslation('game');
  const { state } = useGameStore();

  if (!state.gameOver) return null;

  const beschlossen = state.gesetze.filter((g) => g.status === 'beschlossen').length;

  return (
    <div className={styles.overlay}>
      <div className={styles.content}>
        <h1 className={state.won ? styles.titleWon : styles.titleLost}>
          {state.won ? t('game:endScreen.won') : t('game:endScreen.lost')}
        </h1>
        <p className={styles.subtitle}>
          {state.won
            ? t('game:endScreen.wonSubtitle', { percent: state.pk.toFixed(1) })
            : t('game:endScreen.lostSubtitle', { percent: state.pk.toFixed(1) })}
        </p>

        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>{t('game:endScreen.beschlosseneGesetze')}</span>
            <span className={styles.statValue}>{beschlossen}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>{t('game:endScreen.finaleKPIs')}</span>
            <span className={styles.statValue}>
              AL {state.kpi.al.toFixed(1)}% · HH {state.kpi.hh.toFixed(1)}% · GI {state.kpi.gi.toFixed(1)} · ZF {state.kpi.zf.toFixed(1)}%
            </span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>{t('game:endScreen.milieuZustimmung')}</span>
            <span className={styles.statValue}>
              G {state.zust.g}% · Arbeit {state.zust.arbeit}% · Mitte {state.zust.mitte}% · Prog {state.zust.prog}%
            </span>
          </div>
        </div>

        <button
          type="button"
          className={styles.restart}
          onClick={() => location.reload()}
        >
          {t('game:endScreen.neueLegislatur')}
        </button>
      </div>
    </div>
  );
}
