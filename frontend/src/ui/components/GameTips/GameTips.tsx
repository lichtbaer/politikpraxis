import { useState, useEffect } from 'react';
import { useGameStore } from '../../../store/gameStore';
import styles from './GameTips.module.css';

interface Tip {
  id: string;
  /** Monat ab dem der Tipp angezeigt werden kann */
  triggerMonth: number;
  /** Zusätzliche Bedingung (optional) */
  condition?: (state: ReturnType<typeof useGameStore>['state']) => boolean;
  title: string;
  text: string;
}

const TIPS: Tip[] = [
  {
    id: 'erstes_gesetz',
    triggerMonth: 1,
    title: 'Dein erstes Gesetz',
    text: 'Wähle ein Gesetz aus der Agenda und klicke "Einbringen", um es in den Bundestag einzubringen. Jede Einbringung kostet Politisches Kapital (PK).',
  },
  {
    id: 'pk_knapp',
    triggerMonth: 3,
    condition: (s) => s.pk < 30,
    title: 'PK wird knapp',
    text: 'Dein Politisches Kapital regeneriert sich monatlich basierend auf deiner Zustimmung. Höhere Zustimmung = mehr PK pro Monat. Setze Prioritäten!',
  },
  {
    id: 'koalition_warnung',
    triggerMonth: 5,
    condition: (s) => s.coalition < 40,
    title: 'Koalitionsspannungen',
    text: 'Deine Koalitionsstabilität sinkt. Achte auf die Stimmung deiner Kabinettsmitglieder und die Beziehung zum Koalitionspartner. Zugeständnisse und Gespräche helfen.',
  },
  {
    id: 'haushalt_defizit',
    triggerMonth: 6,
    condition: (s) => (s.haushalt?.saldo ?? 0) < -10,
    title: 'Haushaltsdefizit',
    text: 'Dein Haushalt ist im Minus. Teure Gesetze belasten den Spielraum. Achte auf die Kostenampel bei Gesetzen: Grün = tragbar, Gelb = spürbar, Rot = riskant.',
  },
  {
    id: 'bundesrat_info',
    triggerMonth: 8,
    condition: (s) => s.gesetze.some(g => g.status === 'bt_passed'),
    title: 'Bundesrat-Abstimmung',
    text: 'Ein Gesetz hat den Bundestag passiert und geht in den Bundesrat. Nutze Lobbying bei den Fraktionen, um die nötigen Stimmen zu sichern.',
  },
  {
    id: 'wahlkampf_start',
    triggerMonth: 43,
    title: 'Wahlkampf beginnt!',
    text: 'Die letzten 6 Monate der Legislatur! Nutze Reden, Koalitions-Aktionen und die Medienoffensive, um deine Wahlprognose zu verbessern. Das TV-Duell kommt auch bald.',
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
  const state = useGameStore((s) => s.state);
  const phase = useGameStore((s) => s.phase);
  const [dismissed, setDismissed] = useState<Set<string>>(getDismissedTips);
  const [activeTip, setActiveTip] = useState<Tip | null>(null);

  useEffect(() => {
    if (phase !== 'playing' || state.gameOver) {
      setActiveTip(null);
      return;
    }

    for (const tip of TIPS) {
      if (dismissed.has(tip.id)) continue;
      if (state.month < tip.triggerMonth) continue;
      if (tip.condition && !tip.condition(state)) continue;
      setActiveTip(tip);
      return;
    }
    setActiveTip(null);
  }, [state.month, state.pk, state.coalition, state.haushalt?.saldo, state.gesetze, phase, state.gameOver, dismissed]);

  if (!activeTip) return null;

  const handleDismiss = () => {
    dismissTip(activeTip.id);
    setDismissed(prev => new Set([...prev, activeTip.id]));
    setActiveTip(null);
  };

  return (
    <div className={styles.tip}>
      <div className={styles.tipIcon}>💡</div>
      <div className={styles.tipContent}>
        <strong className={styles.tipTitle}>{activeTip.title}</strong>
        <p className={styles.tipText}>{activeTip.text}</p>
      </div>
      <button type="button" className={styles.tipDismiss} onClick={handleDismiss}>
        Verstanden
      </button>
    </div>
  );
}
