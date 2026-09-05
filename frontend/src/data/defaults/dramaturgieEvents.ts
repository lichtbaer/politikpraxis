import type { GameEvent } from '../../core/types';

/**
 * #274: 100-Tage-Bilanz (Monat 3) — erster fester Dramaturgie-Anker der Legislatur.
 * Reines Info-Event; die Presse-Bewertung (Medienklima-/Zustimmungs-Impuls) wird
 * bereits in `checkHundertTageBilanz` berechnet und angewendet, bevor das Event
 * geöffnet wird — dieses Event dient nur der narrativen Einordnung/Bestätigung.
 */
export const HUNDERT_TAGE_BILANZ_EVENT: GameEvent = {
  id: 'hundert_tage_bilanz',
  type: 'info',
  icon: 'pressemitteilung',
  typeLabel: '100-Tage-Bilanz',
  title: '100 Tage im Amt',
  quote: '„Die ersten hundert Tage gelten als Gradmesser für jede neue Regierung.“',
  context:
    'Die Presse zieht nach 100 Tagen eine erste Bilanz Ihrer Amtszeit. Bewertet werden vor allem die bisherige Aktivität — eingebrachte Gesetze und investiertes politisches Kapital.',
  ticker: '100-Tage-Bilanz: Die Presse bewertet den Regierungsstart.',
  dramaturgieAnker: true,
  choices: [
    {
      label: 'Zur Kenntnis nehmen',
      desc: '',
      cost: 0,
      type: 'safe',
      effect: {},
      log: '100-Tage-Bilanz zur Kenntnis genommen.',
    },
  ],
};
