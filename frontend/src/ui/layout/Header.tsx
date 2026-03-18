import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { useGameActions } from '../hooks/useGameActions';
import { featureActive } from '../../core/systems/features';
import { PK_REGEN_DIVISOR, PK_REGEN_MIN } from '../../core/constants';
import { PressemitteilungModal } from '../components/PressemitteilungModal/PressemitteilungModal';
import { Glossar } from '../components/Glossar/Glossar';
import type { SpeedLevel } from '../../core/types';
import { Megaphone } from '../icons';
import styles from './Header.module.css';

export function Header() {
  const { t } = useTranslation();
  const [showPressemitteilungModal, setShowPressemitteilungModal] = useState(false);
  const [showGlossar, setShowGlossar] = useState(false);
  const { month, speed, pk, letztesPressemitteilungMonat, zustG } = useGameStore(
    useShallow(s => ({
      month: s.state.month,
      speed: s.state.speed,
      pk: s.state.pk,
      letztesPressemitteilungMonat: s.state.letztesPressemitteilungMonat,
      zustG: s.state.zust.g,
    })),
  );
  const complexity = useGameStore((s) => s.complexity);
  const { setSpeed, doPressemitteilung } = useGameActions();

  const pkRegenDivisor = PK_REGEN_DIVISOR + (complexity - 1) * 3;
  const pkRegen = Math.max(PK_REGEN_MIN, Math.floor(zustG / pkRegenDivisor));
  const pkRegenTooltip = t('header.pkRegenTooltip', {
    defaultValue: 'PK-Regeneration: {{regen}}/Monat ({{approval}}% Zustimmung ÷ {{divisor}})',
    regen: pkRegen,
    approval: Math.round(zustG),
    divisor: pkRegenDivisor,
  });

  const canPressemitteilung =
    featureActive(complexity, 'pressemitteilung') &&
    letztesPressemitteilungMonat !== month &&
    pk >= 5;
  const year = 2025 + Math.floor((month - 1) / 12);

  const speeds: { level: SpeedLevel; label: string; titleKey: string; shortcut: string }[] = [
    { level: 0, label: '⏸', titleKey: 'game.speed.pauseTitle', shortcut: '␣' },
    { level: 1, label: t('game.speed.slow'), titleKey: 'game.speed.slowTitle', shortcut: '1' },
    { level: 2, label: t('game.speed.fast'), titleKey: 'game.speed.fastTitle', shortcut: '3' },
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
              <kbd className={styles.kbd}>{s.shortcut}</kbd>
            </button>
          ))}
        </div>
        <div className={styles.pk} title={pkRegenTooltip}>
          PK <span>{pk}</span>
          <div className={styles.pkBar}>
            <div className={styles.pkBarFill} style={{ width: `${Math.min(100, (pk / 150) * 100)}%` }} />
          </div>
          <span className={styles.pkRegen}>+{pkRegen}/Mo</span>
        </div>
        {canPressemitteilung && (
          <button
            type="button"
            className={styles.pressemitteilungBtn}
            onClick={() => setShowPressemitteilungModal(true)}
          >
            <Megaphone size={14} /> {t('game:pressemitteilung.button')}
          </button>
        )}
        <button
          type="button"
          className={styles.glossarBtn}
          onClick={() => setShowGlossar(true)}
          title="Glossar — Spielbegriffe erklärt"
        >
          ?
        </button>
      </div>
      {showPressemitteilungModal && (
        <PressemitteilungModal
          onConfirm={(thema) => doPressemitteilung(thema)}
          onClose={() => setShowPressemitteilungModal(false)}
        />
      )}
      {showGlossar && <Glossar onClose={() => setShowGlossar(false)} />}
    </header>
  );
}
