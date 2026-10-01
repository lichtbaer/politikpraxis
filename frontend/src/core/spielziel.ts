/**
 * SMA-499: Dreistufiges Spielziel — Bilanz (30%), Agenda (35%), Historisches Urteil (35%).
 * Wiederwahl (Wahlhürde) ist ein kleiner Bonus auf die Gesamtpunkte, kein alleiniges Siegkriterium.
 *
 * Hinweis: Bilanz-Punkte kommen aus `wahlkampf` (kein Import hier → keine Zyklen).
 */

import type { ContentBundle, GameState, LegislaturBilanzNote, SpielzielErgebnis } from './types';
import { buildAgendaSidebarRows } from './agendaTracking';
import { clamp } from './constants';

const GEWICHT_BILANZ = 0.3;
const GEWICHT_AGENDA = 0.35;
const GEWICHT_URTEIL = 0.35;

/** Maximaler Zuschlag bei überschrittener Wahlhürde (Prozentpunkte auf Skala 0–100) */
export const SPIELZIEL_WAHLBONUS_MAX = 4;

/** Mindestpunkte für „erfolgreiche Legislatur“ (entspricht grob Note D) */
export const SPIELZIEL_ERFOLG_SCHWELLE = 40;

/**
 * #267: Bis zu dieser Stufe muss zusätzlich die komplette Spieler-Agenda erfüllt sein.
 * Auf Stufe 1 gehen Gesetze fast von selbst durch — Punkte allein trennten dort gutes von
 * zufälligem Spiel kaum (Median 81 vs. 65). Die zwei selbst gewählten Ziele sind das
 * sichtbare, verständliche Siegkriterium der Einstiegsstufe.
 */
export const SPIELZIEL_AGENDA_PFLICHT_BIS_STUFE = 1;

/**
 * Historisches Urteil wenn kein einziges Gesetz beschlossen wurde.
 * Vorher neutral 50 — dadurch erreichte komplette Passivität zusammen mit dem
 * Agenda-Default (55) fast die Erfolgsschwelle. Eine Regierung ohne ein
 * einziges Gesetz hinterlässt historisch ein schlechtes Urteil.
 */
export const URTEIL_OHNE_GESETZE = 25;

/** Gleiche Schwellen wie Legislatur-Bilanz (SMA-505) — für UI (Kanzlerbilanz, Auswertung). */
export function noteFromHundred(score: number): LegislaturBilanzNote {
  if (score >= 80) return 'A';
  if (score >= 60) return 'B';
  if (score >= 40) return 'C';
  if (score >= 20) return 'D';
  return 'F';
}

function ampelToScore(ampel: 'green' | 'yellow' | 'red'): number {
  if (ampel === 'green') return 100;
  if (ampel === 'yellow') return 55;
  return 15;
}

/**
 * Agenda-Anteil 0–100: Mittelwert über alle Spieler- und Koalitionsziele (Sidebar-Ampeln),
 * jedes Ziel gleich gewichtet. Vorher wurden die beiden Gruppen 50/50 gemittelt — ein einzelnes
 * (auf Stufe 2 oft schon zum Start erfülltes) Koalitionsziel zählte so viel wie die ganze
 * Spieler-Agenda. Ohne Agenda-Ziele: neutral 55.
 */
function agendaAnteilPunkte(state: GameState, content: ContentBundle): {
  punkte: number;
  spielerErfuellt: number;
  spielerGesamt: number;
  koalitionErfuellt: number;
  koalitionGesamt: number;
} {
  const rows = buildAgendaSidebarRows(state, content);
  const spieler = rows.filter((r) => r.source === 'spieler');
  const koalition = rows.filter((r) => r.source === 'koalition');

  const avg = (list: typeof rows): number | null => {
    if (list.length === 0) return null;
    const sum = list.reduce((a, r) => a + ampelToScore(r.ampel), 0);
    return sum / list.length;
  };

  const punkte = avg([...spieler, ...koalition]) ?? 55;

  return {
    punkte: clamp(Math.round(punkte), 0, 100),
    spielerErfuellt: spieler.filter((r) => r.erfuellt).length,
    spielerGesamt: spieler.length,
    koalitionErfuellt: koalition.filter((r) => r.erfuellt).length,
    koalitionGesamt: koalition.length,
  };
}

/**
 * Historisches Urteil 0–100: gewichteter Mittelwert der Content-Felder langzeit_score (0–10, Default 5)
 * je beschlossenem Gesetz, optional gewichtet mit wirkungFaktor.
 */
function urteilAnteilPunkte(state: GameState): { punkte: number; anzahl: number } {
  const beschlossen = state.gesetze.filter((g) => g.status === 'beschlossen');
  if (beschlossen.length === 0) return { punkte: URTEIL_OHNE_GESETZE, anzahl: 0 };

  let sum = 0;
  let wSum = 0;
  for (const g of beschlossen) {
    const raw = g.langzeit_score;
    const lz = raw != null && raw > 0 ? clamp(raw, 0, 10) : 5;
    const anteil = (lz / 10) * 100;
    const w = g.wirkungFaktor != null && g.wirkungFaktor > 0 ? g.wirkungFaktor : 1;
    sum += anteil * w;
    wSum += w;
  }
  return {
    punkte: clamp(Math.round(wSum > 0 ? sum / wSum : 50), 0, 100),
    anzahl: beschlossen.length,
  };
}

function gewichteteBasis(b: number, a: number, u: number): number {
  return GEWICHT_BILANZ * b + GEWICHT_AGENDA * a + GEWICHT_URTEIL * u;
}

/**
 * Kleiner Bonus wenn die Wahlprognose die Hürde überschreitet (linear bis Max).
 */
export function berechneWahlbonus(wahlergebnis: number, threshold: number): number {
  if (wahlergebnis < threshold) return 0;
  const span = Math.max(1, 100 - threshold);
  const raw = ((wahlergebnis - threshold) / span) * SPIELZIEL_WAHLBONUS_MAX;
  return clamp(Math.round(raw * 10) / 10, 0, SPIELZIEL_WAHLBONUS_MAX);
}

/**
 * @param bilanzPunkte 0–100 (finalisierte Legislatur-Bilanz oder berechnete Punkte)
 */
export function berechneSpielzielErgebnis(
  state: GameState,
  content: ContentBundle,
  bilanzPunkte: number,
  wahlbonus: number,
): SpielzielErgebnis {
  const b = clamp(bilanzPunkte, 0, 100);
  const ag = agendaAnteilPunkte(state, content);
  const ur = urteilAnteilPunkte(state);
  const basisPunkte = clamp(Math.round(gewichteteBasis(b, ag.punkte, ur.punkte)), 0, 100);
  const bonus = clamp(wahlbonus, 0, SPIELZIEL_WAHLBONUS_MAX);
  const gesamtpunkte = clamp(Math.round((basisPunkte + bonus) * 10) / 10, 0, 100);

  return {
    gesamtpunkte,
    gesamtnote: noteFromHundred(gesamtpunkte),
    bilanzPunkte: b,
    agendaPunkte: ag.punkte,
    urteilPunkte: ur.punkte,
    wahlbonus: bonus,
    agendaSpielerErfuellt: ag.spielerErfuellt,
    agendaSpielerGesamt: ag.spielerGesamt,
    agendaKoalitionErfuellt: ag.koalitionErfuellt,
    agendaKoalitionGesamt: ag.koalitionGesamt,
    beschlosseneGesetzeUrteil: ur.anzahl,
  };
}

/** Für die Erfolgsprüfung benötigte Felder des Spielziel-Ergebnisses. */
type LegislaturErfolgInput = Pick<
  SpielzielErgebnis,
  'gesamtpunkte' | 'beschlosseneGesetzeUrteil' | 'agendaSpielerErfuellt' | 'agendaSpielerGesamt'
>;

/** #482: Warum eine regulär beendete Legislatur das Spielziel verfehlt hat. */
export type LegislaturMisserfolgGrund = 'kein_gesetz' | 'agenda' | 'punkte';

/**
 * #482: Einzige Quelle für den Misserfolgsgrund einer regulär beendeten Legislatur
 * (genutzt von Erfolgsprüfung, Auswertungs-Screen und Balance-Simulation).
 * Prüfreihenfolge — der erste zutreffende Grund gewinnt:
 * 1. `kein_gesetz`: kein einziges beschlossenes Gesetz (#267),
 * 2. `agenda`: bis SPIELZIEL_AGENDA_PFLICHT_BIS_STUFE nicht alle Spieler-Agendaziele erfüllt,
 * 3. `punkte`: Gesamtpunkte unter SPIELZIEL_ERFOLG_SCHWELLE.
 * Liefert `null`, wenn die Legislatur erfolgreich war.
 */
export function legislaturMisserfolgGrund(
  ergebnis: LegislaturErfolgInput,
  complexity: number | undefined,
): LegislaturMisserfolgGrund | null {
  if (ergebnis.beschlosseneGesetzeUrteil <= 0) return 'kein_gesetz';
  if (agendaPflicht(complexity) && ergebnis.agendaSpielerErfuellt < ergebnis.agendaSpielerGesamt) {
    return 'agenda';
  }
  if (ergebnis.gesamtpunkte < SPIELZIEL_ERFOLG_SCHWELLE) return 'punkte';
  return null;
}

/**
 * Erfolgreiche Legislatur (#267):
 * - mindestens ein beschlossenes Gesetz — eine Regierung ohne ein einziges Gesetz gewinnt auf
 *   keiner Stufe, egal wie ruhig es sonst zuging,
 * - bis SPIELZIEL_AGENDA_PFLICHT_BIS_STUFE: alle Spieler-Agendaziele erfüllt,
 * - Gesamtpunkte ≥ SPIELZIEL_ERFOLG_SCHWELLE.
 * Details siehe `legislaturMisserfolgGrund` (#482).
 */
export function istLegislaturErfolg(
  ergebnis: LegislaturErfolgInput,
  complexity: number | undefined,
): boolean {
  return legislaturMisserfolgGrund(ergebnis, complexity) === null;
}

/** Muss auf dieser Stufe die komplette Spieler-Agenda erfüllt sein? */
export function agendaPflicht(complexity: number | undefined): boolean {
  return complexity != null && complexity <= SPIELZIEL_AGENDA_PFLICHT_BIS_STUFE;
}
