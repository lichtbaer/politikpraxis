import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { useGameActions } from '../hooks/useGameActions';
import { featureActive } from '../../core/systems/features';
import { PressemitteilungModal } from '../components/PressemitteilungModal/PressemitteilungModal';
import type { SpeedLevel } from '../../core/types';
import styles from './Header.module.css';

export function Header() {
  const { t } = useTranslation();
  const [showPressemitteilungModal, setShowPressemitteilungModal] = useState(false);
  const { month, speed, pk, letztesPressemitteilungMonat } = useGameStore(
    useShallow(s => ({
      month: s.state.month,
      speed: s.state.speed,
      pk: s.state.pk,
      letztesPressemitteilungMonat: s.state.letztesPressemitteilungMonat,
    })),
  );
  const complexity = useGameStore((s) => s.complexity);
  const { setSpeed, doPressemitteilung } = useGameActions();

  const canPressemitteilung =
    featureActive(complexity, 'pressemitteilung') &&
    letztesPressemitteilungMonat !== month &&
    pk >= 5;
  const year = 2025 + Math.floor((month - 1) / 12);

  const speeds: { level: SpeedLevel; label: string; titleKey: string }[] = [
    { level: 0, label: '⏸', titleKey: 'game.speed.pauseTitle' },
    { level: 1, label: t('game.speed.slow'), titleKey: 'game.speed.slowTitle' },
    { level: 2, label: t('game.speed.fast'), titleKey: 'game.speed.fastTitle' },
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
              type="button"
              className={`${styles.spd} ${speed === s.level ? styles.on : ''}`}
              onClick={() => setSpeed(s.level)}
              title={t(s.titleKey)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className={styles.pk} title={t('header.pkTooltip')}>
          PK <span>{pk}</span>
        </div>
        {canPressemitteilung && (
          <button
            type="button"
            className={styles.pressemitteilungBtn}
            onClick={() => setShowPressemitteilungModal(true)}
          >
            📢 {t('game:pressemitteilung.button')}
          </button>
        )}
      </div>
      {showPressemitteilungModal && (
        <PressemitteilungModal
          onConfirm={(thema) => doPressemitteilung(thema)}
          onClose={() => setShowPressemitteilungModal(false)}
        />
      )}
    </header>
  );
}
