/**
 * SMA-331: Fachbegriffe für Tooltip-Erklärungen im gesamten Spiel.
 * Label und Text liegen lokalisiert in den Locale-Dateien unter
 * `game:begriffe.<key>.{label,text}` (de/en). Hier nur die gültigen Keys.
 */

export const BEGRIFF_KEYS = new Set([
  // Wirtschafts-KPIs
  'gini_index',
  'konjunkturindex',
  'arbeitslosigkeit',
  'zufriedenheit',
  // Haushalt
  'schuldenbremse',
  'haushaltssaldo',
  'pflichtausgaben',
  'strukturelles_defizit',
  'sondervermoegen',
  // Politiksystem
  'koalitionsstabilitaet',
  'bt_stimmen',
  'abstimmungsbereitschaft',
  'bundesrat',
  'pk',
  'framing',
  'lobbying',
  // Gesellschaft & Milieus
  'milieus',
  'postmaterielle',
  'etablierte',
  'prekaere',
  'leistungstraeger',
  'buergerliche_mitte',
  'traditionelle',
  'soziale_mitte',
  // Verbände & Interessengruppen
  'politikfeld_druck',
  'konflikt_partner',
  // Gesetze & Governance
  'gesetz_lag',
  'investiv',
  'kongruenz',
  'multilevel_governance',
  'medienklima',
  'wahlprognose',
]);

/** KPI-Schlüssel → Begriff-Key für Tooltip-Integration */
export const KPI_TO_BEGRIFF: Record<string, string> = {
  al: 'arbeitslosigkeit',
  hh: 'haushaltssaldo',
  gi: 'gini_index',
  zf: 'zufriedenheit',
  mk: 'medienklima',
};
