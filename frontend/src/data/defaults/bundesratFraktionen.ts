import type { BundesratFraktion } from '../../core/types';

/** Länder-Stimmen im Bundesrat (für Mehrheitsberechnung) */
const LAND_VOTES: Record<string, number> = {
  BY: 6, NW: 6, BW: 6, NI: 6, HE: 5, HH: 3, HB: 3, BE: 4,
  SH: 4, SL: 3, RP: 4, BB: 4, SN: 4, TH: 4, MV: 3, ST: 4,
};

export const BUNDESRAT_FRAKTIONEN: BundesratFraktion[] = [
  {
    id: 'koalitionstreue',
    name: 'Koalitionstreue',
    sprecher: {
      name: 'Petra Schulz',
      partei: 'SPD',
      land: 'Niedersachsen',
      initials: 'PS',
      color: '#e03030',
      bio: 'Pragmatisch und kooperativ. Verlässliche Basis, aber empfindlich wenn Bundespolitik Länderzuständigkeiten übergeht.',
    },
    laender: ['NW', 'NI', 'HH', 'HB', 'SH'],
    basisBereitschaft: 85,
    beziehung: 65,
    tradeoffPool: [
      {
        id: 'koal_hafen',
        label: 'Hafennfrastruktur ins Konjunkturpaket',
        desc: 'Norddeutsche Häfen erhalten zusätzliche Mittel — belastet den Haushalt.',
        effect: { hh: -0.3, zf: 2 },
        charMood: { wm: 1 },
      },
      {
        id: 'koal_bildung_veto',
        label: 'Bildungspaket mit Länder-Veto-Rechten',
        desc: 'Länder erhalten erweiterte Vetorechte bei Bildungsentscheidungen.',
        effect: { zf: -2 },
      },
      {
        id: 'koal_strukturfonds',
        label: 'Strukturfondsmittel erhöhen',
        desc: 'Mehr EU-Strukturfondsmittel für norddeutsche Regionen.',
        effect: { hh: -0.4, gi: -0.3 },
      },
    ],
  },
  {
    id: 'pragmatische_mitte',
    name: 'Pragmatische Mitte',
    sprecher: {
      name: 'Hans Brenner',
      partei: 'SPD',
      land: 'Rheinland-Pfalz',
      initials: 'HB',
      color: '#9a8848',
      bio: 'Der entscheidende Wechselwähler. Offen für Deals, aber verhandelt immer. Ohne Gegenleistung unberechenbar.',
    },
    laender: ['RP', 'SL', 'BE', 'HE'], // 4 Länder (TH, SN anteilig bei Ostblock)
    basisBereitschaft: 55,
    beziehung: 40,
    tradeoffPool: [
      {
        id: 'mitte_digitalsteuer',
        label: 'Keine Digitalsteuer auf Mittelstand',
        desc: 'Mittelständische Unternehmen von Digitalsteuer ausnehmen.',
        effect: { hh: -0.2, gi: 0.5 },
      },
      {
        id: 'mitte_weinbau',
        label: 'Weinbau-Ausnahmeregelung im Energiegesetz',
        desc: 'Weinbau erhält Sonderregelungen bei Energievorgaben.',
        effect: { gi: -0.2 },
        charMood: { um: -1 },
      },
      {
        id: 'mitte_kommune',
        label: 'Kommunale Infrastrukturmittel verdoppeln',
        desc: 'Verdopplung der Bundesmittel für kommunale Infrastruktur.',
        effect: { hh: -0.5, zf: 4 },
      },
    ],
  },
  {
    id: 'konservativer_block',
    name: 'Konservativer Block',
    sprecher: {
      name: 'Edmund Huber',
      partei: 'CSU',
      land: 'Bayern',
      initials: 'EH',
      color: '#2a5090',
      bio: 'Ideologischer Gegner der Koalition. Stimmt grundsätzlich gegen Rot-Grün — Ausnahme: wenn ein Gesetz Länderrechte stärkt.',
    },
    laender: ['BY', 'BW', 'ST'],
    basisBereitschaft: 20,
    beziehung: 15,
    tradeoffPool: [
      {
        id: 'kons_foederal',
        label: 'Verfassungsrechtliche Föderalismusgarantie',
        desc: 'Föderalismus in Verfassung stärker verankern.',
        effect: { zf: -3 },
      },
      {
        id: 'kons_bildung',
        label: 'Keine Bundeskompetenz für Bildung',
        desc: 'Bildung bleibt ausschließlich Ländersache.',
        effect: { zf: -4 },
        charMood: { kanzler: -1 },
      },
      {
        id: 'kons_auto',
        label: 'Automobilindustrie-Ausnahme im EE-Gesetz',
        desc: 'Automobilindustrie erhält Übergangsfristen.',
        effect: { gi: -0.4 },
        charMood: { um: -2 },
      },
    ],
  },
  {
    id: 'ostblock',
    name: 'Ostblock',
    sprecher: {
      name: 'Matthias Kohl',
      partei: 'CDU',
      land: 'Sachsen',
      initials: 'MK',
      color: '#5a5a5a',
      bio: 'Der Unberechenbare. Strukturwandel-Trauma prägt alle Entscheidungen. Investitionen in den Osten öffnen ihn — ignoriert man ihn, wird er aktiver Saboteur.',
    },
    laender: ['BB', 'SN', 'TH', 'MV'], // 4 Ost-Länder (ST bei Konservativem Block)
    basisBereitschaft: 30,
    beziehung: 25,
    tradeoffPool: [
      {
        id: 'ost_invest',
        label: 'Investitionsprogramm Ostdeutschland (€3 Mrd.)',
        desc: 'Sonderprogramm für ostdeutsche Strukturförderung.',
        effect: { hh: -0.8, zf: 5, gi: -0.5 },
      },
      {
        id: 'ost_kohle',
        label: 'Kohleausstieg um 3 Jahre verschieben',
        desc: 'Längere Übergangsfristen für ostdeutsche Kohleregionen.',
        effect: { gi: -0.6 },
        charMood: { um: -2 },
      },
      {
        id: 'ost_abschreibung',
        label: 'Sonderabschreibungen für ostdeutsche Unternehmen',
        desc: 'Steuerliche Anreize für Investitionen im Osten.',
        effect: { hh: -0.3, gi: 0.3 },
      },
    ],
    sonderregel: 'kohl_saboteur',
  },
];

/** Stimmenanzahl pro Land (für Mehrheitsberechnung) */
export function getLandVotes(landId: string): number {
  return LAND_VOTES[landId] ?? 0;
}
