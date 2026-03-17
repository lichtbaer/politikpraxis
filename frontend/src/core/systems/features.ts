/** Feature-Flags abhängig von Komplexitätsstufe (1–4) */
const FEATURES: Record<string, { minLevel: number }> = {
  /** SMA-291: Stufe 1 unsichtbar, Stufe 2+ Tab sichtbar */
  bundesrat_sichtbar: { minLevel: 2 },
  /** SMA-291: Stufe 2 aggregierter Balken, Stufe 3+ 4 Fraktionen mit Lobbying */
  bundesrat_detail: { minLevel: 3 },
  /** Legacy-Aliase für Kompatibilität */
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
  /** Verbands-Lobbying, Trade-offs, Konflikt-Mechanik */
  verbands_lobbying: { minLevel: 3 },
  /** Koalitionspartner als eigenständiger Akteur ab Stufe 2 */
  koalitionspartner: { minLevel: 2 },
  /** Koalitionsvertrag-Score (Kongruenz-Tracking) ab Stufe 4 */
  koalitionsvertrag_score: { minLevel: 4 },
  /** Ministerial-Initiativen (Minister bringen eigene Gesetze ein) */
  ministerial_initiativen: { minLevel: 3 },
  /** SMA-268: Haushaltsdebatte als jährliches Strukturevent */
  haushaltsdebatte: { minLevel: 2 },
  /** SMA-268: Schuldenbremsen-Check und Lehmann-Reaktionen */
  schuldenbremse: { minLevel: 3 },
  /** SMA-268: Konjunkturindex sichtbar und in Einnahmen */
  konjunkturindex: { minLevel: 3 },
  /** SMA-268: Steuerquote/Steuerpolitik-Modifikator */
  steuerquote: { minLevel: 3 },
  /** SMA-268: Gegenfinanzierung bei Gesetzen */
  gegenfinanzierung: { minLevel: 2 },
  /** SMA-269: EU-Ausweichroute (3 Phasen) */
  eu_route: { minLevel: 2 },
  /** EU-Klima-System (sichtbar, Drift) */
  eu_klima: { minLevel: 3 },
  /** Reaktive EU-Richtlinien (Europawahl, Ratsvorsitz, Random) */
  eu_reaktiv: { minLevel: 3 },
  /** Alle 6 EU-Events */
  eu_events_voll: { minLevel: 4 },
  /** Ratsvorsitz-Boni */
  eu_ratsvorsitz: { minLevel: 4 },
  /** SMA-273: Kommunal-Pilot als Vorstufe */
  kommunal_pilot: { minLevel: 2 },
  /** SMA-273: Länder-Pilot als Vorstufe */
  laender_pilot: { minLevel: 2 },
  /** SMA-273: Agenda-Tab sichtbar */
  gesetz_agenda: { minLevel: 3 },
  /** SMA-273: Parallele Vorstufen möglich */
  parallele_vorstufen: { minLevel: 3 },
  /** SMA-278: Wahlkampf ab Monat 43 */
  wahlkampf: { minLevel: 1 },
  /** Legislatur-Bilanz-Berechnung */
  legislatur_bilanz: { minLevel: 2 },
  /** Bilanz-Kommunikation im Wahlkampf */
  bilanz_kommunikation: { minLevel: 2 },
  /** TV-Duell in Monat 45/46 */
  tv_duell: { minLevel: 2 },
  /** Koalitionspartner-Alleingang (20% bei Beziehung < 50) */
  koalitionspartner_alleingang: { minLevel: 4 },
  /** Wahlnacht-Analyse (detaillierte Ergebnisanzeige) */
  wahlnacht_analyse: { minLevel: 3 },
  /** SMA-277: Medienklima-Index sichtbar und Drift */
  medienklima: { minLevel: 2 },
  /** SMA-277: Framing beim Gesetz-Einbringen */
  framing: { minLevel: 2 },
  /** SMA-277: Skandal-Events mit Cooldown */
  skandale: { minLevel: 2 },
  /** SMA-277: Pressemitteilung-Aktion (1× pro Monat, 5 PK) */
  pressemitteilung: { minLevel: 3 },
  /** SMA-277: Opposition als abstrakter Akteur */
  opposition: { minLevel: 3 },
  /** SMA-280: Extremismus-Eskalation (Koalitionspartner-Warnung, Verfassungsgericht) */
  extremismus_eskalation: { minLevel: 2 },
};

export function featureActive(complexity: number, key: string): boolean {
  return (FEATURES[key]?.minLevel ?? 1) <= complexity;
}
