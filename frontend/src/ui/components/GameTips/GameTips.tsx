import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../../store/gameStore';
import type { GameState } from '../../../core/types';
import { Lightbulb } from '../../icons';
import styles from './GameTips.module.css';

interface Tip {
  id: string;
  /** i18n key suffix for title/text under "tips.*" */
  i18nKey: string;
  /** Monat ab dem der Tipp angezeigt werden kann */
  triggerMonth: number;
  /** Zusätzliche Bedingung (optional) */
  condition?: (state: GameState) => boolean;
}

const TIPS: Tip[] = [
  {
    id: 'erstes_gesetz',
    i18nKey: 'erstesGesetz',
    triggerMonth: 1,
  },
  {
    id: 'pk_knapp',
    i18nKey: 'pkKnapp',
    triggerMonth: 3,
    condition: (s) => s.pk < 30,
  },
  {
    id: 'koalition_warnung',
    i18nKey: 'koalitionsSpannungen',
    triggerMonth: 5,
    condition: (s) => s.coalition < 40,
  },
  {
    id: 'haushalt_defizit',
    i18nKey: 'haushaltsDefizit',
    triggerMonth: 6,
    condition: (s) => (s.haushalt?.saldo ?? 0) < -10,
  },
  {
    id: 'bundesrat_info',
    i18nKey: 'bundesratInfo',
    triggerMonth: 8,
    condition: (s) => s.gesetze.some(g => g.status === 'bt_passed'),
  },
  {
    id: 'wahlkampf_start',
    i18nKey: 'wahlkampfStart',
    triggerMonth: 43,
  },
];

const STORAGE_KEY = 'politikpraxis_dismissed_tips';

function getDismissedTips(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function dismissTip(id: string) {
  const dismissed = getDismissedTips();
  dismissed.add(id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...dismissed]));
}

export function GameTips() {
  const { t } = useTranslation('game');
  const state = useGameStore((s) => s.state);
  const phase = useGameStore((s) => s.phase);
  const [dismissed, setDismissed] = useState<Set<string>>(getDismissedTips);
  const activeTip = useMemo(() => {
    if (phase !== 'playing' || state.gameOver) {
      return null;
    }

    for (const tip of TIPS) {
      if (dismissed.has(tip.id)) continue;
      if (state.month < tip.triggerMonth) continue;
      if (tip.condition && !tip.condition(state)) continue;
      return tip;
    }
    return null;
  }, [state, phase, dismissed]);

  if (!activeTip) return null;

  const handleDismiss = () => {
    dismissTip(activeTip.id);
    setDismissed(prev => new Set([...prev, activeTip.id]));
  };

  return (
    <div className={styles.tip}>
      <div className={styles.tipIcon}><Lightbulb size={18} /></div>
      <div className={styles.tipContent}>
        <strong className={styles.tipTitle}>{t(`tips.${activeTip.i18nKey}.title`)}</strong>
        <p className={styles.tipText}>{t(`tips.${activeTip.i18nKey}.text`)}</p>
      </div>
      <button type="button" className={styles.tipDismiss} onClick={handleDismiss}>
        {t('tips.understood')}
      </button>
    </div>
  );
}
