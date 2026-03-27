/** SMA-396: Diff für die Monatszusammenfassung (vorher/nachher ein Monats-Tick) */

import type { MedienAkteurTyp } from '../../data/defaults/medienAkteure';
import type { MedienSpielerPerspektive } from '../medienSpielerPerspektive';

export interface MonatsDiff {
  monat: number;

  beschlosseneGesetze: string[];
  gescheiterteGesetze: string[];
  eingebrachteGesetze: string[];

  wahlprognose_delta: number;
  medienklima_delta: number;
  saldo_delta: number;
  koalition_delta: number;
  pk_delta: number;

  wahlprognose_vor: number;
  wahlprognose_nach: number;
  medienklima_vor: number;
  medienklima_nach: number;
  saldo_vor: number;
  saldo_nach: number;
  koalition_vor: number;
  koalition_nach: number;

  milieu_deltas: Record<string, number>;

  medien_highlights: Array<{
    akteurId: string;
    akteurLabel: string;
    /** Roh-Delta (z. B. Stimmung oder Reichweite) */
    delta: number;
    /** SMA-407: ob das für die Regierung (Spieler) eher gut oder schlecht ist */
    spieler_perspektive: MedienSpielerPerspektive;
    akteur_typ: MedienAkteurTyp;
    /** SMA-407: 'stimmung' | 'reichweite' — bestimmt Tooltip-Text */
    delta_bedeutung: 'stimmung' | 'reichweite';
    grund: string;
  }>;

  events_ausgeloest: string[];
}
