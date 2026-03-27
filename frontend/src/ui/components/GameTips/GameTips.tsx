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
  /** Mindest-Komplexitätsstufe (default: 1) */
  minComplexity?: number;
  /** Max-Komplexitätsstufe (optional — Tipp nur bis zu dieser Stufe) */
  maxComplexity?: number;
  /** Optionaler Hinweis auf relevanten Tab/View */
  viewHint?: string;
}

const TIPS: Tip[] = [
  // === Stufe 1: Grundlagen ===
  {
    id: 'erstes_gesetz',
    i18nKey: 'erstesGesetz',
    triggerMonth: 1,
    viewHint: 'agenda',
  },
  {
    id: 'geschwindigkeit',
    i18nKey: 'geschwindigkeit',
    triggerMonth: 1,
  },
  {
    id: 'kabinett_intro',
    i18nKey: 'kabinettIntro',
    triggerMonth: 2,
    viewHint: 'kabinett',
  },
  {
    id: 'pk_knapp',
    i18nKey: 'pkKnapp',
    triggerMonth: 3,
    condition: (s) => s.pk < 30,
  },
  {
    id: 'gesetz_wirkung',
    i18nKey: 'gesetzWirkung',
    triggerMonth: 4,
    condition: (s) => s.gesetze.some(g => g.status === 'eingebracht' || g.status === 'aktiv'),
  },
  // === Stufe 2: Koalition & Haushalt ===
  {
    id: 'koalition_warnung',
    i18nKey: 'koalitionsSpannungen',
    triggerMonth: 5,
    minComplexity: 2,
    condition: (s) => s.coalition < 40,
  },
  {
    id: 'haushalt_erklaerung',
    i18nKey: 'haushaltErklaerung',
    triggerMonth: 4,
    minComplexity: 2,
    viewHint: 'haushalt',
  },
  {
    id: 'haushalt_defizit',
    i18nKey: 'haushaltsDefizit',
    triggerMonth: 6,
    minComplexity: 2,
    condition: (s) => (s.haushalt?.saldo ?? 0) < -10,
  },
  {
    id: 'medienklima_intro',
    i18nKey: 'medienklimaIntro',
    triggerMonth: 3,
    minComplexity: 2,
    viewHint: 'medien',
  },
  {
    id: 'bundesrat_info',
    i18nKey: 'bundesratInfo',
    triggerMonth: 8,
    minComplexity: 2,
    condition: (s) => s.gesetze.some(g => g.status === 'bt_passed'),
    viewHint: 'bundesrat',
  },
  {
    id: 'eu_route_info',
    i18nKey: 'euRouteInfo',
    triggerMonth: 10,
    minComplexity: 2,
    condition: (s) => s.gesetze.some(g => g.status === 'blockiert'),
  },
  // === Stufe 3: Verbände & Fortgeschritten ===
  {
    id: 'verbaende_intro',
    i18nKey: 'verbaendeIntro',
    triggerMonth: 5,
    minComplexity: 3,
    viewHint: 'verbaende',
  },
  {
    id: 'minister_agenda',
    i18nKey: 'ministerAgenda',
    triggerMonth: 8,
    minComplexity: 3,
    condition: (s) => s.chars.some(c => (c.agenda_stufe_aktuell ?? 0) > 0),
  },
  // === Zeitbasierte Tipps ===
  {
    id: 'halbzeit',
    i18nKey: 'halbzeit',
    triggerMonth: 24,
  },
  {
    id: 'wahlkampf_start',
    i18nKey: 'wahlkampfStart',
    triggerMonth: 43,
    viewHint: 'wahlkampf',
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
  const complexity = useGameStore((s) => s.complexity);
  const [dismissed, setDismissed] = useState<Set<string>>(getDismissedTips);
  const activeTip = useMemo(() => {
    if (phase !== 'playing' || state.gameOver) {
      return null;
    }

    for (const tip of TIPS) {
      if (dismissed.has(tip.id)) continue;
      if (state.month < tip.triggerMonth) continue;
      if (tip.minComplexity && complexity < tip.minComplexity) continue;
      if (tip.maxComplexity && complexity > tip.maxComplexity) continue;
      if (tip.condition && !tip.condition(state)) continue;
      return tip;
    }
    return null;
  }, [state, phase, dismissed, complexity]);

  if (!activeTip) return null;

  const handleDismiss = () => {
    dismissTip(activeTip.id);
    setDismissed(prev => new Set([...prev, activeTip.id]));
  };

  const tipTitle = t(`tips.${activeTip.i18nKey}.title`);
  const tipText = t(`tips.${activeTip.i18nKey}.text`);

  return (
    <div className={styles.tip}>
      <div className={styles.tipIcon}><Lightbulb size={18} /></div>
      <div className={styles.tipContent}>
        <strong className={styles.tipTitle}>{tipTitle}</strong>
        <p className={styles.tipText}>{tipText}</p>
        {activeTip.viewHint && (
          <span className={styles.tipViewHint}>→ {activeTip.viewHint}</span>
        )}
      </div>
      <button type="button" className={styles.tipDismiss} onClick={handleDismiss}>
        {t('tips.understood')}
      </button>
    </div>
  );
}
