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

/** SMA-328: Ressort-Präferenzen pro Partei — muss/will/akzeptiert. GP bekommt immer Umwelt. */
interface RessortPraeferenzen {
  muss: RessortId[];
  will: RessortId[];
  akzeptiert: RessortId[];
}

const RESSORT_PRAEFERENZEN: Record<string, RessortPraeferenzen> = {
  sdp: { muss: ['arbeit'], will: ['finanzen', 'gesundheit'], akzeptiert: ['justiz'] },
  cdp: { muss: ['innen'], will: ['finanzen', 'wirtschaft'], akzeptiert: ['justiz'] },
  gp: { muss: ['umwelt'], will: ['wirtschaft', 'justiz'], akzeptiert: ['bildung'] },
  ldp: { muss: ['wirtschaft'], will: ['finanzen', 'justiz'], akzeptiert: ['digital'] },
  lp: { muss: ['arbeit'], will: ['gesundheit', 'wohnen'], akzeptiert: ['justiz'] },
};

/** Kabinett-Größe pro Stufe: 1→2, 2→5, 3→7, 4→8 (SMA-328) */
const KABINETT_GROESSE: Record<number, number> = { 1: 2, 2: 5, 3: 7, 4: 8 };

export interface KabinettConfig {
  spielerRessorts: RessortId[];
  partnerRessorts: RessortId[];
}

/**
 * Bildet die Ressort-Aufteilung zwischen Spieler-Partei und Koalitionspartner.
 * Partner bekommt muss + erstes will, Spieler den Rest. GP als Partner bekommt immer Umwelt.
 * @param spielerPartei Spieler-Partei-ID
 * @param koalitionspartner Koalitionspartner-Partei-ID (oder null bei Stufe 1)
 * @param complexity Komplexitätsstufe 1–4
 */
export function bildeKabinett(
  spielerPartei: SpielerParteiId,
  koalitionspartner: KoalitionspartnerParteiId | null,
  complexity: number
): KabinettConfig {
  const kabinettGroesse = KABINETT_GROESSE[complexity] ?? 5;

  if (!koalitionspartner) {
    const pref = RESSORT_PRAEFERENZEN[spielerPartei];
    const spielerRessorts = [
      ...(pref?.muss ?? []),
      ...(pref?.will ?? []).slice(0, 1),
      ...(pref?.akzeptiert ?? []),
    ]
      .filter((r, i, arr) => arr.indexOf(r) === i)
      .slice(0, kabinettGroesse) as RessortId[];
    return { spielerRessorts, partnerRessorts: [] };
  }

  const partnerPref = RESSORT_PRAEFERENZEN[koalitionspartner];
  const partnerRessorts: RessortId[] = [
    ...(partnerPref?.muss ?? []),
    ...(partnerPref?.will ?? []).slice(0, 1),
  ].filter((r, i, arr) => arr.indexOf(r) === i) as RessortId[];

  const spielerPref = RESSORT_PRAEFERENZEN[spielerPartei];
  const spielerVerfuegbar = ALLE_RESSORTS.filter((r) => !partnerRessorts.includes(r));
  const spielerRessorts = [
    ...(spielerPref?.muss ?? []).filter((r) => spielerVerfuegbar.includes(r)),
    ...(spielerPref?.will ?? []).filter((r) => spielerVerfuegbar.includes(r)),
    ...spielerVerfuegbar.filter((r) => !(spielerPref?.muss ?? []).includes(r) && !(spielerPref?.will ?? []).includes(r)),
  ]
    .filter((r, i, arr) => arr.indexOf(r) === i)
    .slice(0, kabinettGroesse - partnerRessorts.length) as RessortId[];

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
