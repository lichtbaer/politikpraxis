import type { GameEvent } from '../../core/types';

/** Wahlkampf-Beginn (Monat 43) — Info-Event */
export const WAHLKAMPF_BEGINN_EVENT: GameEvent = {
  id: 'wahlkampf_beginn',
  type: 'info',
  icon: 'wahlkampf',
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
  icon: 'tvDuell',
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

/**
 * Wahlkampf-Themenwahl (Monat 44) — Welches Thema setzt die Regierung im Wahlkampf?
 * Beeinflusst Milieu-Zustimmung für die Schlussphase.
 */
export const WAHLKAMPF_THEMA_WAHL_EVENT: GameEvent = {
  id: 'wahlkampf_thema_wahl',
  type: 'info',
  icon: 'wahlkampf',
  typeLabel: 'Wahlkampf-Strategie',
  title: 'Wahlkampfthema festlegen',
  quote: '„Womit wollen wir die Wählerinnen und Wähler überzeugen?"',
  context:
    'Ihr Wahlkampfteam rät, ein klares Hauptthema zu setzen. Die Wahl beeinflusst, welche Milieus in den letzten Wochen mobilisiert werden.',
  ticker: 'Wahlkampfteam fordert klare Themenführung',
  choices: [
    {
      label: 'Wirtschaft & Arbeit',
      desc: 'Mobilisiert Arbeitsmilieu und soziale Mitte',
      cost: 5,
      type: 'primary',
      effect: {},
      log: 'Wahlkampfthema: Wirtschaft & Arbeit. Arbeitsmilieu und Mitte mobilisiert.',
      key: 'wirtschaft',
    },
    {
      label: 'Klimaschutz & Zukunft',
      desc: 'Mobilisiert Progressive und Postmaterielle',
      cost: 5,
      type: 'safe',
      effect: {},
      log: 'Wahlkampfthema: Klimaschutz. Progressive und Postmaterielle mobilisiert.',
      key: 'klima',
    },
    {
      label: 'Innere Sicherheit & Stabilität',
      desc: 'Mobilisiert bürgerliche Mitte und Traditionelle',
      cost: 5,
      type: 'safe',
      effect: {},
      log: 'Wahlkampfthema: Innere Sicherheit. Bürgerliche Mitte und Traditionelle mobilisiert.',
      key: 'sicherheit',
    },
  ],
};

/**
 * Last-Minute-Versprechen (Monat 47) — Letzter großer Wahlkampf-Move.
 * Kurzfristiger Boost, aber mittelfristige Kosten wenn Regierung wiedergewählt.
 */
export const WAHLKAMPF_VERSPRECHEN_EVENT: GameEvent = {
  id: 'wahlkampf_versprechen',
  type: 'warn',
  icon: 'wahlkampf',
  typeLabel: 'Wahlkampf-Finale',
  title: 'Last-Minute-Versprechen',
  quote: '„Eine letzte Chance, die Wählerinnen zu überzeugen — oder die Glaubwürdigkeit aufs Spiel zu setzen."',
  context:
    'Ihr Beraterteam empfiehlt ein großes Wahlversprechen in der Schlussphase. Ein Versprechen ist verlockend — aber Überversprechen kostet danach.',
  ticker: 'Schlussphase des Wahlkampfs: Wahlversprechen im Raum',
  choices: [
    {
      label: 'Sofortprogramm versprechen',
      desc: '+4% Zustimmung jetzt — aber -10 PK nach Wahl bei Regierungsbildung',
      cost: 0,
      type: 'primary',
      effect: { zf: 4 },
      log: 'Sofortprogramm versprochen. Zustimmungsschub, aber Regierung danach unter Druck.',
      key: 'versprechen',
    },
    {
      label: 'Auf Bilanz setzen',
      desc: 'Glaubwürdig, kein Risiko — +2% Zustimmung',
      cost: 0,
      type: 'safe',
      effect: { zf: 2 },
      log: 'Auf Regierungsbilanz gesetzt. Solide aber unspektakuläre Schlussphase.',
      key: 'bilanz',
    },
    {
      label: 'Nichts versprechen',
      desc: 'Seriös, aber riskant im engen Rennen',
      cost: 0,
      type: 'danger',
      effect: {},
      log: 'Keine Extraversprechungen. Wahlergebnis hängt an der Grundzustimmung.',
      key: 'nichts',
    },
  ],
};

/** Koalitionspartner-Alleingang (Stufe 4, Beziehung < 50) */
export const KOALITIONSPARTNER_ALLEINGANG_EVENT: GameEvent = {
  id: 'koalitionspartner_alleingang',
  type: 'warn',
  icon: 'warn',
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
