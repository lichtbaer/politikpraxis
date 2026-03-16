import type { GameEvent } from '../../core/types';

export const DEFAULT_EVENTS: GameEvent[] = [
  {
    id: 'haushalt', type: 'danger', icon: '💰', typeLabel: 'Haushaltskrise',
    title: 'Milliardenloch im Bundeshaushalt',
    quote: '„Überraschende Steuermindereinnahmen reißen ein Loch von 14 Milliarden Euro."',
    context: 'Das Finanzministerium hat die Schätzungen nach unten korrigiert. Finanzminister Lehmann fordert sofortige Gegenmaßnahmen.',
    choices: [
      { label: 'Sparpaket durchsetzen', desc: 'Kurzfristige Sanierung, senkt Popularität', cost: 10, type: 'primary', effect: { hh: 0.4, zf: -5 }, charMood: { fm: 1 }, log: 'Sparpaket beschlossen. Haushalt stabilisiert, Popularität sinkt.' },
      { label: 'Neue Schulden aufnehmen', desc: 'Verstößt gegen Schuldenbremse — rechtliches Risiko', cost: 0, type: 'danger', effect: { hh: -0.2, zf: -2 }, charMood: { jm: -1 }, log: 'Schuldenbremse gedehnt. Verfassungsklage droht.' },
      { label: 'Steuererhöhung ankündigen', desc: 'Belastet Mitte-Milieu, stabilisiert Haushalt', cost: 5, type: 'safe', effect: { hh: 0.3, zf: -3, gi: -0.3 }, charMood: { fm: 1, im: -1 }, log: 'Steuererhöhung angekündigt. Wirtschaftsverband protestiert.' },
    ],
    ticker: 'Haushaltsloch: Regierung unter Druck — Lehmann fordert Sparpaket',
  },
  {
    id: 'skandal', type: 'danger', icon: '📰', typeLabel: 'Politischer Skandal',
    title: 'Medienberichte über Ministeriumsverschwendung',
    quote: '„Der Spiegel berichtet über fragwürdige Beraterverträge im Bundesministerium."',
    context: 'Die Opposition fordert Rücktritt. Braun nutzt die Gelegenheit, die Koalition zu destabilisieren.',
    choices: [
      { label: 'Vollständige Transparenz', desc: 'Alles offenlegen, kurzfristiger Schaden', cost: 0, type: 'safe', effect: { zf: -4 }, charMood: { im: -1, jm: 1 }, log: 'Vollständige Offenlegung. Kurzzeitiger Schaden, langfristiges Vertrauen.' },
      { label: 'Ablenkungsoffensive', desc: 'Medien mit neuem Thema überspielen', cost: 15, type: 'danger', effect: { zf: -2 }, charMood: {}, log: 'Ablenkungsmanöver gestartet. Medien skeptisch.' },
      { label: 'Minister entlassen', desc: 'Klares Signal, kostet Koalitionsstabilität', cost: 5, type: 'primary', effect: { zf: -1 }, charMood: { im: -2 }, log: 'Minister entlassen. Koalitionspartner verärgert.' },
    ],
    ticker: 'Spiegel-Bericht erschüttert Koalition — Opposition wittert Morgenluft',
  },
  {
    id: 'euklage', type: 'warn', icon: '🇪🇺', typeLabel: 'EU-Vertragsverletzung',
    title: 'Brüssel leitet Verfahren gegen Deutschland ein',
    quote: '„Die Europäische Kommission kritisiert die schleppende Umsetzung von EU-Richtlinien."',
    context: 'Drei Richtlinien sind noch nicht in nationales Recht überführt. Ein Bußgeld von bis zu 500 Mio. Euro droht.',
    choices: [
      { label: 'Schnellumsetzung', desc: 'Eilgesetzgebung, ignoriert Bundesrat', cost: 20, type: 'primary', effect: { hh: -0.1, zf: 2 }, charMood: { jm: -1 }, log: 'EU-Richtlinien schnell umgesetzt. Verfassungsrechtliche Bedenken bleiben.' },
      { label: 'EU-Verhandlung aufnehmen', desc: 'Zeitgewinn, keine sofortigen Kosten', cost: 8, type: 'safe', effect: {}, charMood: {}, log: 'Verhandlungen mit Brüssel aufgenommen. Ergebnis offen.' },
      { label: 'Bundesrat einbeziehen', desc: 'Korrekt aber langsam, Bußgeld riskant', cost: 5, type: 'safe', effect: { hh: -0.3 }, charMood: { fm: -1 }, log: 'Reguläres Verfahren gewählt. Bußgeld-Risiko bleibt.' },
    ],
    ticker: 'EU-Vertragsverletzungsverfahren gegen Deutschland eröffnet',
  },
  {
    id: 'konjunktur', type: 'warn', icon: '📉', typeLabel: 'Wirtschaftsabschwung',
    title: 'EZB-Zinserhöhung trifft deutsche Wirtschaft',
    quote: '„Investitionen brechen ein, Kurzarbeit steigt — Rezessionsrisiko wächst."',
    context: 'Maier warnt vor voreiligen Ausgabenkürzungen. Lehmann besteht auf Haushaltsdisziplin.',
    choices: [
      { label: 'Konjunkturpaket auflegen', desc: 'Teuer, aber effektiv', cost: 0, type: 'primary', effect: { hh: -0.5, zf: 4, al: -0.3 }, charMood: { wm: 1, fm: -1 }, log: 'Konjunkturpaket beschlossen. Haushalt belastet, Wirtschaft stabilisiert.' },
      { label: 'Abwarten', desc: 'Günstig, aber riskant', cost: 0, type: 'safe', effect: { al: 0.5, zf: -3 }, charMood: { wm: -1 }, log: 'Abwartende Haltung. Wirtschaft verschlechtert sich weiter.' },
      { label: 'Strukturreformen ankündigen', desc: 'Langfristig richtig, kurzfristig wirkungslos', cost: 10, type: 'safe', effect: { zf: 1 }, charMood: { wm: 1, fm: 1 }, log: 'Strukturreformen angekündigt. Märkte reagieren positiv.' },
    ],
    ticker: 'Wirtschaftsabschwung: Rezessionsrisiko steigt auf 35%',
  },
  {
    id: 'koalition_krise', type: 'danger', icon: '🤝', typeLabel: 'Koalitionskrise',
    title: 'Koalitionspartner droht mit Austritt',
    quote: '„Wir können dieser Politik nicht mehr zustimmen", warnt der Koalitionspartner.',
    context: 'Streit um das Energiegesetz eskaliert. Der Juniorpartner fordert Nachverhandlungen zum Koalitionsvertrag.',
    choices: [
      { label: 'Nachverhandeln', desc: 'Stabilitätsgewinn, Reformverlust', cost: 15, type: 'safe', effect: { zf: -2 }, charMood: { fm: 1 }, log: 'Koalitionsvertrag nachverhandelt. Reform verwässert.' },
      { label: 'Konfrontation riskieren', desc: 'Prinzipientreu, aber destabilisierend', cost: 0, type: 'danger', effect: { zf: -6 }, charMood: { im: -2 }, log: 'Koalitionskrise eskaliert. Neuwahlen im Gespräch.' },
      { label: 'Tauschgeschäft anbieten', desc: 'Anderes Projekt opfern, Koalition retten', cost: 20, type: 'primary', effect: { zf: -1 }, charMood: {}, log: 'Tauschgeschäft vereinbart. Koalition vorläufig gerettet.' },
    ],
    ticker: 'KOALITIONSKRISE: Juniorpartner stellt Ultimatum an Kanzleramt',
  },
  {
    id: 'demo', type: 'info', icon: '📢', typeLabel: 'Gesellschaft',
    title: 'Großdemonstration erschüttert Berlin',
    quote: '„500.000 Menschen auf den Straßen — die größte Demo seit Jahren."',
    context: 'Der Protest richtet sich gegen soziale Ungleichheit. Progressive sind mobilisiert, aber auch unzufrieden mit der Regierung.',
    choices: [
      { label: 'Dialog anbieten', desc: 'Signal der Offenheit', cost: 5, type: 'safe', effect: { zf: 2, gi: -0.2 }, charMood: { um: 1, jm: 1 }, log: 'Dialog mit Demonstranten angeboten. Progressives Milieu beruhigt.' },
      { label: 'Forderungen ablehnen', desc: 'Klare Position, aber Polarisierung', cost: 0, type: 'danger', effect: { zf: -3 }, charMood: { im: 1, um: -1 }, log: 'Forderungen abgelehnt. Progressive enttäuscht.' },
      { label: 'Sofortprogramm ankündigen', desc: 'Teuer, hoher Sympathiegewinn', cost: 0, type: 'primary', effect: { hh: -0.2, zf: 4, gi: -0.5 }, charMood: { um: 2 }, log: 'Sofortprogramm angekündigt. Breite Zustimmung.' },
    ],
    ticker: 'Berlin: Historische Großdemonstration für soziale Gerechtigkeit',
  },
  {
    id: 'eufoerder', type: 'good', icon: '🇪🇺', typeLabel: 'EU-Förderung',
    title: 'EU gibt Milliarden-Strukturfonds frei',
    quote: '„Brüssel stellt 4,8 Milliarden Euro für deutsche Klimainvestitionen bereit."',
    context: 'Eine seltene gute Nachricht: die EU-Gelder kommen früher als erwartet. Wie werden sie eingesetzt?',
    choices: [
      { label: 'Klimaschutz & Infrastruktur', desc: 'Langfristig wirksam', cost: 0, type: 'primary', effect: { hh: 0.3, zf: 3, gi: -0.3 }, charMood: { um: 2, fm: 1 }, log: 'EU-Fonds für Klimainvestitionen eingesetzt.' },
      { label: 'Wohnungsbau priorisieren', desc: 'Populär, schnell sichtbar', cost: 0, type: 'safe', effect: { hh: 0.2, zf: 5, gi: -0.6 }, charMood: { wm: 1 }, log: 'EU-Gelder stärken Wohnungsbauoffensive.' },
      { label: 'Schuldentilgung', desc: 'Finanzministerium begeistert', cost: 0, type: 'safe', effect: { hh: 0.5, zf: 1 }, charMood: { fm: 2 }, log: 'Schulden getilgt. Haushalt verbessert, Spielraum für Reformen.' },
    ],
    ticker: 'EU gibt 4,8 Mrd. Euro für Deutschland frei — Regierung entscheidet Verwendung',
  },
];

export const DEFAULT_CHAR_EVENTS: Record<string, GameEvent> = {
  fm_ultimatum: {
    id: 'fm_ultimatum', type: 'danger', icon: '💼', typeLabel: 'Kabinettskrise',
    title: 'Lehmann stellt Haushaltsultimatum', charId: 'fm',
    quote: '„Kein einziges Gesetz ohne vollständigen Deckungsnachweis — sonst trete ich zurück."',
    context: 'Finanzminister Lehmann ist am Ende seiner Geduld. Zu viele teure Projekte ohne Gegenfinanzierung.',
    choices: [
      { label: 'Deckungsnachweis zusagen', desc: 'Verwässert teure Gesetze, beruhigt Lehmann', cost: 0, type: 'safe', effect: { hh: 0.2 }, charMood: { fm: 2 }, loyalty: { fm: 1 }, log: 'Deckungszusage gemacht. Lehmann besänftigt, Reformen eingeschränkt.' },
      { label: 'Öffentlich widersprechen', desc: 'Klarer Kurs, aber Koalitionsrisiko', cost: 0, type: 'danger', effect: { zf: -4 }, charMood: { fm: -1, kanzler: -1 }, loyalty: { fm: -2 }, log: 'Öffentlicher Streit mit Lehmann. Koalition destabilisiert.' },
      { label: 'Sondergespräch einberufen', desc: 'Zeitgewinn, kostet politisches Kapital', cost: 20, type: 'primary', effect: {}, charMood: { fm: 1 }, loyalty: { fm: 0 }, log: 'Koalitionsgipfel im Kanzleramt. Kompromiss gefunden.' },
    ],
    ticker: 'KABINETTSKRISE: Finanzminister Lehmann droht mit Rücktritt',
  },
  braun_ultimatum: {
    id: 'braun_ultimatum', type: 'danger', icon: '🔴', typeLabel: 'Koalitionskonflikt',
    title: 'Braun sabotiert Abstimmung im Bundesrat', charId: 'im',
    quote: '„Ich habe den Innenministern der Länder empfohlen, gegen dieses Gesetz zu stimmen."',
    context: 'Braun hat hinter dem Rücken der Koalition agiert und drei Länder-Innenminister beeinflusst.',
    choices: [
      { label: 'Braun öffentlich rügen', desc: 'Klares Signal, Braun wird zum Feind', cost: 5, type: 'danger', effect: { zf: 2 }, charMood: { im: -2, kanzler: 1 }, loyalty: { im: -2 }, log: 'Braun offiziell gerügt. Interne Spannung auf Maximum.' },
      { label: 'Braun einbinden', desc: 'Gibt ihm Einfluss, kostet Reform-Substanz', cost: 15, type: 'safe', effect: {}, charMood: { im: 2 }, loyalty: { im: 1 }, log: 'Braun erhält Zugeständnisse. Koalition stabilisiert, Reform verwässert.' },
      { label: 'Braun entlassen', desc: 'Saubere Lösung, braucht Koalitionspartner', cost: 30, type: 'primary', effect: { zf: 3 }, charMood: { kanzler: 1, wm: 1, im: -3 }, loyalty: { im: -3 }, log: 'Braun entlassen. Kabinett umgebildet.' },
    ],
    ticker: 'Innenminister Braun sabotiert Koalitionspartner im Bundesrat',
  },
  wolf_ultimatum: {
    id: 'wolf_ultimatum', type: 'warn', icon: '🌿', typeLabel: 'Klimastreit',
    title: 'Wolf droht mit Rücktritt über Klimapolitik', charId: 'um',
    quote: '„Wenn das Energiegesetz weiter verwässert wird, kann ich dieses Kabinett nicht mehr vertreten."',
    context: 'Wolf ist frustriert über die schleppende Klimapolitik.',
    choices: [
      { label: 'Energiegesetz priorisieren', desc: 'Wolf zufrieden, progressive Stimmen steigen', cost: 10, type: 'safe', effect: { zf: 3 }, charMood: { um: 2, fm: -1 }, loyalty: { um: 1 }, log: 'Energiegesetz auf die Prioritätsliste gesetzt. Wolf bleibt.' },
      { label: 'Wolf überzeugen zu bleiben', desc: 'Symbolisches Zugeständnis', cost: 15, type: 'primary', effect: {}, charMood: { um: 1 }, loyalty: { um: 0 }, log: 'Persönliches Gespräch mit Wolf. Vorläufige Einigung.' },
      { label: 'Rücktritt akzeptieren', desc: 'Wolf geht, progressives Milieu bricht ein', cost: 0, type: 'danger', effect: { zf: -8 }, charMood: {}, loyalty: { um: -3 }, log: 'Wolf tritt zurück. Progressive Wähler fühlen sich verraten.' },
    ],
    ticker: 'Umweltminister Wolf stellt Klimaschutz-Ultimatum an Kanzleramt',
  },
  kern_ultimatum: {
    id: 'kern_ultimatum', type: 'warn', icon: '⚖️', typeLabel: 'Verfassungskonflikt',
    title: 'Kern blockiert Gesetz wegen Verfassungsbedenken', charId: 'jm',
    quote: '„Ich werde kein Gesetz unterzeichnen, das vor dem Bundesverfassungsgericht keinen Bestand hat."',
    context: 'Kern hat das Eilgesetz zur EU-Richtlinie gestoppt. Sie hat inhaltlich recht — aber die Zeit läuft.',
    choices: [
      { label: 'Gesetz verfassungskonform anpassen', desc: 'Verzögerung, aber rechtssicher', cost: 10, type: 'safe', effect: {}, charMood: { jm: 2 }, loyalty: { jm: 1 }, log: 'Gesetz überarbeitet. Verfassungsrechtlich sauber, aber verzögert.' },
      { label: 'Expertenkommission einsetzen', desc: 'Weiterer Zeitgewinn', cost: 8, type: 'safe', effect: {}, charMood: { jm: 1 }, loyalty: { jm: 0 }, log: 'Verfassungskommission eingesetzt. Kern kooperiert.' },
      { label: 'Politischen Druck ausüben', desc: 'Riskant — Kern könnte klagen', cost: 0, type: 'danger', effect: { zf: -3 }, charMood: { jm: -2 }, loyalty: { jm: -2 }, log: 'Kern fühlt sich übergangen. Verfassungsklage droht.' },
    ],
    ticker: 'Justizministerin stoppt Eilgesetz — Verfassungsbedenken im Kabinett',
  },
  kanzler_ultimatum: {
    id: 'kanzler_ultimatum', type: 'danger', icon: '🏛️', typeLabel: 'Vertrauensfrage',
    title: 'Hoffmann erwägt Vertrauensfrage', charId: 'kanzler',
    quote: '„Wenn die Koalition keine gemeinsame Linie findet, werde ich die Vertrauensfrage stellen."',
    context: 'Die interne Zerrissenheit ist öffentlich geworden. Hoffmann will ein klares Bekenntnis.',
    choices: [
      { label: 'Koalitionsgipfel einberufen', desc: 'Alle Konflikte auf den Tisch', cost: 20, type: 'primary', effect: { zf: 2 }, charMood: { kanzler: 2, fm: 1, wm: 1 }, loyalty: { kanzler: 1 }, log: 'Koalitionsgipfel schafft neue Einigkeit.' },
      { label: 'Vertrauensfrage riskieren', desc: 'Gamble — gewinnen oder Neuwahl', cost: 0, type: 'danger', effect: { zf: -5 }, charMood: {}, loyalty: {}, log: 'Vertrauensfrage gestellt. Koalition hält knapp.' },
    ],
    ticker: 'Kanzlerin Hoffmann erwägt Vertrauensfrage — Koalition unter Druck',
  },
  wm_ultimatum: {
    id: 'wm_ultimatum', type: 'warn', icon: '🏭', typeLabel: 'Wirtschaftsstreit',
    title: 'Maier droht mit Rücktritt über Standortpolitik', charId: 'wm',
    quote: '„Die Kombination aus Steuererhöhung und Regulierung treibt Unternehmen ins Ausland."',
    context: 'Maier sieht die Wirtschaftspolitik auf dem falschen Weg.',
    choices: [
      { label: 'Steuerreform beschleunigen', desc: 'Maier bleibt, Haushalt leidet', cost: 0, type: 'safe', effect: { hh: -0.3, al: -0.3 }, charMood: { wm: 2, fm: -1 }, loyalty: { wm: 1 }, log: 'Steuerreform vorgezogen. Wirtschaft stabilisiert, Haushalt belastet.' },
      { label: 'Regulierung zurücknehmen', desc: 'Populär bei Industrie, unpopulär bei Progressiven', cost: 0, type: 'primary', effect: { zf: -2, gi: 0.5, al: -0.4 }, charMood: { wm: 2, um: -1 }, loyalty: { wm: 1 }, log: 'Regulierungspause beschlossen. Industrie erleichtert.' },
      { label: 'Maier überstimmen', desc: 'Koalitionsdisziplin, Maier verliert Einfluss', cost: 10, type: 'danger', effect: {}, charMood: { wm: -2 }, loyalty: { wm: -1 }, log: 'Koalitionsdisziplin erzwungen. Maier fügt sich.' },
    ],
    ticker: 'Wirtschaftsministerin Maier stellt Ultimatum zur Standortpolitik',
  },
};
