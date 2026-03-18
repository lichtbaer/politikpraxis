import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../../store/gameStore';
import styles from './EndScreen.module.css';

function ApprovalSparkline({ data, threshold }: { data: number[]; threshold?: number }) {
  if (!data.length) return null;
  const w = 200;
  const h = 60;
  const max = 100;
  const points = data
    .map((v, i) => `${(i / Math.max(data.length - 1, 1)) * w},${h - (v / max) * h}`)
    .join(' ');
  const thresholdY = threshold != null ? h - (threshold / max) * h : null;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={styles.sparkline} preserveAspectRatio="none">
      {thresholdY != null && (
        <line x1="0" y1={thresholdY} x2={w} y2={thresholdY} stroke="var(--gold)" strokeWidth="1" strokeDasharray="4 3" opacity="0.6" />
      )}
      <polyline points={points} fill="none" stroke="var(--green)" strokeWidth="2" />
    </svg>
  );
}

export function EndScreen() {
  const { t } = useTranslation('game');
  const { state } = useGameStore();

  if (!state.gameOver) return null;

  const beschlosseneGesetze = state.gesetze.filter((g) => g.status === 'beschlossen');
  const approvalHistory = state.approvalHistory ?? [];

  return (
    <div className={styles.overlay}>
      <div className={styles.content}>
        <h1 className={state.won ? styles.titleWon : styles.titleLost}>
          {state.won ? t('game:endScreen.won') : t('game:endScreen.lost')}
        </h1>
        <p className={styles.subtitle}>
          {state.won
            ? t('game:endScreen.wonSubtitle', { percent: state.zust.g.toFixed(1) })
            : t('game:endScreen.lostSubtitle', { percent: state.zust.g.toFixed(1) })}
        </p>

        {approvalHistory.length > 1 && (
          <div className={styles.sparklineWrap}>
            <span className={styles.sparklineLabel}>Zustimmungsverlauf</span>
            <ApprovalSparkline data={approvalHistory} threshold={state.electionThreshold} />
          </div>
        )}

        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>{t('game:endScreen.beschlosseneGesetze')}</span>
            <span className={styles.statValue}>{beschlosseneGesetze.length}</span>
            {beschlosseneGesetze.length > 0 && (
              <ul className={styles.lawList}>
                {beschlosseneGesetze.map((g) => (
                  <li key={g.id} className={styles.lawItem}>{g.name}</li>
                ))}
              </ul>
            )}
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

        <p className={styles.spielzeit}>{state.month} Monate gespielt</p>

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
