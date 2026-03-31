/** Political entity types: Bundesrat, Milieu, Verbände, Koalition. */

import type { Ideologie, KpiDelta } from './common';

/** SMA-395: Rohdaten aus GET /content/bundeslaender */
export interface BundeslandContent {
  id: string;
  name: string;
  partei: string | null;
  koalition: string[];
  bundesrat_fraktion: 'union' | 'spd_gruene' | 'fdp' | 'gemischt';
  wirtschaft_typ: 'stark' | 'mittel' | 'schwach';
  themen: string[];
  beziehung_start: number;
  stimmgewicht: number;
  min_complexity: number;
}

export interface BundesratLand {
  id: string;
  name: string;
  mp: string;
  party: string;
  alignment: 'koalition' | 'neutral' | 'opposition';
  mood: number;
  interests: string[];
  votes: number;
  /** SMA-395 */
  regierungPartei?: string;
  koalition?: string[];
  bundesratFraktion?: 'union' | 'spd_gruene' | 'fdp' | 'gemischt';
  wirtschaft?: 'stark' | 'mittel' | 'schwach';
  themen?: string[];
  stimmgewicht?: number;
  profilMinComplexity?: number;
}

export interface Tradeoff {
  id: string;
  label: string;
  desc: string;
  effect: Partial<KpiDelta>;
  charMood?: Record<string, number>;
}

/** Schicht 1 = PK-Investition, 2 = Trade-off, beziehungspflege = außerhalb Fenster, reparatur = bei Beziehung 0-19 */
export type LobbySchicht = 1 | 2 | 'beziehungspflege' | 'reparatur';

/** Optionen für Schicht 2 (Trade-off) */
export interface LobbyTradeoffOptions {
  action: 'annehmen' | 'ablehnen' | 'gegenvorschlag';
  tradeoffId: string;
}

export interface BundesratFraktion {
  id: string;
  name: string;
  sprecher: {
    name: string;
    partei: string;
    land: string;
    initials: string;
    color: string;
    bio: string;
    quote?: string;
  };
  laender: string[];
  basisBereitschaft: number;
  beziehung: number;
  tradeoffPool: Tradeoff[];
  sonderregel?: string;
  reparaturEndMonth?: number;
}

/** Milieu-Daten aus Content (Ideologie, min_complexity) */
export interface Milieu {
  id: string;
  ideologie: Ideologie;
  min_complexity: number;
  gewicht?: number;
  basisbeteiligung?: number;
  kurz?: string;
  beschreibung?: string;
}

/** Politikfeld mit Verbands-Zuordnung */
export interface Politikfeld {
  id: string;
  verbandId: string | null;
  druckEventId?: string | null;
}

/** Partei-ID für Koalitionspartner (SMA-299: Dynamisch) */
export type KoalitionspartnerParteiId = 'sdp' | 'cdp' | 'gp' | 'ldp' | 'lp';

/** Koalitionspartner-State im GameState */
export interface KoalitionspartnerState {
  id: KoalitionspartnerParteiId;
  beziehung: number;
  koalitionsvertragScore: number;
  schluesselthemenErfuellt: string[];
}

/** Koalitionspartner-Content (Daten des Partners) */
export interface KoalitionspartnerContent {
  id: KoalitionspartnerParteiId;
  name: string;
  sprecher: string;
  partei_kuerzel?: string;
  partei_farbe?: string;
  ideologie: Ideologie;
  beziehung_start: number;
  bt_stimmen: number;
  kernmilieus: string[];
  kernverbaende: string[];
  schluesselthemen: string[];
  forderungen?: PartnerForderung[];
}

/** Partner-Forderung für Zugeständnis-Aktion */
export interface PartnerForderung {
  id: string;
  label: string;
  effekte: { hh?: number; zf?: number; gi?: number; al?: number };
}

/** Verband (Wirtschaftsverband, Lobby) — ab Stufe 3 */
export interface Verband {
  id: string;
  kurz: string;
  name?: string;
  politikfeld_id: string;
  beziehung_start: number;
  tradeoffs?: VerbandTradeoff[];
  staerke_eu?: number;
}

/** Trade-off eines Verbands */
export interface VerbandTradeoff {
  key: string;
  cost_pk?: number;
  effekte: Partial<KpiDelta>;
  feld_druck_delta: number;
  medienklima_delta?: number;
  verband_effekte?: Record<string, number>;
  label?: string;
  desc?: string;
}

/** Ministerial-Initiative (Minister bringt eigenes Gesetz ein) */
export interface MinisterialInitiative {
  id: string;
  char_id: string;
  gesetz_ref_id: string;
  cooldown_months: number;
  bedingungen?: Array<{ type: string; value?: number | string }>;
}

/** SMA-289: Spieler-Partei (im gesamten Spiel sichtbar) */
export interface SpielerParteiState {
  id: 'sdp' | 'cdp' | 'ldp' | 'lp' | 'gp';
  kuerzel: string;
  farbe: string;
  name: string;
}

/** Opposition als abstrakter Akteur (SMA-277) */
export interface OppositionState {
  staerke: number;
  aktivesThema: string | null;
  letzterAngriff: number;
}

/** EU-Event-Content für reaktive Richtlinien */
export interface EUEventContent {
  id: string;
  politikfeld_id: string | null;
  trigger_klima_min: number | null;
  min_complexity: number;
}
