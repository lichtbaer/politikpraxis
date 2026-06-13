/** SMA-396: Diff für die Monatszusammenfassung (vorher/nachher ein Monats-Tick) */

import type { MedienAkteurTyp } from '../../data/defaults/medienAkteure';
import type { MedienSpielerPerspektive } from '../medienSpielerPerspektive';
import type { KPI } from './common';

/** Issue #209: harte Zahlenänderung vs. narratives Event */
export type UrsacheArt = 'zahl' | 'narrativ';

/**
 * Issue #209: Kategorie einer Monatsursache. tickLog-Quellen (gesetzwirkung,
 * haushalt, konjunktur) und High-Level-Metriken (zustimmung, medienklima,
 * koalition, pk, saldo) sind harte Zahlen; `event` ist narrativ.
 */
export type UrsacheKategorie =
  | 'gesetzwirkung'
  | 'haushalt'
  | 'konjunktur'
  | 'zustimmung'
  | 'medienklima'
  | 'koalition'
  | 'pk'
  | 'saldo'
  | 'event';

/**
 * Issue #209: Eine priorisierte Ursache eines Monats — erklärt verständlich,
 * warum sich Werte verändert haben. Keine neue Spielmechanik, nur Aufbereitung
 * bestehender Simulationsdaten (tickLog + MonatsDiff-Deltas + Events).
 */
export interface MonatsUrsache {
  kategorie: UrsacheKategorie;
  art: UrsacheArt;
  /** betroffener KPI bei tickLog-Ursachen (al|hh|gi|zf), sonst undefined */
  kpi?: keyof KPI;
  /** gerichtete Stärke; bei narrativen Events 0 → über `gewicht` einsortiert */
  delta: number;
  /** Sortier-/Anzeige-Gewicht = |delta| (Events erhalten festes Mindestgewicht) */
  gewicht: number;
  /** optionale Roh-Referenz (z. B. Event-ID) für i18n/Label im UI */
  refId?: string;
  /** aufgelöster Klartext-Titel (z. B. Event-Titel); sonst i18n im UI */
  label?: string;
}

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

  /**
   * Issue #209: nach Relevanz (|delta|) sortierte Top-Ursachen des Monats.
   * Leeres Array → Monat ohne relevante Änderung (UI zeigt Neutral-Meldung).
   */
  topUrsachen: MonatsUrsache[];
}
