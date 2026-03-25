/**
 * Zentrale Spielkonstanten.
 * Magic Numbers aus Engine, Haushalt, Kongruenz, Milieus, Bundesrat etc.
 * Alle spielrelevanten Schwellenwerte, Wahrscheinlichkeiten und Formelfaktoren
 * sollen hier definiert werden statt inline als Magic Numbers.
 */

// --- Utility ---
/** Begrenzt einen Wert auf [min, max] */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Hängt einen Wert an ein Array an und begrenzt auf maxLength (neueste behalten) */
export function trimHistory<T>(arr: T[], value: T, maxLength: number): T[] {
  const next = [...arr, value];
  return next.length > maxLength ? next.slice(-maxLength) : next;
}

// --- PK (Politik-Kapital) ---
/** Divisor für PK-Regen: PK = floor(Zustimmung / PK_REGEN_DIVISOR) */
export const PK_REGEN_DIVISOR = 25;
/** Minimum PK-Regen pro Monat — verhindert Handlungsunfähigkeit bei niedriger Zustimmung */
export const PK_REGEN_MIN = 3;
/** Maximale PK-Kapazität */
export const PK_MAX = 150;

// --- Kongruenz / Ideologie ---
/** Kongruenz-Gewichtung: Wirtschaft 40%, Gesellschaft 35%, Staat 25% */
export const KONGRUENZ_GEWICHT = { wirtschaft: 0.4, gesellschaft: 0.35, staat: 0.25 };
/** PK-Modifikator-Grenzen: Score ≥80: -3, ≥40: 0, ≥20: +8, <20: +12 */
export const KONGRUENZ_PK_SCHWELLEN = [80, 40, 20] as const;
export const KONGRUENZ_PK_MODS = [-3, 0, 8, 12] as const;

// --- Milieu-Zustimmung ---
/** Milieu-Delta-Grenzen: Score ≥75: +3, ≥55: +1, ≥25: -1, <25: -3 */
export const MILIEU_SCORE_SCHWELLEN = [75, 55, 25] as const;
export const MILIEU_DELTAS = [3, 1, -1, -3] as const;

// --- Gesetz-Vorstufen / Boni ---
/** Max. BT-Stimmen-Bonus in % */
export const MAX_BT_STIMMEN_BONUS = 25;
/** Max. PK-Kosten-Rabatt */
export const MAX_PK_KOSTEN_RABATT = 18;
/** Max. Kofinanzierung (0–1) */
export const MAX_KOFINANZIERUNG = 0.35;
/** Max. Bundesrat-Bonus in % */
export const MAX_BUNDESRAT_BONUS = 35;

// --- Haushalt ---
/** Basis-Einnahmen (jährlich) */
export const EINNAHMEN_BASIS = 350;
/** Basis-Pflichtausgaben (SMA-310: 370 — strukturelles Startdefizit, Einnahmen < Ausgaben) */
export const PFLICHTAUSGABEN_BASIS = 370;
/** Defizit-Grenze für milde Schuldenbremse (ab -18: stark) */
export const SCHULDENBREMSE_DEFIZIT_MILD = -18;
/** SMA-335: Schuldenbremse-Spielraum in Mrd./Jahr (~13) */
export const SCHULDENBREMSE_SPIELRAUM_BASIS = 13;

// --- Bundestag / Sitzverteilung (SMA-322) ---
/** Sitzanteil Koalition (Spieler + Partner) — typisch ~53%, nicht Koalitionsstabilität */
export const KOALITION_SITZANTEIL = 53;
/** Bundestag-Sitze gesamt (für Sitzverteilung Stufe 2+) */
export const BUNDESTAG_SITZE = 600;

// --- Wahl / Spielende ---
/** Standard-Wahlhürde in % */
export const DEFAULT_ELECTION_THRESHOLD = 40;
/** Min. Koalitionsstärke für Spielfortsetzung */
export const MIN_KOALITION_FORTGANG = 15;
/** Legislaturperiode in Monaten */
export const LEGISLATUR_MONATE = 48;

// --- Bundesrat ---
/** PK für Reparatur (Beziehung 0–19) */
export const PK_REPARATUR = 25;
/** Beziehung ab der Lobbying voll wirkt */
export const BEREITSCHAFT_TRADEOFF_BONUS = 40;
/** Beziehung ab der Verbandskonflikt-Malus greift (Partner reagiert) */
export const VERBAND_KONFLIKT_BEZIEHUNG = 40;
/** Beziehung unter der "Konflikt-Partner aktiv" angezeigt wird (SMA-315) */
export const VERBAND_KONFLIKT_SCHWELLE = 30;

// --- Zeit / Wahlkampf (Platzhalter für zukünftige Features) ---
/** Wahlkampf startet typischerweise Monat 43 */
export const WAHLKAMPF_START_MONAT = 43;
/** TV-Duell typischerweise Monat 45 */
export const TV_DUELL_MONAT = 45;
/** Zeitdruck-Warnung ab Monat 45 (Vorstufe endet) */
export const ZEITDRUCK_WARNUNG_MONAT = 45;

// --- Event-Wahrscheinlichkeiten ---
/** Chance pro Monat auf ein zufälliges Event */
export const RANDOM_EVENT_CHANCE = 0.22;
/** Chance auf Bundesrat-Landtagswahl (ab Monat 10) */
export const BR_LANDTAGSWAHL_CHANCE = 0.15;
/** Chance auf Bundesrat-Sprecher-Wechsel (ab Monat 24) */
export const BR_SPRECHER_WECHSEL_CHANCE = 0.2;
/** Chance auf Bundesrat-Initiative (ab Monat 18) */
export const BR_INITIATIVE_CHANCE = 0.25;
/** Chance auf Skandal-Event */
export const SKANDAL_CHANCE = 0.08;
/** Chance auf positives Medien-Event */
export const POSITIV_MEDIEN_CHANCE = 0.1;
/** Chance auf KPI-Drift (Arbeitslosigkeit) */
export const KPI_DRIFT_CHANCE = 0.25;

// --- Konjunktur-Index Grenzen ---
export const KONJUNKTUR_INDEX_MIN = -3;
export const KONJUNKTUR_INDEX_MAX = 3;

// --- History-Limits ---
/** Max. History-Länge in Monaten (4 Jahre) */
export const HISTORY_MAX_MONTHS = 48;
/** Max. KPI-/Haushalt-History für Trendanzeige (1 Jahr) */
export const KPI_HISTORY_MAX_MONTHS = 12;
/** Max. Log-Einträge */
export const MAX_LOG_ENTRIES = 60;

// --- Misstrauensvotum ---
/** Monate unter 20% Zustimmung bis zum Sturz */
export const MISSTRAUENSVOTUM_MONATE = 6;

// --- Zustimmung/Approval ---
/** Untere Grenze für allgemeine Zustimmung */
export const APPROVAL_MIN = 15;
/** Obere Grenze für allgemeine Zustimmung */
export const APPROVAL_MAX = 95;
/** Untere Grenze für Segment-Zustimmung (arbeit, mitte, prog) */
export const SEGMENT_APPROVAL_MIN = 10;

// --- Approval-Formel-Koeffizienten ---
/**
 * Basiswert der Zustimmungsformel.
 * w = APPROVAL_BASE + (10 - AL) × AL_FAKTOR + HH × HH_FAKTOR
 *   + (50 - GI) × GI_FAKTOR + (ZF - 50) × ZF_FAKTOR
 */
export const APPROVAL_BASE = 30;
/** Gewicht von Arbeitslosigkeit in der Zustimmungsformel (invers: niedrigere AL = höhere Zustimmung) */
export const APPROVAL_AL_FAKTOR = 1.3;
/** Gewicht des Haushalts in der Zustimmungsformel */
export const APPROVAL_HH_FAKTOR = 2.5;
/** Gewicht der Gini-Ungleichheit in der Zustimmungsformel */
export const APPROVAL_GI_FAKTOR = 0.25;
/** Gewicht der Zufriedenheit in der Zustimmungsformel */
export const APPROVAL_ZF_FAKTOR = 0.4;

// --- Einnahmen-Formel ---
/** AL-Referenzwert für Einnahmen-Berechnung (neutral bei AL = 5%) */
export const EINNAHMEN_AL_REFERENZ = 5;
/** AL-Koeffizient für Einnahmen (pro 1% über Referenz: -1.5% Einnahmen) */
export const EINNAHMEN_AL_KOEFFIZIENT = 0.015;
/** Konjunktur-Koeffizient für Einnahmen */
export const EINNAHMEN_KONJUNKTUR_KOEFFIZIENT = 0.02;
