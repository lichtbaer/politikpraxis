/**
 * SMA-327: Dynamisches Kabinett — Partei-gebundene Minister-Pools & Ressort-Vergabe
 */

import type { KoalitionspartnerParteiId } from './types';
import type { SpielerParteiId } from '../data/defaults/parteien';

/** Alle verfügbaren Ressorts */
export const ALLE_RESSORTS = [
  'arbeit',
  'soziales',
  'justiz',
  'bildung',
  'finanzen',
  'innen',
  'wirtschaft',
  'umwelt',
  'digital',
  'wohnen',
  'gesundheit',
] as const;

export type RessortId = (typeof ALLE_RESSORTS)[number];

/** Ressort-Präferenzen pro Partei (Reihenfolge = Priorität) */
const RESSORT_PRAEFERENZEN: Record<string, RessortId[]> = {
  sdp: ['arbeit', 'soziales', 'justiz', 'bildung', 'finanzen'],
  cdp: ['innen', 'finanzen', 'wirtschaft', 'justiz', 'bildung'],
  gp: ['umwelt', 'wirtschaft', 'justiz', 'bildung', 'digital'],
  ldp: ['wirtschaft', 'finanzen', 'digital', 'justiz', 'innen'],
  lp: ['arbeit', 'soziales', 'umwelt', 'justiz', 'wohnen'],
};

export interface KabinettConfig {
  spielerRessorts: RessortId[];
  partnerRessorts: RessortId[];
}

/**
 * Bildet die Ressort-Aufteilung zwischen Spieler-Partei und Koalitionspartner.
 * Partner bekommt seine bevorzugten Ressorts, Spieler den Rest.
 * @param spielerPartei Spieler-Partei-ID
 * @param koalitionspartner Koalitionspartner-Partei-ID (oder null bei Stufe 1)
 * @param complexity Komplexitätsstufe 1–4
 */
export function bildeKabinett(
  spielerPartei: SpielerParteiId,
  koalitionspartner: KoalitionspartnerParteiId | null,
  complexity: number
): KabinettConfig {
  const partnerAnzahl = [0, 0, 2, 3, 3][complexity] ?? 0;
  const spielerAnzahl = [2, 2, 4, 4, 5][complexity] ?? 4;

  if (partnerAnzahl === 0 || !koalitionspartner) {
    const praeferenzen = RESSORT_PRAEFERENZEN[spielerPartei] ?? ALLE_RESSORTS;
    const spielerRessorts = praeferenzen.slice(0, spielerAnzahl) as RessortId[];
    return { spielerRessorts, partnerRessorts: [] };
  }

  const partnerPraeferenzen = RESSORT_PRAEFERENZEN[koalitionspartner] ?? [];
  const partnerRessorts = partnerPraeferenzen.slice(0, partnerAnzahl) as RessortId[];

  const spielerPraeferenzen = RESSORT_PRAEFERENZEN[spielerPartei] ?? [...ALLE_RESSORTS];
  const verfuegbar = ALLE_RESSORTS.filter((r) => !partnerRessorts.includes(r));
  const spielerRessorts = [
    ...spielerPraeferenzen.filter((r) => verfuegbar.includes(r)),
    ...verfuegbar.filter((r) => !spielerPraeferenzen.includes(r)),
  ].slice(0, spielerAnzahl) as RessortId[];

  return { spielerRessorts, partnerRessorts };
}

/**
 * Wählt einen Minister aus dem Pool für ein Ressort.
 * Bevorzugt Chars mit pool_partei und passendem ressort.
 */
export function waehleMinisterAusPool(
  chars: Array<{ id: string; pool_partei?: string; ressort?: string; ressort_partner?: string }>,
  partei: string,
  ressort: RessortId
): { id: string } | null {
  const kandidaten = chars.filter(
    (c) =>
      c.pool_partei === partei &&
      !(c as { ist_kanzler?: boolean }).ist_kanzler &&
      (c.ressort === ressort || c.ressort_partner === ressort)
  );
  if (kandidaten.length > 0) {
    return { id: kandidaten[0].id };
  }
  return null;
}
