import type { GameEvent } from '../../core/types';

/** Wahlkampf-Beginn (Monat 43) — Info-Event */
export const WAHLKAMPF_BEGINN_EVENT: GameEvent = {
  id: 'wahlkampf_beginn',
  type: 'info',
  icon: '🗳️',
  typeLabel: 'Wahlkampf',
  title: 'Wahlkampf beginnt',
  quote: '„Noch 6 Monate bis zur Wahl. Jetzt zählt jede Stimme.“',
  context: 'Der Wahlkampf beginnt. Sie können nun Wahlkampf-Aktionen durchführen und Ihre Bilanz kommunizieren.',
  ticker: 'Wahlkampf beginnt — noch 6 Monate bis zur Wahl.',
  choices: [
    {
      label: 'Weiter',
      desc: '',
      cost: 0,
      type: 'safe',
      effect: {},
      log: 'Wahlkampfphase eingeleitet.',
    },
  ],
};

/** TV-Duell (Monat 45/46) — Spieler kann 15 PK für Vorbereitung ausgeben */
export const TV_DUELL_EVENT: GameEvent = {
  id: 'tv_duell',
  type: 'warn',
  icon: '📺',
  typeLabel: 'TV-Duell',
  title: 'TV-Duell steht an',
  quote: '„Die Nation schaut zu. Eine gute Vorbereitung kann den Ausschlag geben.“',
  context: 'Das TV-Duell mit der Opposition steht an. Sie können 15 PK in Vorbereitung investieren, um Ihre Chancen zu erhöhen.',
  ticker: 'TV-Duell mit der Opposition',
  choices: [
    {
      label: 'Vorbereiten (15 PK)',
      desc: 'Erhöht die Gewinnchance deutlich',
      cost: 15,
      type: 'primary',
      effect: {},
      log: 'TV-Duell: Gut vorbereitet angetreten.',
      key: 'vorbereiten',
    },
    {
      label: 'Ohne Vorbereitung antreten',
      desc: 'Risiko eingehen',
      cost: 0,
      type: 'danger',
      effect: {},
      log: 'TV-Duell: Ohne Vorbereitung angetreten.',
      key: 'ohne',
    },
  ],
};

/** Koalitionspartner-Alleingang (Stufe 4, Beziehung < 50) */
export const KOALITIONSPARTNER_ALLEINGANG_EVENT: GameEvent = {
  id: 'koalitionspartner_alleingang',
  type: 'warn',
  icon: '⚠️',
  typeLabel: 'Koalition',
  title: 'Koalitionspartner macht Alleingang',
  quote: '„Wir müssen unsere Position klar machen — auch ohne Absprache.“',
  context: 'Der Koalitionspartner hat eine riskante öffentliche Aussage gemacht. Das Medienklima und die Beziehung haben gelitten.',
  ticker: 'Koalitionspartner macht riskante öffentliche Aussage',
  choices: [
    {
      label: 'Zur Kenntnis nehmen',
      desc: '',
      cost: 0,
      type: 'safe',
      effect: {},
      log: 'Koalitionspartner-Alleingang zur Kenntnis genommen.',
    },
  ],
};
