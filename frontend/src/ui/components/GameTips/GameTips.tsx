import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../../store/gameStore';
import type { GameState } from '../../../core/types';
import { Lightbulb } from '../../icons';
import styles from './GameTips.module.css';

interface Tip {
  id: string;
  /** i18n key suffix for title/text under "tips.*" */
  i18nKey?: string;
  /** Monat ab dem der Tipp angezeigt werden kann */
  triggerMonth: number;
  /** Zusätzliche Bedingung (optional) */
  condition?: (state: GameState) => boolean;
  /** Mindest-Komplexitätsstufe (default: 1) */
  minComplexity?: number;
  /** Max-Komplexitätsstufe (optional — Tipp nur bis zu dieser Stufe) */
  maxComplexity?: number;
  /** Fallback title (used if i18nKey is not set) */
  title?: string;
  /** Fallback text (used if i18nKey is not set) */
  text?: string;
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
    title: 'Spielgeschwindigkeit',
    text: 'Drücke Leertaste zum Pausieren/Fortsetzen. Mit den Tasten 1 und 3 steuerst du die Geschwindigkeit. Das Spiel pausiert automatisch bei wichtigen Ereignissen.',
  },
  {
    id: 'kabinett_intro',
    i18nKey: 'kabinettIntro',
    triggerMonth: 2,
    title: 'Dein Kabinett',
    text: 'Deine Minister haben eine eigene Stimmung und Loyalität. Zufriedene Minister geben Boni — unzufriedene stellen Ultimaten. Klicke auf einen Minister für Details.',
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
    title: 'Gesetze brauchen Zeit',
    text: 'Beschlossene Gesetze wirken nicht sofort — die Effekte treten erst nach einigen Monaten ein. Plane voraus und bring Gesetze frühzeitig ein!',
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
    title: 'Der Haushalt',
    text: 'Jedes Gesetz hat laufende Kosten. Achte auf den Haushaltssaldo — bei zu hohem Defizit greift die Schuldenbremse und schränkt deinen Spielraum ein.',
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
    title: 'Das Medienklima',
    text: 'Das Medienklima beeinflusst die öffentliche Wahrnehmung. Skandale senken es, gute Nachrichten heben es. Ab Stufe 3 kannst du Pressemitteilungen nutzen.',
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
    title: 'Alternative Routen',
    text: 'Ein Gesetz wurde blockiert? Du kannst es über die EU, Länderpiloten oder Kommunen auf einem anderen Weg durchsetzen. Jede Route hat eigene Vor- und Nachteile.',
  },
  // === Stufe 3: Verbände & Fortgeschritten ===
  {
    id: 'verbaende_intro',
    i18nKey: 'verbaendeIntro',
    triggerMonth: 5,
    minComplexity: 3,
    title: 'Verbände & Interessengruppen',
    text: 'Verbände wie BDI, Gewerkschaften oder Umweltverbände haben eigene Interessen. Gute Beziehungen zu Verbänden können bei Abstimmungen helfen — aber Zugeständnisse kosten.',
    viewHint: 'verbaende',
  },
  {
    id: 'minister_agenda',
    i18nKey: 'ministerAgenda',
    triggerMonth: 8,
    minComplexity: 3,
    condition: (s) => s.chars.some(c => (c.agenda_stufe_aktuell ?? 0) > 0),
    title: 'Minister-Initiativen',
    text: 'Deine Minister verfolgen eigene Agenden und bringen Forderungen ein. Erfülle sie für bessere Stimmung — oder lehne ab mit dem Risiko eines Ultimatums.',
  },
  // === Zeitbasierte Tipps ===
  {
    id: 'halbzeit',
    i18nKey: 'halbzeit',
    triggerMonth: 24,
    title: 'Halbzeit der Legislatur',
    text: 'Die Hälfte deiner Amtszeit ist vorbei. Prüfe deine Zustimmungswerte und den Haushalt. Noch 24 Monate bis zur Wahl — jetzt ist die beste Zeit für große Reformen.',
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

  // Use i18n key if available, otherwise fall back to hardcoded text
  const tipTitle = activeTip.i18nKey
    ? t(`tips.${activeTip.i18nKey}.title`, { defaultValue: activeTip.title ?? '' })
    : (activeTip.title ?? '');
  const tipText = activeTip.i18nKey
    ? t(`tips.${activeTip.i18nKey}.text`, { defaultValue: activeTip.text ?? '' })
    : (activeTip.text ?? '');

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
