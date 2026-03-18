/**
 * SMA-331: Fachbegriffe-Dictionary für Tooltip-Erklärungen im gesamten Spiel.
 * Einfache Sprache, max. 2 Sätze pro Begriff.
 */

export interface BegriffEintrag {
  label: string;
  text: string;
  link?: string;
}

export const BEGRIFFE: Record<string, BegriffEintrag> = {
  // ── Wirtschafts-KPIs ──────────────────────────────────────────────

  gini_index: {
    label: 'Gini-Index',
    text:
      'Misst die Ungleichheit der Einkommensverteilung. ' +
      '0 = alle verdienen gleich viel, 100 = eine Person hat alles. ' +
      'Deutschland liegt normalerweise bei 30–33.',
  },

  konjunkturindex: {
    label: 'Konjunkturindex',
    text:
      'Zeigt ob die Wirtschaft gerade wächst oder schrumpft. ' +
      'Positiv = Aufschwung, Negativ = Abschwung. ' +
      'Beeinflusst Steuereinnahmen und Arbeitslosigkeit.',
  },

  arbeitslosigkeit: {
    label: 'Arbeitslosigkeit',
    text:
      'Anteil der Menschen ohne Job an allen Erwerbsfähigen. ' +
      'Unter 5% gilt als Vollbeschäftigung. ' +
      'Hohe Arbeitslosigkeit belastet den Haushalt und die Zufriedenheit.',
  },

  zufriedenheit: {
    label: 'Zufriedenheit',
    text:
      'Allgemeine Lebenszufriedenheit der Bevölkerung. ' +
      'Beeinflusst die Wahlprognose direkt — unzufriedene Bürger wählen die Opposition.',
  },

  // ── Haushalt ─────────────────────────────────────────────────────

  schuldenbremse: {
    label: 'Schuldenbremse',
    text:
      'Im Grundgesetz verankerte Regel die den Staat verpflichtet, ' +
      'nicht mehr Geld auszugeben als er einnimmt. ' +
      'Ausnahmen gelten nur in Krisen oder für Investitionen.',
  },

  haushaltssaldo: {
    label: 'Haushaltssaldo',
    text:
      'Differenz zwischen staatlichen Einnahmen und Ausgaben. ' +
      'Negativ = Defizit (Staat gibt mehr aus als er einnimmt). ' +
      'Positiv = Überschuss.',
  },

  pflichtausgaben: {
    label: 'Pflichtausgaben',
    text:
      'Ausgaben die der Staat gesetzlich leisten muss — z.B. Renten, ' +
      'Sozialleistungen, Zinsen. Sie können nicht einfach gekürzt werden.',
  },

  strukturelles_defizit: {
    label: 'Strukturelles Defizit',
    text:
      'Ein dauerhaftes Haushaltsloch das auch in guten Wirtschaftszeiten besteht — ' +
      'nicht durch Konjunktur erklärbar. Schwerer zu beheben als ein konjunkturelles Defizit.',
  },

  sondervermoegen: {
    label: 'Sondervermögen',
    text:
      'Ein staatlicher Investitionsfonds außerhalb des regulären Haushalts. ' +
      'Ermöglicht große Ausgaben (z.B. Klimaschutz, Rüstung) ohne die Schuldenbremse zu verletzen — ' +
      'politisch umstritten.',
  },

  // ── Politiksystem ─────────────────────────────────────────────────

  koalitionsstabilitaet: {
    label: 'Koalitionsstabilität',
    text:
      'Wie gut Regierungspartei und Koalitionspartner zusammenarbeiten. ' +
      'Sinkt wenn Gesetze verabschiedet werden die dem Partner widersprechen ' +
      'oder wenn Minister-Forderungen abgelehnt werden.',
  },

  bt_stimmen: {
    label: 'Bundestag-Stimmen',
    text:
      'Anteil der Abgeordneten die für ein Gesetz stimmen. ' +
      'Für eine einfache Mehrheit braucht man über 50%. ' +
      'Manche Gesetze (z.B. Grundgesetzänderungen) brauchen 2/3.',
  },

  abstimmungsbereitschaft: {
    label: 'Abstimmungsbereitschaft',
    text:
      'Wie wahrscheinlich eine Bundesratsfraktion für ein Gesetz stimmt. ' +
      'Wird durch Lobbying, Beziehungspflege und Trade-offs beeinflusst.',
  },

  bundesrat: {
    label: 'Bundesrat',
    text:
      'Vertretung der 16 Bundesländer auf Bundesebene. ' +
      'Bei bestimmten Gesetzen (z.B. Ländersachen) muss der Bundesrat zustimmen. ' +
      'Ist er von der Opposition dominiert, kann er Gesetze blockieren.',
  },

  pk: {
    label: 'Politisches Kapital (PK)',
    text:
      'Deine politische Handlungsfähigkeit. ' +
      'Für jede Aktion (Gesetz einbringen, Lobbying, Gespräche) brauchst du PK. ' +
      'Es regeneriert sich monatlich — haushalte es weise.',
  },

  framing: {
    label: 'Framing',
    text:
      'Wie ein Gesetz der Öffentlichkeit präsentiert wird. ' +
      'Das gleiche Gesetz kann als "Klimaschutz" oder als "Wirtschaftsbelastung" geframt werden — ' +
      'mit unterschiedlichen Effekten auf Milieus und Medienklima.',
  },

  lobbying: {
    label: 'Lobbying',
    text:
      'Gezieltes Einwirken auf politische Entscheidungsträger. ' +
      'Im Spiel: du kannst Verbände und Bundesratsfraktionen mit PK beeinflussen ' +
      'um Mehrheiten zu sichern.',
  },

  // ── Gesellschaft & Milieus ────────────────────────────────────────

  milieus: {
    label: 'Wählermilieus',
    text:
      'Gesellschaftliche Gruppen mit ähnlichen Werten und Lebensweisen. ' +
      'Jedes Milieu reagiert unterschiedlich auf Gesetze. ' +
      'Ihre Zustimmung bestimmt deine Wahlprognose.',
  },

  postmaterielle: {
    label: 'Postmaterielle',
    text:
      'Akademisch geprägte, umwelt- und gerechtigkeitsorientierte Wähler. ' +
      'Unterstützen Klimaschutz, Bürgerrechte und progressiven Wandel. ' +
      'Reagieren positiv auf Grüne Politik, negativ auf Sicherheits- und Spargesetze.',
  },

  etablierte: {
    label: 'Etablierte',
    text:
      'Wohlhabende, wirtschaftlich erfolgreiche Wähler mit hoher Wahlbeteiligung. ' +
      'Schätzen Stabilität, niedrige Steuern und wirtschaftsfreundliche Politik.',
  },

  prekaere: {
    label: 'Prekäre',
    text:
      'Menschen in unsicheren Lebensverhältnissen mit niedrigem Einkommen. ' +
      'Reagieren stark auf Sozialpolitik, Mindestlohn und Wohnungsthemen. ' +
      'Haben eine niedrigere Wahlbeteiligung.',
  },

  leistungstraeger: {
    label: 'Leistungsträger',
    text:
      'Beruflich engagierte Mittelschicht mit Aufstiegsorientierung. ' +
      'Schätzen wirtschaftliche Dynamik, leistungsgerechte Steuern und Bildung.',
  },

  buergerliche_mitte: {
    label: 'Bürgerliche Mitte',
    text:
      'Wirtschaftlich orientierte Mittelschicht mit bürgerlichen Werten. ' +
      'Breites Spektrum, reagiert auf Wirtschafts- und Sicherheitsthemen.',
  },

  traditionelle: {
    label: 'Traditionelle',
    text:
      'Ältere, konservativ orientierte Wähler mit starker Heimatverbundenheit. ' +
      'Schätzen Ordnung, Familie und bewährte Strukturen. ' +
      'Reagieren kritisch auf schnellen gesellschaftlichen Wandel.',
  },

  soziale_mitte: {
    label: 'Soziale Mitte',
    text:
      'Sozial orientierte Mittelschicht mit progressiven Tendenzen. ' +
      'Unterstützen Solidarität, Bildung und faire Löhne.',
  },

  // ── Verbände & Interessengruppen ──────────────────────────────────

  politikfeld_druck: {
    label: 'Politikfeld-Druck',
    text:
      'Wie stark ein Verband gerade Druck in seinem Themenfeld ausübt. ' +
      'Hoher Druck bedeutet: dieser Verband erwartet bald eine Reaktion. ' +
      'Ignorierst du ihn zu lange, sinkt die Beziehung.',
  },

  konflikt_partner: {
    label: 'Konflikt-Partner',
    text:
      'Dieser Verband steht aktiv gegen deine Politik. ' +
      'Er kann öffentlich gegen deine Gesetze auftreten ' +
      'und dein Medienklima verschlechtern.',
  },

  // ── Gesetze & Governance ─────────────────────────────────────────

  gesetz_lag: {
    label: 'Ausschussphase',
    text:
      'Zeit zwischen Einbringen und Abstimmung eines Gesetzes. ' +
      'Gesetze durchlaufen parlamentarische Ausschüsse bevor abgestimmt wird — ' +
      'das dauert 1–6 Monate.',
  },

  investiv: {
    label: 'Investitionsgesetz',
    text:
      'Ein Gesetz das zwar Geld kostet, aber langfristig den Haushalt entlastet ' +
      'oder Wirtschaftswachstum erzeugt. ' +
      'Der Konjunktureffekt setzt mit Verzögerung ein.',
  },

  kongruenz: {
    label: 'Ideologie-Kongruenz',
    text:
      'Wie gut ein Gesetz zu deiner politischen Ausrichtung passt. ' +
      'Hohe Kongruenz = günstigere PK-Kosten und bessere Milieu-Reaktionen. ' +
      'Niedrige Kongruenz = teurer und politisch riskanter.',
  },

  multilevel_governance: {
    label: 'Multilevel-Governance',
    text:
      'Politik passiert auf mehreren Ebenen gleichzeitig: ' +
      'EU, Bund, Länder, Kommunen. ' +
      'Gesetze können auf einer Ebene vorbereitet werden um auf einer anderen mehr Wirkung zu erzielen.',
  },

  medienklima: {
    label: 'Medienklima',
    text:
      'Wie die Presse über deine Regierung berichtet. ' +
      'Positives Medienklima stärkt deine Wahlprognose. ' +
      'Skandale, Fehler und schlechte Kommunikation verschlechtern es.',
  },

  wahlprognose: {
    label: 'Wahlprognose',
    text:
      'Aktuelle Umfragewerte — wie viele Prozent würden deine Partei wählen. ' +
      'Am Ende der Legislatur musst du die Wahlhürde überschreiten um zu gewinnen.',
  },
};

/** KPI-Schlüssel → BEGRIFFE-Key für Tooltip-Integration */
export const KPI_TO_BEGRIFF: Record<string, string> = {
  al: 'arbeitslosigkeit',
  hh: 'haushaltssaldo',
  gi: 'gini_index',
  zf: 'zufriedenheit',
  mk: 'medienklima',
};
