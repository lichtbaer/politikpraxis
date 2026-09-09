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

/**
 * #274: Sommerloch — jährlich wiederkehrendes Boulevard-/Skandal-Fenster (Monat 7/19/31).
 * Reines Info-Event; der (kleine) Medienklima-Dämpfer wird bereits in `checkSommerloch`
 * berechnet und angewendet, bevor das Event geöffnet wird.
 */
export const SOMMERLOCH_EVENTS: GameEvent[] = [
  {
    id: 'sommerloch_1',
    type: 'info',
    icon: 'pressemitteilung',
    typeLabel: 'Sommerloch',
    title: 'Sommerloch: Gurkentruppe und Rathaus-Ente',
    quote: '„Nachrichtenarme Zeit — die Redaktionen greifen zu, was sie kriegen können.“',
    context:
      'Ohne echte Aufreger füllt die Presse die Sommerpause mit Nebensächlichkeiten. Substanzielle Berichterstattung bleibt diesen Monat aus.',
    ticker: 'Sommerloch: Boulevardthemen statt Politik.',
    dramaturgieAnker: true,
    choices: [
      { label: 'Zur Kenntnis nehmen', desc: '', cost: 0, type: 'safe', effect: {}, log: 'Sommerloch zur Kenntnis genommen.' },
    ],
  },
  {
    id: 'sommerloch_2',
    type: 'info',
    icon: 'pressemitteilung',
    typeLabel: 'Sommerloch',
    title: 'Sommerloch: Ministerbadehose sorgt für Aufregung',
    quote: '„Auch ein Regierungsmitglied im Urlaub ist der Presse eine Meldung wert.“',
    context:
      'Ein belangloses Urlaubsfoto eines Kabinettsmitglieds dominiert für ein paar Tage die Schlagzeilen — mehr passiert diesen Monat nicht.',
    ticker: 'Sommerloch: Urlaubsfoto sorgt für Kurzzeit-Aufregung.',
    dramaturgieAnker: true,
    choices: [
      { label: 'Zur Kenntnis nehmen', desc: '', cost: 0, type: 'safe', effect: {}, log: 'Sommerloch zur Kenntnis genommen.' },
    ],
  },
  {
    id: 'sommerloch_3',
    type: 'info',
    icon: 'pressemitteilung',
    typeLabel: 'Sommerloch',
    title: 'Sommerloch: Spekulationen über Kabinettsumbildung',
    quote: '„Mangels echter Neuigkeiten macht sich die Gerüchteküche selbstständig.“',
    context:
      'Unbestätigte Gerüchte über eine mögliche Kabinettsumbildung machen die Runde — belastbare Substanz gibt es keine.',
    ticker: 'Sommerloch: Gerüchte über Kabinettsumbildung.',
    dramaturgieAnker: true,
    choices: [
      { label: 'Zur Kenntnis nehmen', desc: '', cost: 0, type: 'safe', effect: {}, log: 'Sommerloch zur Kenntnis genommen.' },
    ],
  },
];

/**
 * #274: Halbzeitbilanz (Monat 24) — Midterm-Stimmungstest, analog zur
 * Wahlkampf-Zwischenbilanz. Die Presse-/Koalitions-Konsequenz wird bereits in
 * `checkHalbzeitbilanz` anhand der berechneten Legislatur-Bilanz angewendet;
 * dieses Event dient der narrativen Einordnung/Bestätigung.
 */
export const HALBZEITBILANZ_EVENT: GameEvent = {
  id: 'halbzeitbilanz',
  type: 'info',
  icon: 'pressemitteilung',
  typeLabel: 'Halbzeitbilanz',
  title: 'Halbzeit der Legislatur',
  quote: '„Nach zwei Jahren zieht das Land eine erste große Bilanz.“',
  context:
    'Zur Halbzeit der Legislaturperiode ziehen Presse und Öffentlichkeit eine Zwischenbilanz. Bewertet werden Reformstärke, Stabilität der Regierung und der Zustand der Koalition.',
  ticker: 'Halbzeitbilanz: Die Legislatur ist zur Hälfte vorbei.',
  dramaturgieAnker: true,
  choices: [
    {
      label: 'Zur Kenntnis nehmen',
      desc: '',
      cost: 0,
      type: 'safe',
      effect: {},
      log: 'Halbzeitbilanz zur Kenntnis genommen.',
    },
  ],
};
