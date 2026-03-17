/**
 * SMA-289: Spielbare Parteien — Startpunkte, Korridore, GP-Beziehung, Verbands-Boni.
 * SMA-299: GP als 5. spielbare Partei.
 */

import type { Ideologie } from '../../core/types';

export type SpielerParteiId = 'sdp' | 'cdp' | 'ldp' | 'lp' | 'gp';

export interface SpielerPartei {
  id: SpielerParteiId;
  kuerzel: string;
  farbe: string;
  name: string;
  /** Kurzbeschreibung (1 Zeile) */
  beschreibung: string;
  /** Kernthemen (3 Stichworte) */
  kernthemen: string[];
}

/** Ideologie-Korridor: [min, max] pro Achse */
export interface IdeologieKorridor {
  w: [number, number];
  g: [number, number];
  s: [number, number];
}

/** Partei-Startpunkte für Ideologie (aus Issue SMA-289) */
export const PARTEI_STARTPUNKTE: Record<SpielerParteiId, Ideologie> = {
  sdp: { wirtschaft: -40, gesellschaft: -20, staat: -40 },
  cdp: { wirtschaft: 20, gesellschaft: 30, staat: 20 },
  ldp: { wirtschaft: 60, gesellschaft: -10, staat: 60 },
  lp: { wirtschaft: -65, gesellschaft: -40, staat: -60 },
  gp: { wirtschaft: -50, gesellschaft: -70, staat: -20 },
};

/** Partei-Korridore für Feinjustierung (Stufe 3+) */
export const PARTEI_KORRIDORE: Record<SpielerParteiId, IdeologieKorridor> = {
  sdp: { w: [-65, -15], g: [-50, 10], s: [-65, -15] },
  cdp: { w: [-10, 55], g: [0, 65], s: [-10, 55] },
  ldp: { w: [30, 70], g: [-40, 20], s: [30, 70] },
  lp: { w: [-70, -45], g: [-65, -15], s: [-70, -40] },
  gp: { w: [-70, -30], g: [-70, -40], s: [-50, 0] },
};

/** GP-Beziehungs-Start je Spieler-Partei (SMA-289) — Fallback wenn Partner nicht aus Profil */
export const PARTEI_GP_BEZIEHUNG_START: Record<SpielerParteiId, number> = {
  sdp: 65,
  cdp: 45,
  ldp: 50,
  lp: 55,
  gp: 50,
};

/** Verbands-Startbeziehungen: parteiId → verbandId → Bonus (additiv zu beziehung_start) */
export const PARTEI_VERBANDS_BONUS: Record<SpielerParteiId, Record<string, number>> = {
  sdp: { gbd: 10, bdi: -5 },
  cdp: { bdi: 10, sgd: 10, gbd: -5 },
  ldp: { bdi: 10, dwv: 10 },
  lp: { gbd: 15, bdi: -10 },
  gp: { gbd: 5, bdi: -10, sgd: -5, uvb: 15, dwv: 0, bvl: 5 },
};

/** Spielbare Parteien mit Anzeige-Daten */
export const SPIELBARE_PARTEIEN: SpielerPartei[] = [
  {
    id: 'sdp',
    kuerzel: 'SDP',
    farbe: '#e3000f',
    name: 'Sozialdemokratische Partei',
    beschreibung: 'Arbeit · Soziales · Gerechtigkeit',
    kernthemen: ['Arbeit', 'Soziales', 'Gerechtigkeit'],
  },
  {
    id: 'cdp',
    kuerzel: 'CDP',
    farbe: '#000000',
    name: 'Christlich-Demokratische Partei',
    beschreibung: 'Wirtschaft · Sicherheit · Familie',
    kernthemen: ['Wirtschaft', 'Sicherheit', 'Familie'],
  },
  {
    id: 'ldp',
    kuerzel: 'LDP',
    farbe: '#ffed00',
    name: 'Liberal-Demokratische Partei',
    beschreibung: 'Freiheit · Digitalisierung · Eigenverantwortung',
    kernthemen: ['Freiheit', 'Digitalisierung', 'Eigenverantwortung'],
  },
  {
    id: 'lp',
    kuerzel: 'LP',
    farbe: '#be3075',
    name: 'Linke Partei',
    beschreibung: 'Umverteilung · Frieden · Grundsicherung',
    kernthemen: ['Umverteilung', 'Frieden', 'Grundsicherung'],
  },
  {
    id: 'gp',
    kuerzel: 'GP',
    farbe: '#46962B',
    name: 'Grüne Partei',
    beschreibung: 'Klima · Umwelt · Nachhaltigkeit',
    kernthemen: ['Klima', 'Umwelt', 'Nachhaltigkeit'],
  },
];
