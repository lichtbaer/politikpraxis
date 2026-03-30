/**
 * SMA-293: Gesetz-Agenda — Clustering nach Politikfeld + personalisierte Reihenfolge nach Ideologie.
 * Sortierung: Politikfelder nach durchschnittlicher Kongruenz, Gesetze innerhalb Feld nach Kongruenz.
 *
 * Koalitions-Klassifizierung: Gesetze werden anhand des Koalitionsvertrags-Profils und der
 * Schlüsselthemen des Partners in 3 Stufen eingeteilt: priorisiert · moeglich · abgelehnt.
 */
import type { Law, Ideologie, Politikfeld, KoalitionsStanz } from './types';
import { gesetzKongruenz, berechneKongruenz } from './ideologie';

const DEFAULT_IDEOLOGIE: Ideologie = { wirtschaft: 0, gesellschaft: 0, staat: 0 };

/**
 * Klassifiziert ein Gesetz nach seiner Koalitionsvertrag-Kongruenz.
 * - priorisiert: Gesetz-ID oder Politikfeld ist explizit in den Schlüsselthemen des Partners
 * - moeglich: Kongruenz mit dem Koalitionsvertrag-Profil ≥ 50
 * - abgelehnt: Kongruenz < 50 (koalitionskritisch)
 */
export function getKoalitionsStanz(
  law: Law,
  koalitionsvertragProfil: Ideologie,
  schluesselthemen: string[],
): KoalitionsStanz {
  const imVertrag = schluesselthemen.some(
    (t) => t === law.id || t === law.politikfeldId,
  );
  if (imVertrag) return 'priorisiert';

  const kongruenz = berechneKongruenz(
    koalitionsvertragProfil,
    law.ideologie ?? DEFAULT_IDEOLOGIE,
  );
  return kongruenz >= 60 ? 'moeglich' : 'abgelehnt';
}

/**
 * Gruppiert Gesetze nach KoalitionsStanz.
 * Innerhalb jeder Gruppe nach Kongruenz absteigend sortiert.
 */
export function gruppiereNachKoalitionsStanz(
  gesetze: Law[],
  koalitionsvertragProfil: Ideologie,
  schluesselthemen: string[],
): Record<KoalitionsStanz, Law[]> {
  const result: Record<KoalitionsStanz, Law[]> = {
    priorisiert: [],
    moeglich: [],
    abgelehnt: [],
  };
  for (const law of gesetze) {
    const stanz = getKoalitionsStanz(law, koalitionsvertragProfil, schluesselthemen);
    result[stanz].push(law);
  }
  // Innerhalb jeder Gruppe nach Kongruenz sortieren
  const sortByKongruenz = (laws: Law[]) =>
    laws.sort(
      (a, b) =>
        berechneKongruenz(koalitionsvertragProfil, b.ideologie ?? DEFAULT_IDEOLOGIE) -
        berechneKongruenz(koalitionsvertragProfil, a.ideologie ?? DEFAULT_IDEOLOGIE),
    );
  result.priorisiert = sortByKongruenz(result.priorisiert);
  result.moeglich = sortByKongruenz(result.moeglich);
  result.abgelehnt = sortByKongruenz(result.abgelehnt);
  return result;
}

/** Politikfeld-Icon-Keys — aufgelöst via POLITIKFELD_ICONS aus ui/icons.tsx */
export const POLITIKFELD_ICON_KEYS: Record<string, string> = {
  wirtschaft_finanzen: 'wirtschaft_finanzen',
  arbeit_soziales: 'arbeit_soziales',
  umwelt_energie: 'umwelt_energie',
  innere_sicherheit: 'innere_sicherheit',
  bildung_forschung: 'bildung_forschung',
  gesundheit_pflege: 'gesundheit_pflege',
  digital_infrastruktur: 'digital_infrastruktur',
  landwirtschaft: 'landwirtschaft',
};

const FALLBACK_FELD_ID = '_ohne_feld';

/** Gruppiert Gesetze nach Politikfeld, sortiert Felder und Gesetze nach Kongruenz. */
export function gruppiereNachPolitikfeld(
  gesetze: Law[],
  politikfelder: Politikfeld[],
  ausrichtung: Ideologie,
): { feldId: string; gesetze: Law[]; avgKongruenz: number }[] {
  const byFeld = new Map<string, Law[]>();
  for (const g of gesetze) {
    const feldId = g.politikfeldId ?? FALLBACK_FELD_ID;
    const arr = byFeld.get(feldId) ?? [];
    arr.push(g);
    byFeld.set(feldId, arr);
  }

  const feldIds = new Set<string>();

  for (const f of politikfelder) {
    const laws = byFeld.get(f.id);
    if (laws && laws.length > 0) feldIds.add(f.id);
  }

  for (const [feldId] of byFeld) {
    if (feldId !== FALLBACK_FELD_ID) feldIds.add(feldId);
  }

  const result: { feldId: string; gesetze: Law[]; avgKongruenz: number }[] = [];

  for (const feldId of feldIds) {
    let laws = byFeld.get(feldId) ?? [];
    laws = [...laws].sort((a, b) => {
      const ka = gesetzKongruenz(ausrichtung, a);
      const kb = gesetzKongruenz(ausrichtung, b);
      return kb - ka;
    });
    const avgKongruenz =
      laws.length > 0
        ? laws.reduce((s, l) => s + gesetzKongruenz(ausrichtung, l), 0) / laws.length
        : 0;
    result.push({ feldId, gesetze: laws, avgKongruenz });
  }

  result.sort((a, b) => b.avgKongruenz - a.avgKongruenz);
  return result;
}

/** Top-3 Gesetze global nach Kongruenz (für Empfohlen-Badge). */
export function getTop3Empfohlen(
  gesetze: Law[],
  ausrichtung: Ideologie,
): Set<string> {
  if (gesetze.length === 0) return new Set();
  const sorted = [...gesetze]
    .map((law) => ({ law, kongruenz: gesetzKongruenz(ausrichtung, law) }))
    .sort((a, b) => b.kongruenz - a.kongruenz);
  return new Set(sorted.slice(0, 3).map(({ law }) => law.id));
}
