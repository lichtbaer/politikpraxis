import { useShallow } from 'zustand/react/shallow';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { useGameActions } from '../hooks/useGameActions';
import type { SpeedLevel } from '../../core/types';
import styles from './Header.module.css';

export function Header() {
  const { t } = useTranslation();
  const { month, speed, pk } = useGameStore(
    useShallow(s => ({ month: s.state.month, speed: s.state.speed, pk: s.state.pk })),
  );
  const { setSpeed } = useGameActions();
  const year = 2025 + Math.floor((month - 1) / 12);

  const speeds: { level: SpeedLevel; label: string }[] = [
    { level: 0, label: '⏸' },
    { level: 1, label: t('game.speed.slow') },
    { level: 2, label: t('game.speed.fast') },
  ];

  return (
    <header className={styles.header}>
      <div className={styles.title}>{t('app.title')}</div>
      <div className={styles.meta}>
        <div>
          {t('header.monthFormat', { month, year })}
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
