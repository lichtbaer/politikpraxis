/**
 * SMA-390: Statische Medienakteure (spiegeln DB-Seed medien_akteure).
 * min_complexity: ab welcher Spielstufe der Akteur im State aktiv ist.
 */
export type MedienAkteurTyp =
  | 'oeffentlich'
  | 'boulevard'
  | 'qualitaet'
  | 'social'
  | 'konservativ'
  | 'alternativ';

export interface MedienAkteurContent {
  id: string;
  name_de: string;
  typ: MedienAkteurTyp;
  /** Start-Reichweite 0–100 */
  reichweite: number;
  stimmung_start: number;
  min_complexity: number;
}

export const DEFAULT_MEDIEN_AKTEURE: MedienAkteurContent[] = [
  { id: 'oeffentlich', name_de: 'Öffentliche Medien', typ: 'oeffentlich', reichweite: 35, stimmung_start: 5, min_complexity: 2 },
  { id: 'boulevard', name_de: 'BZ Today', typ: 'boulevard', reichweite: 25, stimmung_start: -5, min_complexity: 2 },
  { id: 'qualitaet', name_de: 'Das Panorama', typ: 'qualitaet', reichweite: 15, stimmung_start: 0, min_complexity: 3 },
  { id: 'social', name_de: 'TikFeed', typ: 'social', reichweite: 20, stimmung_start: 0, min_complexity: 2 },
  { id: 'konservativ', name_de: 'Nationale Stimme', typ: 'konservativ', reichweite: 10, stimmung_start: -10, min_complexity: 3 },
  { id: 'alternativ', name_de: 'WahrheitNow', typ: 'alternativ', reichweite: 5, stimmung_start: -20, min_complexity: 4 },
];
