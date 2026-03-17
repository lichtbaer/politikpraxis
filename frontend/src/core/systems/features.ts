/** Feature-Flags abhängig von Komplexitätsstufe (1–4) */
const FEATURES: Record<string, { minLevel: number }> = {
  bundesrat_simple: { minLevel: 2 },
  bundesrat_full: { minLevel: 3 },
  lobbying: { minLevel: 3 },
  tradeoff: { minLevel: 3 },
  br_events: { minLevel: 3 },
  eu_events: { minLevel: 4 },
  followup_events: { minLevel: 4 },
  media_agenda: { minLevel: 4 },
  konjunktur_cycles: { minLevel: 4 },
  budget_explicit: { minLevel: 4 },
  milieu_progressiv: { minLevel: 2 },
  char_ultimatums: { minLevel: 2 },
  coalition_stability: { minLevel: 2 },
  /** Schulze + Neumann ab Stufe 3 */
  kabinett_erweiterung: { minLevel: 3 },
  /** + Becker ab Stufe 4 */
  kabinett_voll: { minLevel: 4 },
  /** SMA-261: Kongruenz modifiziert PK-Kosten beim Einbringen */
  kongruenz_effekte: { minLevel: 2 },
  /** Char-Mood bei ideologisch gegensätzlichem Gesetz */
  char_ideologie: { minLevel: 3 },
  /** Vollständige Milieu-Zustimmung (Stufe 1: nur aggregiert) */
  milieus_voll: { minLevel: 2 },
  /** Politikfeld-Druck-System */
  politikfeld_druck: { minLevel: 3 },
  /** Verbands-Lobbying */
  verbands_lobbying: { minLevel: 3 },
  /** Koalitionspartner-System */
  koalitionspartner: { minLevel: 2 },
};

export function featureActive(complexity: number, key: string): boolean {
  return (FEATURES[key]?.minLevel ?? 1) <= complexity;
}
