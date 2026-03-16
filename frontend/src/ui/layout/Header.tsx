import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../../store/gameStore';
import { useGameActions } from '../hooks/useGameActions';
import type { SpeedLevel } from '../../core/types';
import styles from './Header.module.css';

export function Header() {
  const { month, speed, pk } = useGameStore(
    useShallow(s => ({ month: s.state.month, speed: s.state.speed, pk: s.state.pk })),
  );
  const { setSpeed } = useGameActions();
  const year = 2025 + Math.floor((month - 1) / 12);

  const speeds: { level: SpeedLevel; label: string }[] = [
    { level: 0, label: '⏸' },
    { level: 1, label: '1×' },
    { level: 2, label: '3×' },
  ];

  return (
    <header className={styles.header}>
      <div className={styles.title}>Bundesrepublik</div>
      <div className={styles.meta}>
        <div>
          Monat <b>{month}</b>/48 · <b>{year}</b>
        </div>
        <div className={styles.speedRow}>
          {speeds.map(s => (
            <button
              key={s.level}
              className={`${styles.spd} ${speed === s.level ? styles.on : ''}`}
              onClick={() => setSpeed(s.level)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className={styles.pk}>
          PK <span>{pk}</span>
        </div>
      </div>
    </header>
  );
}
