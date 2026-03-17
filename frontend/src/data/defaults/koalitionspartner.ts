import type { KoalitionspartnerContent, GameEvent } from '../../core/types';

/** Koalitionsbruch-Event (Beziehung < 15) */
export const KOALITIONSBRUCH_EVENT: GameEvent = {
  id: 'koalitionsbruch',
  type: 'danger',
  icon: '🔴',
  typeLabel: 'Koalitionskrise',
  title: 'Koalitionspartner droht mit Austritt',
  quote: '„Ohne spürbare Zugeständnisse können wir diese Koalition nicht fortsetzen.“',
  context: 'Die Beziehung zum Koalitionspartner ist auf einem kritischen Tiefstand. Sie haben 3 Monate Zeit zu reagieren.',
  ticker: 'Koalitionskrise: Partner droht mit Austritt',
  choices: [
    {
      label: 'Koalitionsrunde einberufen',
      desc: '15 PK — Beziehung +8',
      cost: 15,
      type: 'primary',
      effect: {},
      koalitionspartnerBeziehung: 8,
      log: 'Koalitionsrunde einberufen. Beziehung verbessert.',
    },
    {
      label: 'Zeit gewinnen',
      desc: 'Weiter verhandeln',
      cost: 0,
      type: 'safe',
      effect: {},
      log: 'Verhandlungen werden fortgesetzt.',
    },
  ],
};

/** Koalitionskrise-Ultimatum (KV-Score >= 70) */
export const KOALITIONSKRISE_ULTIMATUM_EVENT: GameEvent = {
  id: 'koalitionskrise_ultimatum',
  type: 'warn',
  icon: '⚠️',
  typeLabel: 'Koalitionsvertrag',
  title: 'Partner fordert Einhaltung des Koalitionsvertrags',
  quote: '„Wir haben einen Vertrag unterzeichnet. Die aktuelle Politik weicht zu stark ab.“',
  context: 'Der Koalitionsvertrag-Score ist kritisch. Der Partner verlangt mehr Kongruenz mit dem vereinbarten Kurs.',
  ticker: 'Koalitionspartner fordert Vertragstreue',
  choices: [
    {
      label: 'Kurs anpassen',
      desc: 'Mehr Rücksicht auf Partner-Themen',
      cost: 0,
      type: 'primary',
      effect: {},
      koalitionspartnerBeziehung: 5,
      log: 'Kurs angepasst. Partner besänftigt.',
    },
    {
      label: 'Standhaft bleiben',
      desc: 'Risiko einer weiteren Eskalation',
      cost: 0,
      type: 'danger',
      effect: {},
      log: 'Keine Zugeständnisse. Spannung bleibt.',
    },
  ],
};

/** Grüne als Standard-Koalitionspartner */
export const GRUENE: KoalitionspartnerContent = {
  id: 'gruene',
  name: 'Grüne',
  sprecher: 'Lena Fischer',
  ideologie: { wirtschaft: -40, gesellschaft: -75, staat: -35 },
  beziehung_start: 65,
  bt_stimmen: 18,
  kernmilieus: ['postmaterielle', 'soziale_mitte'],
  kernverbaende: ['uvb', 'bvd'],
  schluesselthemen: ['ee', 'bp'],
  forderungen: [
    {
      id: 'ee_prioritaet',
      label: 'EE-Beschleunigung priorisieren',
      effekte: { hh: -0.2, zf: 2 },
    },
    {
      id: 'bp_wohnung',
      label: 'Bundeswohnungsbauoffensive stärken',
      effekte: { hh: -0.3, zf: 3 },
    },
  ],
};

/** Milieu-Namen für Log-Ausgaben */
export const MILIEU_NAMES: Record<string, string> = {
  postmaterielle: 'Postmaterielle',
  soziale_mitte: 'Soziale Mitte',
  arbeit: 'Arbeitsmilieu',
  mitte: 'Mitte',
  prog: 'Progressives Milieu',
};

/** Verband-Kurzbezeichnungen für Log-Ausgaben */
export const VERBAND_KURZ: Record<string, string> = {
  uvb: 'UvB',
  bvd: 'BvD',
};
