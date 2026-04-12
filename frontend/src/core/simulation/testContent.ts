/**
 * Test-Content für Balance-Simulation.
 * Spiegelt die echten Game-Content-Daten aus backend/app/content/ wider.
 */
import type { ContentBundle, Law, Character, GameEvent } from '../types';
import {
  DEFAULT_CONTENT,
  DEFAULT_BUNDESRAT,
  DEFAULT_VERBAENDE,
  DEFAULT_MINISTERIAL_INITIATIVEN,
} from '../../data/defaults/scenarios';

/** 4 Basis-Gesetze (sofort verfügbar) + 10 Event-locked + 5 Spargesetze */
const SIM_LAWS: Law[] = [
  // === Basis-Gesetze (ab Start verfügbar) ===
  {
    id: 'ee', titel: 'Erneuerbare-Energien-Beschleunigungsgesetz', kurz: 'EE-BeschG',
    desc: 'Verdopplung der Ausbauziele, vereinfachte Genehmigung.',
    tags: ['bund', 'eu'], status: 'entwurf', ja: 70, nein: 30,
    effekte: { hh: -0.4, zf: 5, gi: -0.5, al: -0.3 }, lag: 4,
    expanded: false, route: null, rprog: 0, rdur: 0, blockiert: null,
    ideologie: { wirtschaft: -30, gesellschaft: -60, staat: -20 },
    ideologie_wert: -37,
  },
  {
    id: 'wb', titel: 'Bundeswohnungsbauoffensive', kurz: 'BWO',
    desc: '400.000 neue Wohnungen p.a., Baurechtsreform.',
    tags: ['bund', 'land', 'kommune'], status: 'entwurf', ja: 72, nein: 28,
    effekte: { hh: -0.6, zf: 8, gi: -1.2, al: -0.5 }, lag: 6,
    expanded: false, route: null, rprog: 0, rdur: 0, blockiert: null,
    ideologie: { wirtschaft: -20, gesellschaft: -40, staat: -30 },
    ideologie_wert: -30,
  },
  {
    id: 'sr', titel: 'Unternehmenssteuerreform', kurz: 'USR',
    desc: 'Körperschaftsteuer 15%, Gegenfinanzierung Digitalsteuer.',
    tags: ['bund', 'eu'], status: 'entwurf', ja: 58, nein: 42,
    effekte: { hh: -0.2, zf: 3, gi: 1.5, al: -0.8 }, lag: 5,
    expanded: false, route: null, rprog: 0, rdur: 0, blockiert: null,
    ideologie: { wirtschaft: 40, gesellschaft: 20, staat: 10 },
    ideologie_wert: 23,
  },
  {
    id: 'bp', titel: 'Nationales Bildungspaket', kurz: 'NBP',
    desc: 'Bundesfinanzierung Schulen via Kooperationsartikel.',
    tags: ['land', 'bund'], status: 'entwurf', ja: 70, nein: 30,
    effekte: { hh: -0.5, zf: 6, gi: -0.8, al: -0.1 }, lag: 8,
    expanded: false, route: null, rprog: 0, rdur: 0, blockiert: null,
    ideologie: { wirtschaft: -10, gesellschaft: -30, staat: -40 },
    ideologie_wert: -27,
  },

  // === Event-locked Gesetze ===
  {
    id: 'verfassungsreform', titel: 'Grundgesetzmodernisierung', kurz: 'GGMod',
    desc: 'Reform grundrechtlicher Schutzstandards.',
    tags: ['bund'], status: 'entwurf', ja: 55, nein: 45,
    effekte: { hh: -0.2, zf: 4, gi: -0.3 }, lag: 10,
    expanded: false, route: null, rprog: 0, rdur: 0, blockiert: null,
    locked_until_event: 'verfassungsgericht',
  },
  {
    id: 'katastrophenschutz', titel: 'Katastrophenschutz-Modernisierung', kurz: 'KatSchG',
    desc: 'Bundesweite Koordination, Warnsysteme.',
    tags: ['bund', 'land'], status: 'entwurf', ja: 72, nein: 28,
    effekte: { hh: -0.4, zf: 3, al: -0.1 }, lag: 6,
    expanded: false, route: null, rprog: 0, rdur: 0, blockiert: null,
    locked_until_event: 'naturkatastrophe',
  },
  {
    id: 'cybersicherheit', titel: 'Cybersicherheitsstärkungsgesetz', kurz: 'CySiG',
    desc: 'Pflicht-Sicherheitsstandards für Behörden.',
    tags: ['bund', 'eu'], status: 'entwurf', ja: 66, nein: 34,
    effekte: { hh: -0.3, zf: 2 }, lag: 5,
    expanded: false, route: null, rprog: 0, rdur: 0, blockiert: null,
    locked_until_event: 'cyberangriff',
  },
  {
    id: 'whistleblowerschutz', titel: 'Hinweisgeberschutzgesetz', kurz: 'HinSchG',
    desc: 'Schutz für Whistleblower.',
    tags: ['bund', 'eu'], status: 'entwurf', ja: 60, nein: 40,
    effekte: { hh: -0.1, zf: 3, gi: -0.2 }, lag: 4,
    expanded: false, route: null, rprog: 0, rdur: 0, blockiert: null,
    locked_until_event: 'whistleblower',
  },
  {
    id: 'tarifbindung', titel: 'Tarifbindungsstärkungsgesetz', kurz: 'TarifG',
    desc: 'Allgemeinverbindlicherklärung erleichtern.',
    tags: ['bund'], status: 'entwurf', ja: 60, nein: 40,
    effekte: { hh: -0.1, zf: 3, gi: -0.6, al: -0.2 }, lag: 5,
    expanded: false, route: null, rprog: 0, rdur: 0, blockiert: null,
    locked_until_event: 'streikwelle',
  },
  {
    id: 'mietrecht', titel: 'Mietrechtsreform', kurz: 'MietR',
    desc: 'Verschärfung der Mietpreisbremse.',
    tags: ['bund', 'land'], status: 'entwurf', ja: 64, nein: 36,
    effekte: { hh: -0.2, zf: 5, gi: -0.8 }, lag: 5,
    expanded: false, route: null, rprog: 0, rdur: 0, blockiert: null,
    locked_until_event: 'wohnungsnot',
  },
  {
    id: 'demokratiefoerderung', titel: 'Demokratiefördergesetz', kurz: 'DemFG',
    desc: 'Dauerhafte Finanzierung von Demokratieprojekten.',
    tags: ['bund'], status: 'entwurf', ja: 68, nein: 32,
    effekte: { hh: -0.3, zf: 4 }, lag: 4,
    expanded: false, route: null, rprog: 0, rdur: 0, blockiert: null,
    locked_until_event: 'rechtsextremismus',
  },
  {
    id: 'fachkraefte', titel: 'Fachkräfteeinwanderungsgesetz', kurz: 'FEG',
    desc: 'Punktebasiertes System, beschleunigte Visa.',
    tags: ['bund', 'eu'], status: 'entwurf', ja: 58, nein: 42,
    effekte: { hh: 0.1, zf: 2, al: -0.6 }, lag: 6,
    expanded: false, route: null, rprog: 0, rdur: 0, blockiert: null,
    locked_until_event: 'fachkraeftemangel',
  },
  {
    id: 'rentenreform', titel: 'Generationengerechte Rentenreform', kurz: 'RenRef',
    desc: 'Nachhaltiges Rentensystem.',
    tags: ['bund'], status: 'entwurf', ja: 54, nein: 46,
    effekte: { hh: -0.3, zf: 4, gi: -0.4 }, lag: 10,
    expanded: false, route: null, rprog: 0, rdur: 0, blockiert: null,
    locked_until_event: 'rentendebatte',
  },
  {
    id: 'pandemieschutz', titel: 'Pandemieschutzgesetz', kurz: 'PanSchG',
    desc: 'Bundesweite Pandemie-Vorsorge.',
    tags: ['bund', 'eu'], status: 'entwurf', ja: 70, nein: 30,
    effekte: { hh: -0.4, zf: 3 }, lag: 5,
    expanded: false, route: null, rprog: 0, rdur: 0, blockiert: null,
    locked_until_event: 'pandemie_vorbereitung',
  },

  // === Spargesetze (analog headless_runner.py) ===
  {
    id: 'sozialleistungen_kuerzen', titel: 'Sozialleistungen kürzen', kurz: 'SozKürz',
    desc: 'Kürzung von Sozialleistungen.',
    tags: ['bund'], status: 'entwurf', ja: 60, nein: 40,
    effekte: { hh: -0.1, zf: 2, gi: -0.1 }, lag: 4,
    pflichtausgaben_delta: -5.0,
    expanded: false, route: null, rprog: 0, rdur: 0, blockiert: null,
    ideologie: { wirtschaft: 40, gesellschaft: 30, staat: 30 },
    ideologie_wert: 33,
  },
  {
    id: 'beamtenbesoldung_einfrieren', titel: 'Beamtenbesoldung einfrieren', kurz: 'BesEinfr',
    desc: 'Einfrieren der Beamtenbesoldung.',
    tags: ['bund'], status: 'entwurf', ja: 60, nein: 40,
    effekte: { zf: 1 }, lag: 4,
    pflichtausgaben_delta: -3.0,
    expanded: false, route: null, rprog: 0, rdur: 0, blockiert: null,
    ideologie: { wirtschaft: 20, gesellschaft: 10, staat: 20 },
    ideologie_wert: 17,
  },
  {
    id: 'subventionen_abbau', titel: 'Subventionen abbauen', kurz: 'SubAbbau',
    desc: 'Abbau von Subventionen.',
    tags: ['bund'], status: 'entwurf', ja: 60, nein: 40,
    effekte: { hh: -0.1, zf: 3, gi: -0.2 }, lag: 4,
    einnahmeeffekt: 4.0,
    expanded: false, route: null, rprog: 0, rdur: 0, blockiert: null,
    ideologie: { wirtschaft: -10, gesellschaft: -30, staat: -10 },
    ideologie_wert: -17,
  },
  {
    id: 'rente_stabilisierung', titel: 'Rentenstabilisierung', kurz: 'RentStab',
    desc: 'Stabilisierung der Rentenkassen.',
    tags: ['bund'], status: 'entwurf', ja: 60, nein: 40,
    effekte: { hh: -0.2, zf: 2, gi: -0.1 }, lag: 4,
    pflichtausgaben_delta: -8.0,
    expanded: false, route: null, rprog: 0, rdur: 0, blockiert: null,
    ideologie: { wirtschaft: 30, gesellschaft: 20, staat: 10 },
    ideologie_wert: 20,
  },
  {
    id: 'effizienzprogramm_bund', titel: 'Effizienzprogramm Bund', kurz: 'EffProg',
    desc: 'Effizienzsteigerung in der Verwaltung.',
    tags: ['bund'], status: 'entwurf', ja: 60, nein: 40,
    effekte: { zf: 2, gi: 0.2 }, lag: 4,
    kosten_einmalig: -2.0,
    pflichtausgaben_delta: -4.0,
    expanded: false, route: null, rprog: 0, rdur: 0, blockiert: null,
    ideologie: { wirtschaft: 10, gesellschaft: 0, staat: 20 },
    ideologie_wert: 10,
  },
];

/** 6 Kabinettsmitglieder aus characters/default.yaml */
const SIM_CHARACTERS: Character[] = [
  {
    id: 'kanzler', name: 'Kanzler/in', role: 'Kanzlerin', initials: '??',
    color: '#8a7030', mood: 3, loyalty: 5,
    bio: 'Führt die Koalition mit pragmatischem Kurs.',
    interests: ['Koalitionsstabilität', 'Wiederwahl'],
    bonus: { trigger: 'mood>=3', desc: '+5 BT-Stimmen', applies: 'bt_bonus' },
    ultimatum: { moodThresh: 1, event: 'kanzler_ultimatum' },
    ist_kanzler: true,
  },
  {
    id: 'fm', name: 'Robert Lehmann', role: 'Finanzminister', initials: 'RL',
    color: '#5888b8', mood: 2, loyalty: 3,
    bio: 'Strenger Haushälter.',
    interests: ['Haushaltsdisziplin', 'Schuldenbremse'],
    bonus: { trigger: 'mood>=4', desc: 'Beschleunigt Gesetze', applies: 'hh_boost' },
    ultimatum: { moodThresh: 0, event: 'fm_ultimatum' },
  },
  {
    id: 'wm', name: 'Petra Maier', role: 'Wirtschaftsministerin', initials: 'PM',
    color: '#5a9870', mood: 4, loyalty: 4,
    bio: 'Pragmatisch und lösungsorientiert.',
    interests: ['Standortpolitik', 'Industrietransformation'],
    bonus: { trigger: 'mood>=3', desc: '+3% BT-Stimmen', applies: 'wirt_bonus' },
    ultimatum: { moodThresh: 0, event: 'wm_ultimatum' },
  },
  {
    id: 'im', name: 'Klaus Braun', role: 'Innenminister', initials: 'KB',
    color: '#c05848', mood: 1, loyalty: 2,
    bio: 'Konservativer Querdenker.',
    interests: ['Innere Sicherheit', 'Migrationsbegrenzung'],
    bonus: { trigger: 'mood>=4', desc: 'Stabilisiert Bundesrat', applies: 'br_bonus' },
    ultimatum: { moodThresh: 0, event: 'braun_ultimatum' },
  },
  {
    id: 'jm', name: 'Sara Kern', role: 'Justizministerin', initials: 'SK',
    color: '#9a8848', mood: 4, loyalty: 4,
    bio: 'Juristin mit unbedingten Prinzipien.',
    interests: ['Rechtsstaat', 'Grundrechte'],
    bonus: { trigger: 'mood>=3', desc: 'Verhindert Verfassungsklagen', applies: 'jm_shield' },
    ultimatum: { moodThresh: 1, event: 'kern_ultimatum' },
  },
  {
    id: 'um', name: 'Jonas Wolf', role: 'Umweltminister', initials: 'JW',
    color: '#6880b8', mood: 3, loyalty: 3,
    bio: 'Treibt Klimapolitik voran.',
    interests: ['Klimaschutz', 'Energiewende'],
    bonus: { trigger: 'mood>=4', desc: '+4% prog. Milieu', applies: 'prog_boost' },
    ultimatum: { moodThresh: 1, event: 'wolf_ultimatum' },
  },
];

/**
 * Unlock-Events für event-locked Gesetze.
 * Diese Events werden benötigt damit die 10 event-locked Gesetze im Spielverlauf
 * freigeschaltet werden können. Minimale Definitionen ohne spielerische Nebeneffekte.
 */
const SIM_UNLOCK_EVENTS: GameEvent[] = [
  {
    id: 'verfassungsgericht', type: 'warn', icon: '⚖️', typeLabel: 'Verfassungsgericht',
    title: 'Verfassungsgerichtsurteil erwartet',
    quote: 'Das Bundesverfassungsgericht kündigt ein Urteil an.',
    context: 'Das Gericht prüft aktuelle Gesetzgebung.',
    ticker: 'BVerfG-Urteil steht bevor',
    choices: [{ label: 'Zur Kenntnis nehmen', desc: 'Urteil abwarten', cost: 0, type: 'safe', effect: {}, log: 'Urteil wird erwartet.' }],
  },
  {
    id: 'naturkatastrophe', type: 'danger', icon: '🌊', typeLabel: 'Naturkatastrophe',
    title: 'Schwere Naturkatastrophe trifft Deutschland',
    quote: 'Überschwemmungen und Stürme fordern Menschenleben.',
    context: 'Hilfsmaßnahmen werden koordiniert.',
    ticker: 'Katastrophenschutz unter Druck',
    choices: [{ label: 'Hilfsmaßnahmen einleiten', desc: 'Sofortmaßnahmen', cost: 5, type: 'primary', effect: { zf: 2 }, log: 'Hilfsmaßnahmen eingeleitet.' }],
  },
  {
    id: 'cyberangriff', type: 'danger', icon: '💻', typeLabel: 'Cyberangriff',
    title: 'Cyberangriff auf Bundesbehörden',
    quote: 'Staatliche Systeme wurden angegriffen.',
    context: 'IT-Sicherheitsbehörden reagieren.',
    ticker: 'BSI reagiert auf Cyberangriff',
    choices: [{ label: 'Notfallprogramm starten', desc: 'IT-Sicherheit stärken', cost: 5, type: 'primary', effect: {}, log: 'Notfallprogramm aktiv.' }],
  },
  {
    id: 'whistleblower', type: 'warn', icon: '📢', typeLabel: 'Whistleblower',
    title: 'Whistleblower enthüllt Missstände',
    quote: 'Interne Dokumente zeigen Verwaltungsversagen.',
    context: 'Medien berichten breit.',
    ticker: 'Whistleblower-Enthüllung',
    choices: [{ label: 'Transparenz zeigen', desc: 'Offene Aufklärung', cost: 0, type: 'safe', effect: { zf: -2 }, log: 'Aufklärung eingeleitet.' }],
  },
  {
    id: 'streikwelle', type: 'warn', icon: '✊', typeLabel: 'Streikwelle',
    title: 'Bundesweite Streikwelle in Schlüsselbranchen',
    quote: 'Gewerkschaften fordern bessere Arbeitsbedingungen.',
    context: 'Verhandlungen stocken.',
    ticker: 'Streiks lähmen Infrastruktur',
    choices: [{ label: 'Vermittlung anbieten', desc: 'Tarifgespräche anstoßen', cost: 5, type: 'primary', effect: { zf: 1, al: -0.2 }, log: 'Vermittlung eingeleitet.' }],
  },
  {
    id: 'wohnungsnot', type: 'warn', icon: '🏠', typeLabel: 'Wohnungsnot',
    title: 'Wohnungsnot in Großstädten eskaliert',
    quote: 'Mietpreise auf Rekordhoch.',
    context: 'Soziale Spannungen wachsen.',
    ticker: 'Wohnungskrise verschärft sich',
    choices: [{ label: 'Programm ankündigen', desc: 'Sofortmaßnahmen', cost: 5, type: 'primary', effect: { zf: 2 }, log: 'Wohnungsprogramm angekündigt.' }],
  },
  {
    id: 'rechtsextremismus', type: 'danger', icon: '⚠️', typeLabel: 'Rechtsextremismus',
    title: 'Anstieg rechtsextremer Vorfälle',
    quote: 'Sicherheitsbehörden registrieren mehr Straftaten.',
    context: 'Zivilgesellschaft fordert Handeln.',
    ticker: 'Behörden verschärfen Maßnahmen',
    choices: [{ label: 'Entschieden reagieren', desc: 'Klares Signal', cost: 0, type: 'safe', effect: { zf: 2 }, log: 'Klares Zeichen gesetzt.' }],
  },
  {
    id: 'fachkraeftemangel', type: 'warn', icon: '👷', typeLabel: 'Fachkräftemangel',
    title: 'Fachkräftemangel bremst Wirtschaft',
    quote: 'Unternehmen finden kaum qualifizierte Bewerber.',
    context: 'Investitionen bleiben aus.',
    ticker: 'Fachkräftemangel verschärft sich',
    choices: [{ label: 'Qualifizierungsoffensive', desc: 'Weiterbildung fördern', cost: 5, type: 'primary', effect: { al: -0.3 }, log: 'Qualifizierungsprogramm gestartet.' }],
  },
  {
    id: 'rentendebatte', type: 'warn', icon: '👴', typeLabel: 'Rentendebatte',
    title: 'Generationenkonflikt um Rente eskaliert',
    quote: 'Junge Generation protestiert gegen Rentenlasten.',
    context: 'Demografischer Wandel ist spürbar.',
    ticker: 'Rentendebatte erhitzt Gemüter',
    choices: [{ label: 'Expertenkommission einsetzen', desc: 'Lösungen erarbeiten', cost: 0, type: 'safe', effect: {}, log: 'Kommission eingesetzt.' }],
  },
  {
    id: 'pandemie_vorbereitung', type: 'warn', icon: '🦠', typeLabel: 'Pandemieschutz',
    title: 'WHO warnt vor neuer Pandemiegefahr',
    quote: 'Gesundheitsbehörden mahnen zur Vorbereitung.',
    context: 'Vorsorgemaßnahmen werden diskutiert.',
    ticker: 'Pandemieschutz auf Agenda',
    choices: [{ label: 'Vorsorgeplan aktivieren', desc: 'Frühzeitig vorbereiten', cost: 5, type: 'primary', effect: { zf: 1 }, log: 'Vorsorgeplan aktiviert.' }],
  },
];

/** Wichtigste Events für Balance-Simulation */
const SIM_EVENTS: GameEvent[] = [
  {
    id: 'haushalt', type: 'danger', icon: '💰', typeLabel: 'Haushaltskrise',
    title: 'Milliardenloch im Bundeshaushalt', always_include: true,
    quote: 'Überraschende Steuermindereinnahmen reißen ein Loch von 14 Milliarden Euro.',
    context: 'Das Finanzministerium hat die Schätzungen nach unten korrigiert.',
    ticker: 'Haushaltsloch: Regierung unter Druck',
    choices: [
      { label: 'Sparpaket', desc: 'Kurzfristige Sanierung', cost: 10, type: 'primary',
        effect: { hh: 0.4, zf: -5 }, charMood: { fm: 1 }, log: 'Sparpaket beschlossen.' },
      { label: 'Neue Schulden', desc: 'Schuldenbremse dehnen', cost: 0, type: 'danger',
        effect: { hh: -0.2, zf: -2 }, charMood: { jm: -1 }, log: 'Schuldenbremse gedehnt.' },
      { label: 'Steuererhöhung', desc: 'Belastet Mitte', cost: 5, type: 'safe',
        effect: { hh: 0.3, zf: -3, gi: -0.3 }, charMood: { fm: 1, im: -1 }, log: 'Steuererhöhung angekündigt.' },
    ],
  },
  {
    id: 'skandal', type: 'danger', icon: '📰', typeLabel: 'Politischer Skandal',
    title: 'Medienberichte über Ministeriumsverschwendung',
    quote: 'Der Spiegel berichtet über fragwürdige Beraterverträge.',
    context: 'Die Opposition fordert Rücktritt.',
    ticker: 'Spiegel-Bericht erschüttert Koalition',
    choices: [
      { label: 'Transparenz', desc: 'Offenlegen', cost: 0, type: 'safe',
        effect: { zf: -4 }, charMood: { im: -1, jm: 1 }, log: 'Vollständige Offenlegung.' },
      { label: 'Ablenkung', desc: 'Medien überspielen', cost: 15, type: 'danger',
        effect: { zf: -2 }, log: 'Ablenkungsmanöver.' },
      { label: 'Minister entlassen', desc: 'Klares Signal', cost: 5, type: 'primary',
        effect: { zf: -1 }, charMood: { im: -2 }, log: 'Minister entlassen.' },
    ],
  },
  {
    id: 'konjunktur', type: 'warn', icon: '📉', typeLabel: 'Wirtschaftskrise',
    title: 'Konjunktureinbruch droht',
    quote: 'Führende Wirtschaftsinstitute senken Prognosen.',
    context: 'Exportrückgang und Investitionszurückhaltung belasten die Wirtschaft.',
    ticker: 'Konjunkturprognosen gesenkt',
    choices: [
      { label: 'Konjunkturpaket', desc: 'Investitionen ankurbeln', cost: 15, type: 'primary',
        effect: { hh: -0.5, zf: 3, al: -0.3 }, log: 'Konjunkturpaket beschlossen.' },
      { label: 'Abwarten', desc: 'Markt regelt sich', cost: 0, type: 'safe',
        effect: { zf: -2 }, log: 'Regierung wartet ab.' },
    ],
  },
  {
    id: 'koalition_krise', type: 'danger', icon: '🤝', typeLabel: 'Koalitionskrise',
    title: 'Partner droht mit Ausstieg',
    quote: 'Der Koalitionspartner fühlt sich übergangen.',
    context: 'Schlüsselthemen des Partners wurden ignoriert.',
    ticker: 'Koalitionskrise: Partner droht mit Ausstieg',
    choices: [
      { label: 'Zugeständnis', desc: 'Partner besänftigen', cost: 10, type: 'primary',
        effect: { zf: -1 }, koalitionspartnerBeziehung: 15, log: 'Zugeständnis gemacht.' },
      { label: 'Konfrontation', desc: 'Stärke zeigen', cost: 5, type: 'danger',
        effect: { zf: -3 }, koalitionspartnerBeziehung: -10, log: 'Konfrontation gewählt.' },
    ],
  },
  {
    id: 'demo', type: 'warn', icon: '📢', typeLabel: 'Demonstration',
    title: 'Großdemonstration gegen Regierungspolitik',
    quote: 'Hunderttausende gehen auf die Straße.',
    context: 'Die Unzufriedenheit der Bevölkerung wächst.',
    ticker: 'Massenproteste gegen Regierung',
    choices: [
      { label: 'Dialog anbieten', desc: 'Auf Demonstranten zugehen', cost: 5, type: 'safe',
        effect: { zf: 2 }, log: 'Dialog mit Demonstranten.' },
      { label: 'Kurs halten', desc: 'Politik beibehalten', cost: 0, type: 'danger',
        effect: { zf: -3 }, log: 'Regierung hält Kurs.' },
    ],
  },
];

/** Vollständiges ContentBundle für Balance-Simulation */
export const SIM_CONTENT: ContentBundle = {
  ...DEFAULT_CONTENT,
  characters: SIM_CHARACTERS,
  laws: SIM_LAWS,
  events: SIM_EVENTS,
  charEvents: {},
  bundesrat: DEFAULT_BUNDESRAT,
  verbaende: DEFAULT_VERBAENDE,
  ministerialInitiativen: DEFAULT_MINISTERIAL_INITIATIVEN,
};

/**
 * Erweitertes ContentBundle mit Unlock-Events für alle event-locked Gesetze.
 * Damit können auch die 10 event-locked Gesetze im Spielverlauf freigeschaltet werden.
 * Für Komplexitäts- und Mechanik-Coverage-Tests.
 */
export const SIM_CONTENT_WITH_UNLOCK_EVENTS: ContentBundle = {
  ...SIM_CONTENT,
  events: [...SIM_EVENTS, ...SIM_UNLOCK_EVENTS],
};
