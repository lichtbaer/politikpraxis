/**
 * SMA-327/SMA-329: Dynamisches Kabinett — Partei-gebundene Minister-Pools & Ressort-Vergabe
 * LP+SDP Koalition: Lehmann/Braun (CDP) sind automatisch ausgeschlossen, da nur Spieler- und Partner-Pools gewählt werden.
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

/** SMA-329: Ressort-Präferenzen pro Partei — Top-2 für Partner, Rest für Spieler. GP bekommt immer Umwelt. */
interface RessortPraeferenzen {
  /** Top-Präferenzen (Partner wählt Top-2 aus dieser Liste) */
  praeferenz: RessortId[];
}

const RESSORT_PRAEFERENZEN: Record<string, RessortPraeferenzen> = {
  gp: { praeferenz: ['umwelt', 'wirtschaft', 'justiz'] },
  sdp: { praeferenz: ['arbeit', 'finanzen', 'innen'] },
  cdp: { praeferenz: ['finanzen', 'innen', 'wirtschaft'] },
  ldp: { praeferenz: ['wirtschaft', 'finanzen', 'justiz'] },
  lp: { praeferenz: ['arbeit', 'justiz', 'umwelt'] },
};

/**
 * Kabinett-Größe pro Stufe **inklusive Kanzler/in** (SMA-328, `docs/game-design/komplexitaet.md`):
 * 1→2, 2→5, 3→7, 4→8. Minister = Größe − 1; die Kanzlerin/der Kanzler kommt in
 * `createInitialState` als synthetischer Char dazu.
 */
export const KABINETT_GROESSE: Record<number, number> = { 1: 2, 2: 5, 3: 7, 4: 8 };

/** Anzahl der Minister (ohne Kanzler/in) auf einer Stufe. */
export function anzahlMinister(complexity: number): number {
  return Math.max(0, (KABINETT_GROESSE[complexity] ?? 5) - 1);
}

export interface KabinettConfig {
  spielerRessorts: RessortId[];
  partnerRessorts: RessortId[];
}

/** Prüft, ob eine Partei für ein Ressort einen Pool-Minister hat (#481). */
export type HatMinister = (partei: string, ressort: RessortId) => boolean;

/** Ressorts in Wunschreihenfolge einer Partei: erst ihre Präferenzen, dann alle übrigen. */
function ressortReihenfolge(partei: string): RessortId[] {
  const praeferenz = RESSORT_PRAEFERENZEN[partei]?.praeferenz ?? [];
  return [...praeferenz, ...ALLE_RESSORTS.filter((r) => !praeferenz.includes(r))];
}

/**
 * Bildet die Ressort-Aufteilung zwischen Spieler-Partei und Koalitionspartner.
 * SMA-329: Partner wählt Top-2 aus Präferenz (wenn verfügbar), Spieler bekommt Rest.
 * GP als Partner bekommt immer Umwelt.
 * #481: Mit `hatMinister` werden Ressorts ohne Pool-Minister übersprungen und durch das
 * nächste Ressort der Reihenfolge ersetzt — sonst bliebe das Kabinett unter der Zielgröße.
 * @param spielerPartei Spieler-Partei-ID
 * @param koalitionspartner Koalitionspartner-Partei-ID (oder null bei Stufe 1)
 * @param complexity Komplexitätsstufe 1–4
 * @param hatMinister optional: nur Ressorts mit Pool-Minister vergeben
 */
export function bildeKabinett(
  spielerPartei: SpielerParteiId,
  koalitionspartner: KoalitionspartnerParteiId | null,
  complexity: number,
  hatMinister?: HatMinister,
): KabinettConfig {
  const minister = anzahlMinister(complexity);
  const besetzbar = (partei: string) => (r: RessortId) => !hatMinister || hatMinister(partei, r);

  if (!koalitionspartner) {
    const spielerRessorts = ressortReihenfolge(spielerPartei)
      .filter(besetzbar(spielerPartei))
      .slice(0, minister);
    return { spielerRessorts, partnerRessorts: [] };
  }

  const partnerRessorts = ressortReihenfolge(koalitionspartner)
    .filter(besetzbar(koalitionspartner))
    .slice(0, Math.min(2, minister));
  const spielerRessorts = ressortReihenfolge(spielerPartei)
    .filter((r) => !partnerRessorts.includes(r))
    .filter(besetzbar(spielerPartei))
    .slice(0, minister - partnerRessorts.length);

  // Reicht der Pool der Spieler-Partei nicht, übernimmt der Partner weitere Ressorts
  const offen = minister - partnerRessorts.length - spielerRessorts.length;
  if (offen > 0) {
    const zusatz = ressortReihenfolge(koalitionspartner)
      .filter((r) => !partnerRessorts.includes(r) && !spielerRessorts.includes(r))
      .filter(besetzbar(koalitionspartner))
      .slice(0, offen);
    partnerRessorts.push(...zusatz);
  }

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
