/** Shared type primitives used across all domains. */

/** Ideologie-Profil (wirtschaft, gesellschaft, staat) — Werte -100 bis +100 */
export interface Ideologie {
  wirtschaft: number;
  gesellschaft: number;
  staat: number;
}

export interface KPI {
  al: number;
  hh: number;
  gi: number;
  zf: number;
}

/** Eintrag im Tick-Change-Log: erklärt, warum sich ein KPI-Wert geändert hat */
export interface TickLogEntry {
  source: string;
  target: keyof KPI;
  delta: number;
}

export interface Approval {
  g: number;
  arbeit: number;
  mitte: number;
  prog: number;
}

export interface PendingEffect {
  month: number;
  key: keyof KPI;
  delta: number;
  label: string;
  /** Stabile Quelle für Chart-Farben (Gesetz-ID); optional für ältere Spielstände */
  gesetzId?: string;
}

export interface LogEntry {
  time: string;
  msg: string;
  type: string;
  /** Optional params for i18n interpolation when msg is a translation key */
  params?: Record<string, string | number>;
}

/** KPI-Delta für Tradeoff-Effekte (hh, zf, gi, al) */
export interface KpiDelta {
  hh?: number;
  zf?: number;
  gi?: number;
  al?: number;
}

/** SMA-320: 10 Tabs — agenda, bundestag, kabinett, haushalt, medien, verbaende, bundesrat, laender, kommunen, eu */
export type ViewName =
  | 'agenda'
  | 'bundestag'
  | 'kabinett'
  | 'haushalt'
  | 'medien'
  | 'verbaende'
  | 'bundesrat'
  | 'laender'
  | 'kommunen'
  | 'eu'
  | 'wahlkampf';
export type SpeedLevel = 0 | 1;
