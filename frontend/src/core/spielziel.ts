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

/** Gleiche Schwellen wie Legislatur-Bilanz (SMA-505) */
function noteFromHundred(score: number): LegislaturBilanzNote {
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
 * Agenda-Anteil 0–100: Mittelwert aus Spieler- und Koalitionszielen (Sidebar-Ampeln).
 * Ohne Agenda-Ziele in beiden Kategorien: neutral 55.
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

  const aS = avg(spieler);
  const aK = avg(koalition);

  let punkte: number;
  if (aS != null && aK != null) punkte = (aS + aK) / 2;
  else if (aS != null) punkte = aS;
  else if (aK != null) punkte = aK;
  else punkte = 55;

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
  if (beschlossen.length === 0) return { punkte: 50, anzahl: 0 };

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

export function istLegislaturErfolg(gesamtpunkte: number): boolean {
  return gesamtpunkte >= SPIELZIEL_ERFOLG_SCHWELLE;
}
