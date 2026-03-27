/** SMA-396: Diff für die Monatszusammenfassung (vorher/nachher ein Monats-Tick) */

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
    delta: number;
    grund: string;
  }>;

  events_ausgeloest: string[];
}
