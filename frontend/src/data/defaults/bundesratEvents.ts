import type { GameEvent } from '../../core/types';

/** Bundesrat-spezifische Events — eigener Pool, getrennt von RANDOM_EVENTS */
export const BUNDESRAT_EVENTS: GameEvent[] = [
  {
    id: 'laenderfinanzausgleich',
    type: 'warn',
    icon: 'warn',
    typeLabel: 'Länderfinanzausgleich',
    title: 'Länderfinanzausgleich-Streit eskaliert',
    quote: '„Pragmatische Mitte und Ostblock fordern Neuverteilung der Finanzströme — sonst Blockade."',
    context:
      'Fraktion Brenner und Kohl haben sich verbündet. Sie fordern eine Überarbeitung des Länderfinanzausgleichs. Ohne Zugeständnisse droht Blockade in allen zustimmungspflichtigen Gesetzen.',
    choices: [
      {
        label: 'Zugeständnisse machen',
        desc: 'Haushalt -0.2, Beziehung Brenner +8',
        cost: 0,
        type: 'primary',
        effect: { hh: -0.2 },
        brRelation: { pragmatische_mitte: 8 },
        log: 'Zugeständnisse beim Länderfinanzausgleich. Brenner zufrieden, Haushalt belastet.',
      },
      {
        label: 'Ablehnen',
        desc: 'Beziehung Brenner -10, Kohl -8',
        cost: 0,
        type: 'danger',
        effect: {},
        brRelation: { pragmatische_mitte: -10, ostblock: -8 },
        log: 'Forderungen abgelehnt. Brenner und Kohl verärgert.',
      },
      {
        label: 'Gutachten beauftragen',
        desc: 'Zeitgewinn, kostet 15 PK',
        cost: 15,
        type: 'safe',
        effect: {},
        log: 'Wissenschaftliches Gutachten beauftragt. Thema vorerst vertagt.',
      },
    ],
    ticker: 'Länderfinanzausgleich: Brenner und Kohl fordern Neuverteilung',
  },
  {
    id: 'landtagswahl',
    type: 'warn',
    icon: 'wahlkampf',
    typeLabel: 'Landtagswahl',
    title: 'Landtagswahl kippt Fraktion',
    quote: '„Überraschender Regierungswechsel — die politische Landkarte verschiebt sich."',
    context:
      'Eine Landtagswahl hat die Regierungspartei in einem Bundesland gewechselt. Die Fraktionszusammensetzung im Bundesrat ändert sich. Die betroffene Fraktion muss neu verhandeln.',
    choices: [
      {
        label: 'Neue Mehrheiten akzeptieren',
        desc: 'Politische Realität anerkennen',
        cost: 0,
        type: 'primary',
        effect: {},
        log: 'Regierungswechsel akzeptiert. Fraktionszusammensetzung aktualisiert.',
      },
    ],
    ticker: 'Landtagswahl: Regierungswechsel verändert Bundesrat-Mehrheiten',
  },
  {
    id: 'kohl_eskaliert',
    type: 'danger',
    icon: 'bundesrat',
    typeLabel: 'Sondersitzung',
    title: 'Kohl eskaliert — Sondersitzung einberufen',
    quote: '„Ohne Zugeständnisse an den Osten werde ich jeden Vermittlungsausschuss beantragen."',
    context:
      'Matthias Kohl hat einen Vermittlungsausschuss-Antrag für ein laufendes Gesetz gestellt. Das Gesetz wird um 2 Monate verzögert. Wie reagieren Sie?',
    choices: [
      {
        label: 'Kooperieren',
        desc: 'Beziehung Kohl verbessern, 15 PK',
        cost: 15,
        type: 'primary',
        effect: {},
        brRelation: { ostblock: 8 },
        log: 'Kooperation mit Kohl. Beziehung verbessert, Verzögerung bleibt.',
      },
      {
        label: 'Juristisch blockieren',
        desc: 'Rechtliche Schritte, kostet 20 PK',
        cost: 20,
        type: 'safe',
        effect: {},
        log: 'Juristische Prüfung eingeleitet. Verzögerung bleibt, Kohl verärgert.',
      },
      {
        label: 'Öffentlich kritisieren',
        desc: 'Beziehung Kohl sinkt weiter',
        cost: 0,
        type: 'danger',
        effect: { zf: -2 },
        brRelation: { ostblock: -10 },
        log: 'Kohl öffentlich kritisiert. Ostblock verhärtet Position.',
      },
    ],
    ticker: 'Kohl beantragt Vermittlungsausschuss — Gesetz verzögert',
  },
  {
    id: 'sprecher_wechsel',
    type: 'info',
    icon: 'char_ultimatum',
    typeLabel: 'Sprecher-Wechsel',
    title: 'Neuer Fraktionssprecher im Bundesrat',
    quote: '„Die Fraktion hat einen neuen Sprecher gewählt — mit anderen Prioritäten."',
    context:
      'Ein Fraktionssprecher wurde abgelöst. Der neue Charakter hat andere Interessen und einen neuen Tradeoff-Pool. Die Beziehung muss neu aufgebaut werden.',
    choices: [
      {
        label: 'Neuen Sprecher einbinden',
        desc: 'Beziehungspflege beginnen',
        cost: 0,
        type: 'primary',
        effect: {},
        log: 'Neuer Sprecher anerkannt. Beziehungsaufbau erforderlich.',
      },
    ],
    ticker: 'Sprecher-Wechsel: Fraktion mit neuem Gesicht',
  },
  {
    id: 'bundesrat_initiative',
    type: 'warn',
    icon: 'bundesrat',
    typeLabel: 'Bundesrat-Initiative',
    title: 'Länder bringen eigenes Gesetz ein',
    quote: '„Die Länder wollen nicht nur reagieren — sie wollen gestalten."',
    context:
      'Eine Fraktion hat ein eigenes Gesetz eingebracht. Sie müssen entscheiden: Zustimmung stärkt die Beziehung, Blockade kostet Sympathie und Popularität.',
    choices: [
      {
        label: 'Zustimmen',
        desc: 'Beziehung zur initiierenden Fraktion +12',
        cost: 0,
        type: 'primary',
        effect: {},
        brRelationInitiator: 12,
        log: 'Bundesrat-Initiative zugestimmt. Beziehung zur Fraktion verbessert.',
      },
      {
        label: 'Blockieren',
        desc: 'Beziehung -15, Popularität -3',
        cost: 0,
        type: 'danger',
        effect: { zf: -3 },
        brRelationInitiator: -15,
        log: 'Bundesrat-Initiative blockiert. Fraktion verärgert, Popularität sinkt.',
      },
    ],
    ticker: 'Bundesrat-Initiative: Länder fordern Mitsprache',
  },
  {
    id: 'foederalismusgipfel',
    type: 'good',
    icon: 'good',
    typeLabel: 'Föderalismusgipfel',
    title: 'Föderalismusgipfel — alle Sprecher an einem Tisch',
    quote: '„Historische Gelegenheit: Alle vier Fraktionssprecher gleichzeitig empfangen."',
    context:
      'Beim Föderalismusgipfel können Sie alle vier Fraktionen gleichzeitig pflegen — zu reduzierten Kosten von 8 PK pro Fraktion statt 15.',
    choices: [
      {
        label: 'Alle vier Fraktionen pflegen',
        desc: '32 PK (8 pro Fraktion), Beziehung +3 bei allen',
        cost: 32,
        type: 'primary',
        effect: {},
        brRelation: { koalitionstreue: 3, pragmatische_mitte: 3, konservativer_block: 3, ostblock: 3 },
        log: 'Föderalismusgipfel: Beziehung zu allen Fraktionen verbessert.',
      },
      {
        label: 'Nur Mitte und Ostblock einladen',
        desc: '16 PK, Beziehung +3 bei Brenner und Kohl',
        cost: 16,
        type: 'safe',
        effect: {},
        brRelation: { pragmatische_mitte: 3, ostblock: 3 },
        log: 'Föderalismusgipfel mit Brenner und Kohl. Beziehung verbessert.',
      },
      {
        label: 'Gipfel absagen',
        desc: 'Keine Kosten, verpasste Chance',
        cost: 0,
        type: 'danger',
        effect: {},
        log: 'Föderalismusgipfel abgesagt. Chance verpasst.',
      },
    ],
    ticker: 'Föderalismusgipfel: Alle Fraktionssprecher in Berlin',
  },
];

/** Ersatz-Sprecher für Sprecher-Wechsel-Event (pro Fraktion) */
export const SPRECHER_ERSATZ: Record<
  string,
  { name: string; partei: string; land: string; initials: string; color: string; bio: string; quote?: string }
> = {
  koalitionstreue: {
    name: 'Stefan Möller',
    partei: 'SPD',
    land: 'Hamburg',
    initials: 'SM',
    color: '#e03030',
    bio: 'Pragmatischer Hafenpolitiker. Fokus auf Infrastruktur und Handel.',
    quote: 'Der Norden braucht Investitionen — wir verhandeln.',
  },
  pragmatische_mitte: {
    name: 'Claudia Vogt',
    partei: 'SPD',
    land: 'Berlin',
    initials: 'CV',
    color: '#9a8848',
    bio: 'Verhandlungsexpertin. Sucht immer den Kompromiss.',
    quote: 'Ohne uns geht nichts — das wissen alle.',
  },
  konservativer_block: {
    name: 'Franz Bauer',
    partei: 'CSU',
    land: 'Baden-Württemberg',
    initials: 'FB',
    color: '#2a5090',
    bio: 'Föderalismus-Purist. Länderrechte über alles.',
    quote: 'Der Bund soll sich um seine eigenen Angelegenheiten kümmern.',
  },
  ostblock: {
    name: 'Ingrid Weber',
    partei: 'CDU',
    land: 'Brandenburg',
    initials: 'IW',
    color: '#5a5a5a',
    bio: 'Strukturwandel-Expertin. Fordert Gleichwertigkeit der Lebensverhältnisse.',
    quote: 'Der Osten verdient mehr Aufmerksamkeit.',
  },
};

/** Mögliche Landtagswahl-Übergänge: Land wechselt von Fraktion A zu B */
export const LANDTAGSWAHL_TRANSITIONS: Array<{
  landId: string;
  landName: string;
  newParty: string;
  fromFraktion: string;
  toFraktion: string;
}> = [
  { landId: 'TH', landName: 'Thüringen', newParty: 'SPD', fromFraktion: 'ostblock', toFraktion: 'pragmatische_mitte' },
  { landId: 'BB', landName: 'Brandenburg', newParty: 'SPD', fromFraktion: 'ostblock', toFraktion: 'koalitionstreue' },
  { landId: 'MV', landName: 'Mecklenburg-Vorpommern', newParty: 'SPD', fromFraktion: 'ostblock', toFraktion: 'pragmatische_mitte' },
  { landId: 'HE', landName: 'Hessen', newParty: 'CDU', fromFraktion: 'pragmatische_mitte', toFraktion: 'konservativer_block' },
  { landId: 'BE', landName: 'Berlin', newParty: 'SPD', fromFraktion: 'pragmatische_mitte', toFraktion: 'koalitionstreue' },
  { landId: 'SH', landName: 'Schleswig-Holstein', newParty: 'SPD', fromFraktion: 'koalitionstreue', toFraktion: 'pragmatische_mitte' },
];
