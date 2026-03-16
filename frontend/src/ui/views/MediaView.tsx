import { useGameStore } from '../../store/gameStore';
import { useGameActions } from '../hooks/useGameActions';
import type { MilieuKey } from '../../core/systems/media';
import styles from './MediaView.module.css';

const MILIEU_CONFIG: { key: MilieuKey; name: string; desc: string; color: string }[] = [
  { key: 'arbeit', name: 'Arbeitsmilieu', desc: 'Gewerkschaftsnahe Wähler, Fokus auf soziale Gerechtigkeit.', color: 'var(--land-c)' },
  { key: 'mitte', name: 'Mitte', desc: 'Bürgerliche Mitte, wirtschaftsorientiert.', color: 'var(--eu-c)' },
  { key: 'prog', name: 'Progressive', desc: 'Urban, klimabewusst, diversitätsorientiert.', color: 'var(--blue)' },
];

export function MediaView() {
  const { state } = useGameStore();
  const { medienkampagne } = useGameActions();
  const pk = state.pk;
  const canCampaign = pk >= 10;

  return (
    <div className={styles.root}>
      <h1 className={styles.title}>Medien & Milieus</h1>
      <p className={styles.desc}>
        Beeinflussen Sie die öffentliche Meinung durch gezielte Medienkampagnen.
      </p>
      <div className={styles.cards}>
        {MILIEU_CONFIG.map(({ key, name, desc, color }) => (
          <div key={key} className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle} style={{ color }}>
                {name}
              </h3>
              <span className={styles.percentage}>{Math.round(state.zust[key])}%</span>
            </div>
            <p className={styles.cardDesc}>{desc}</p>
            <button
              type="button"
              className={styles.btn}
              disabled={!canCampaign}
              onClick={() => medienkampagne(key)}
            >
              Kampagne (10 PK)
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
