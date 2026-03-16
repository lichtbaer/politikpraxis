import { useGameStore } from '../../../store/gameStore';
import styles from './EndScreen.module.css';

export function EndScreen() {
  const { state } = useGameStore();

  if (!state.gameOver) return null;

  const beschlossen = state.gesetze.filter((g) => g.status === 'beschlossen').length;

  return (
    <div className={styles.overlay}>
      <div className={styles.content}>
        <h1 className={state.won ? styles.titleWon : styles.titleLost}>
          {state.won ? 'Wiedergewählt' : 'Abgewählt'}
        </h1>
        <p className={styles.subtitle}>
          {state.won
            ? `Sie haben die Wahl mit ${state.pk.toFixed(1)}% Zustimmung gewonnen.`
            : `Die Legislaturperiode endet mit ${state.pk.toFixed(1)}% Zustimmung — unter der erforderlichen Mehrheit.`}
        </p>

        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Beschlossene Gesetze</span>
            <span className={styles.statValue}>{beschlossen}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Finale KPIs</span>
            <span className={styles.statValue}>
              AL {state.kpi.al.toFixed(1)}% · HH {state.kpi.hh.toFixed(1)}% · GI {state.kpi.gi.toFixed(1)} · ZF {state.kpi.zf.toFixed(1)}%
            </span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Milieu-Zustimmung</span>
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
          Neue Legislaturperiode
        </button>
      </div>
    </div>
  );
}
