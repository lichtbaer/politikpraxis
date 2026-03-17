/**
 * Zentrale Spielkonstanten.
 * Magic Numbers aus Engine, Haushalt, Kongruenz, Milieus, Bundesrat etc.
 */

// --- PK (Politik-Kapital) ---
/** Divisor für PK-Regen: PK = floor(Zustimmung / PK_REGEN_DIVISOR) */
export const PK_REGEN_DIVISOR = 25;
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
/** Basis-Pflichtausgaben (SMA-309: 240 für realistischer Druck) */
export const PFLICHTAUSGABEN_BASIS = 240;
/** Defizit-Grenze für milde Schuldenbremse (ab -18: stark) */
export const SCHULDENBREMSE_DEFIZIT_MILD = -18;

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
/** Beziehung ab der Verbandskonflikt-Malus greift */
export const VERBAND_KONFLIKT_BEZIEHUNG = 40;

// --- Zeit / Wahlkampf (Platzhalter für zukünftige Features) ---
/** Wahlkampf startet typischerweise Monat 43 */
export const WAHLKAMPF_START_MONAT = 43;
/** TV-Duell typischerweise Monat 45 */
export const TV_DUELL_MONAT = 45;
/** Zeitdruck-Warnung ab Monat 45 (Vorstufe endet) */
export const ZEITDRUCK_WARNUNG_MONAT = 45;
