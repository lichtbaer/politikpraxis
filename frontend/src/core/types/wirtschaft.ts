/** SMA-404: Wirtschaftssektoren, Makroindikatoren, verzögerte Sektor-Effekte */

export type WirtschaftSektorId = 'industrie' | 'arbeit' | 'konsum' | 'gruen' | 'finanz';

export interface SektorZustand {
  zustand: number;
  trend: number;
}

export interface SektorEffekt {
  sektor: string;
  delta: number;
  verzoegerung_monate: number;
}

export interface WirtschaftIndikatorenSnapshot {
  monat: number;
  bip: number;
  inflation: number;
  arbeitslosigkeit: number;
  investitionsklima: number;
}

export interface WirtschaftsState {
  bip_wachstum: number;
  inflation: number;
  arbeitslosigkeit: number;
  investitionsklima: number;
  sektoren: Record<string, SektorZustand>;
  indikatoren_verlauf: WirtschaftIndikatorenSnapshot[];
  /** Geplante Zustandsänderungen: greifen im angegebenen Spielmonat */
  pendingSektorDeltas: Array<{ sektor: string; delta: number; wirkungMonat: number }>;
  /** Letzte BIP-Wachstumswerte (monatlich) für Arbeitslosigkeits-Lag */
  bip_wachstum_history: number[];
  /** Cooldown je Logik-Schlüssel (Monat, ab dem erneut geloggt werden darf) */
  sektorVerbandCooldown?: Record<string, number>;
}
