import { useMemo, useState } from 'react';
import { useGameStore } from '../../../store/gameStore';
import type { GameState } from '../../../core/types';
import { Lightbulb } from '../../icons';
import styles from './GameTips.module.css';

interface Tip {
  id: string;
  /** Monat ab dem der Tipp angezeigt werden kann */
  triggerMonth: number;
  /** Zusätzliche Bedingung (optional) */
  condition?: (state: GameState) => boolean;
  /** Mindest-Komplexitätsstufe (default: 1) */
  minComplexity?: number;
  /** Max-Komplexitätsstufe (optional — Tipp nur bis zu dieser Stufe) */
  maxComplexity?: number;
  title: string;
  text: string;
  /** Optionaler Hinweis auf relevanten Tab/View */
  viewHint?: string;
}

const TIPS: Tip[] = [
  // === Stufe 1: Grundlagen ===
  {
    id: 'erstes_gesetz',
    triggerMonth: 1,
    title: 'Dein erstes Gesetz',
    text: 'Wähle ein Gesetz aus der Agenda und klicke "Einbringen", um es in den Bundestag einzubringen. Jede Einbringung kostet Politisches Kapital (PK).',
    viewHint: 'agenda',
  },
  {
    id: 'geschwindigkeit',
    triggerMonth: 1,
    title: 'Spielgeschwindigkeit',
    text: 'Drücke Leertaste zum Pausieren/Fortsetzen. Mit den Tasten 1 und 3 steuerst du die Geschwindigkeit. Das Spiel pausiert automatisch bei wichtigen Ereignissen.',
  },
  {
    id: 'kabinett_intro',
    triggerMonth: 2,
    title: 'Dein Kabinett',
    text: 'Deine Minister haben eine eigene Stimmung und Loyalität. Zufriedene Minister geben Boni — unzufriedene stellen Ultimaten. Klicke auf einen Minister für Details.',
    viewHint: 'kabinett',
  },
  {
    id: 'pk_knapp',
    triggerMonth: 3,
    condition: (s) => s.pk < 30,
    title: 'PK wird knapp',
    text: 'Dein Politisches Kapital regeneriert sich monatlich basierend auf deiner Zustimmung. Höhere Zustimmung = mehr PK pro Monat. Setze Prioritäten!',
  },
  {
    id: 'gesetz_wirkung',
    triggerMonth: 4,
    condition: (s) => s.gesetze.some(g => g.status === 'eingebracht' || g.status === 'aktiv'),
    title: 'Gesetze brauchen Zeit',
    text: 'Beschlossene Gesetze wirken nicht sofort — die Effekte treten erst nach einigen Monaten ein. Plane voraus und bring Gesetze frühzeitig ein!',
  },
  // === Stufe 2: Koalition & Haushalt ===
  {
    id: 'koalition_warnung',
    triggerMonth: 5,
    minComplexity: 2,
    condition: (s) => s.coalition < 40,
    title: 'Koalitionsspannungen',
    text: 'Deine Koalitionsstabilität sinkt. Achte auf die Stimmung deiner Kabinettsmitglieder und die Beziehung zum Koalitionspartner. Zugeständnisse und Gespräche helfen.',
  },
  {
    id: 'haushalt_erklaerung',
    triggerMonth: 4,
    minComplexity: 2,
    title: 'Der Haushalt',
    text: 'Jedes Gesetz hat laufende Kosten. Achte auf den Haushaltssaldo — bei zu hohem Defizit greift die Schuldenbremse und schränkt deinen Spielraum ein.',
    viewHint: 'haushalt',
  },
  {
    id: 'haushalt_defizit',
    triggerMonth: 6,
    minComplexity: 2,
    condition: (s) => (s.haushalt?.saldo ?? 0) < -10,
    title: 'Haushaltsdefizit',
    text: 'Dein Haushalt ist im Minus. Teure Gesetze belasten den Spielraum. Achte auf die Kostenampel bei Gesetzen: Grün = tragbar, Gelb = spürbar, Rot = riskant.',
    viewHint: 'haushalt',
  },
  {
    id: 'medienklima_intro',
    triggerMonth: 3,
    minComplexity: 2,
    title: 'Das Medienklima',
    text: 'Das Medienklima beeinflusst die öffentliche Wahrnehmung. Skandale senken es, gute Nachrichten heben es. Ab Stufe 3 kannst du Pressemitteilungen nutzen.',
    viewHint: 'medien',
  },
  {
    id: 'bundesrat_info',
    triggerMonth: 8,
    minComplexity: 2,
    condition: (s) => s.gesetze.some(g => g.status === 'bt_passed'),
    title: 'Bundesrat-Abstimmung',
    text: 'Ein Gesetz hat den Bundestag passiert und geht in den Bundesrat. Nutze Lobbying bei den Fraktionen, um die nötigen Stimmen zu sichern.',
    viewHint: 'bundesrat',
  },
  {
    id: 'eu_route_info',
    triggerMonth: 10,
    minComplexity: 2,
    condition: (s) => s.gesetze.some(g => g.status === 'blockiert'),
    title: 'Alternative Routen',
    text: 'Ein Gesetz wurde blockiert? Du kannst es über die EU, Länderpiloten oder Kommunen auf einem anderen Weg durchsetzen. Jede Route hat eigene Vor- und Nachteile.',
  },
  // === Stufe 3: Verbände & Fortgeschritten ===
  {
    id: 'verbaende_intro',
    triggerMonth: 5,
    minComplexity: 3,
    title: 'Verbände & Interessengruppen',
    text: 'Verbände wie BDI, Gewerkschaften oder Umweltverbände haben eigene Interessen. Gute Beziehungen zu Verbänden können bei Abstimmungen helfen — aber Zugeständnisse kosten.',
    viewHint: 'verbaende',
  },
  {
    id: 'minister_agenda',
    triggerMonth: 8,
    minComplexity: 3,
    condition: (s) => s.chars.some(c => (c.agenda_stufe_aktuell ?? 0) > 0),
    title: 'Minister-Initiativen',
    text: 'Deine Minister verfolgen eigene Agenden und bringen Forderungen ein. Erfülle sie für bessere Stimmung — oder lehne ab mit dem Risiko eines Ultimatums.',
  },
  // === Zeitbasierte Tipps ===
  {
    id: 'halbzeit',
    triggerMonth: 24,
    title: 'Halbzeit der Legislatur',
    text: 'Die Hälfte deiner Amtszeit ist vorbei. Prüfe deine Zustimmungswerte und den Haushalt. Noch 24 Monate bis zur Wahl — jetzt ist die beste Zeit für große Reformen.',
  },
  {
    id: 'wahlkampf_start',
    triggerMonth: 43,
    title: 'Wahlkampf beginnt!',
    text: 'Die letzten 6 Monate der Legislatur! Nutze Reden, Koalitions-Aktionen und die Medienoffensive, um deine Wahlprognose zu verbessern. Das TV-Duell kommt auch bald.',
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

  return (
    <div className={styles.tip}>
      <div className={styles.tipIcon}><Lightbulb size={18} /></div>
      <div className={styles.tipContent}>
        <strong className={styles.tipTitle}>{activeTip.title}</strong>
        <p className={styles.tipText}>{activeTip.text}</p>
        {activeTip.viewHint && (
          <span className={styles.tipViewHint}>→ {activeTip.viewHint}</span>
        )}
      </div>
      <button type="button" className={styles.tipDismiss} onClick={handleDismiss}>
        Verstanden
      </button>
    </div>
  );
}
