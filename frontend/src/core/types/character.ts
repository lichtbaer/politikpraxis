/** Character-related types. */

import type { Ideologie } from './common';

export interface CharacterBonus {
  trigger: string;
  desc: string;
  applies: string;
}

export interface CharacterUltimatum {
  moodThresh: number;
  event: string;
}

export interface Character {
  id: string;
  name: string;
  role: string;
  initials: string;
  color: string;
  mood: number;
  loyalty: number;
  bio: string;
  /** SMA-294: Eingangszitat bei Char-Vorstellung */
  eingangszitat?: string;
  interests: string[];
  bonus: CharacterBonus;
  ultimatum: CharacterUltimatum;
  /** Ein-Wort-Charakterisierung für Onboarding */
  tag?: string;
  /** Mindest-Komplexitätsstufe, ab der der Char im Kabinett erscheint (default: 1) */
  min_complexity?: number;
  /** Ideologie-Profil für Kongruenz-Berechnung */
  ideologie?: Ideologie;
  /** SMA-288: Parteikürzel für Kanzler-Badge (z.B. SDP) */
  partei_kuerzel?: string;
  /** SMA-288: Parteifarbe für Badge */
  partei_farbe?: string;
  /** SMA-327: Partei-Pool (sdp, cdp, gp, ldp, lp) */
  pool_partei?: string;
  /** SMA-327: Primäres Ressort */
  ressort?: string;
  /** SMA-327: Ressort als Partner-Minister */
  ressort_partner?: string;
  /** SMA-327: Phasen-Agenda (JSON). SMA-330: phase2 für kontinuierliche Forderungen */
  agenda?: unknown;
  /** SMA-327: Ist Kanzler (Spieler) */
  ist_kanzler?: boolean;
  /** SMA-329: Partner-Minister (Juniorpartner) */
  ist_partner_minister?: boolean;
  /** SMA-329: Aktuelle Agenda-Stufe (0 = wartend) */
  agenda_stufe_aktuell?: number;
  /** SMA-329: Anzahl Ablehnungen in aktueller Stufe */
  agenda_ablehnungen?: number;
}

/** SMA-330: Minister-Agenda Status — kontinuierliche Erzählung */
export type AgendaStatus =
  | 'wartend'
  | 'erste_forderung'
  | 'wiederholung'
  | 'ultimatum'
  | 'erfuellt'
  | 'aufgegeben';

/** SMA-330: Laufender Agenda-State pro Minister */
export interface MinisterAgendaState {
  status: AgendaStatus;
  letzte_forderung_monat: number;
  ablehnungen_count: number;
}

/** SMA-330: Agenda-Config aus Content (phase2) */
export interface MinisterAgendaConfig {
  trigger_monat: number;
  wiederholung_intervall: number;
  max_ablehnungen: number;
  /** Gesetz-ID die gefordert wird (z.B. co2_steuer) */
  gesetz_ref_id?: string | null;
  /** fixed = ab Monat X, conditional = z.B. Saldo < -15 */
  trigger_type: 'fixed' | 'conditional';
  /** Bei conditional: Saldo-Schwelle in Mrd. (negativ) */
  saldo_schwelle?: number;
}
