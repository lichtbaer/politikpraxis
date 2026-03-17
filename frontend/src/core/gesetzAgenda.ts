/**
 * SMA-293: Gesetz-Agenda — Clustering nach Politikfeld + personalisierte Reihenfolge nach Ideologie.
 * Sortierung: Politikfelder nach durchschnittlicher Kongruenz, Gesetze innerhalb Feld nach Kongruenz.
 */
import type { Law, Ideologie, Politikfeld } from './types';
import { gesetzKongruenz } from './ideologie';

/** Politikfeld-Icons (SMA-293) */
export const POLITIKFELD_ICONS: Record<string, string> = {
  wirtschaft_finanzen: '📊',
  arbeit_soziales: '👷',
  umwelt_energie: '🌱',
  innere_sicherheit: '🔒',
  bildung_forschung: '🎓',
  gesundheit_pflege: '🏥',
  digital_infrastruktur: '💻',
  landwirtschaft: '🌾',
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
