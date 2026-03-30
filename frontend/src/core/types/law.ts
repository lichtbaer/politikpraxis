/** Law-related types. */

import type { Ideologie } from './common';
import type { SektorEffekt } from './wirtschaft';

export interface LawEffects {
  hh?: number;
  zf?: number;
  gi?: number;
  al?: number;
}

export type LawStatus = 'entwurf' | 'eingebracht' | 'aktiv' | 'blockiert' | 'beschlossen' | 'ausweich' | 'bt_passed' | 'br_einspruch';

/** Klassifizierung eines Gesetzes nach Koalitionsvertrag-Kongruenz */
export type KoalitionsStanz = 'priorisiert' | 'moeglich' | 'abgelehnt';

/** SMA-304: Eingebrachtes Gesetz in Ausschussphase (lag_months bis Abstimmung) */
export interface EingebrachteGesetz {
  gesetzId: string;
  eingebrachtMonat: number;
  abstimmungMonat: number;
  lagMonths: number;
  /** Fraktionssitzung abgehalten — Abweichler-Risiko halbiert */
  fraktionssitzungGehalten?: boolean;
}
export type RouteType = 'eu' | 'land' | 'kommune';
export type LawTag = 'bund' | 'eu' | 'land' | 'kommune' | 'kommunen';

/** Lobby-Status pro Fraktion pro Gesetz */
export interface LawLobbyFraktion {
  pkInvestiert: boolean;
  tradeoffAngenommen?: boolean;
  tradeoffAblehnen?: boolean;
  tradeoffGegenvorschlag?: boolean;
}

/** Framing-Option für Gesetz-Einbringen (SMA-303: label, slogan) */
export interface FramingOption {
  key: string;
  /** Anzeigename (z.B. "Sozialer Ausgleich") */
  label?: string;
  /** Kurzer Slogan/Satz (z.B. "Faire Löhne stärken den gesellschaftlichen Zusammenhalt") */
  slogan?: string;
  milieu_effekte: Record<string, number>;
  verband_effekte?: Record<string, number>;
  medienklima_delta: number;
}

export interface Law {
  id: string;
  titel: string;
  kurz: string;
  desc: string;
  tags: LawTag[];
  status: LawStatus;
  ja: number;
  nein: number;
  effekte: LawEffects;
  lag: number;
  expanded: boolean;
  route: RouteType | null;
  rprog: number;
  rdur: number;
  blockiert: 'bundestag' | 'bundesrat' | null;
  brVoteMonth?: number;
  lobbyFraktionen?: Record<string, LawLobbyFraktion>;
  kohlSabotageTriggered?: boolean;
  ideologie?: Ideologie;
  /** SMA-403: Skalare Links/Rechts-Lage (−100 … +100) für BT-Malus / Partner-Widerstand */
  ideologie_wert?: number | null;
  politikfeldId?: string | null;
  /** SMA-395: sekundäre Politikfelder für Themen-Match */
  politikfeldSekundaer?: string[];
  wirkungFaktor?: number;
  kosten_einmalig?: number;
  kosten_laufend?: number;
  einnahmeeffekt?: number;
  pflichtausgaben_delta?: number;
  investiv?: boolean;
  einbringungsLag?: number;
  kommunal_pilot_moeglich?: boolean;
  laender_pilot_moeglich?: boolean;
  eu_initiative_moeglich?: boolean;
  framing_optionen?: FramingOption[];
  lobby_mood_effekte?: Record<string, number>;
  lobby_pk_kosten?: number;
  lobby_gain_range?: { min: number; max: number };
  route_overrides?: Record<string, { cost?: number; dur?: number }>;
  min_complexity?: number;
  locked_until_event?: string;
  konjunktur_effekt?: number;
  konjunktur_lag?: number;
  /** SMA-404: verzögerte Effekte auf Wirtschaftssektoren */
  sektor_effekte?: SektorEffekt[];
  steuer_id?: string | null;
  steuer_delta?: number | null;
  zustimmungspflichtig?: boolean;
  brEinspruchEingelegt?: boolean;
}

/** Vorstufen-Boni (SMA-273): Akkumuliert aus erfolgreichen Vorstufen */
export interface VorstufenBoni {
  btStimmenBonus: number;
  pkKostenRabatt: number;
  kofinanzierung: number;
  bundesratBonus: number;
  medienRueckhalt: number;
}

/** Aktive Vorstufe (Kommunal, Länder, EU) — läuft bis fortschritt 100 */
export interface AktiveVorstufe {
  typ: 'kommunal' | 'laender' | 'eu';
  startMonat: number;
  dauerMonate: number;
  fortschritt: number;
  erfolgschance: number;
  abgeschlossen: boolean;
  ergebnis?: 'erfolg' | 'scheitern';
  stadttyp?: 'progressiv' | 'konservativ' | 'industrie';
  stadtname?: string;
  fraktionId?: string;
}

/** Gesetz-Projekt mit Vorstufen und akkumulierten Boni (SMA-273) */
export interface GesetzProjekt {
  gesetzId: string;
  status: 'vorbereitung' | 'bundesebene' | 'beschlossen' | 'gescheitert';
  aktiveVorstufen: AktiveVorstufe[];
  boni: VorstufenBoni;
}

/** SMA-312: Gesetz-Relation (requires, excludes, enhances) */
export interface GesetzRelation {
  typ: 'requires' | 'excludes' | 'enhances';
  targetId: string;
  beschreibung?: string;
  enhancesFaktor?: number;
}

/** SMA-336: Steuer-Content für Dashboard (aus SMA-335 Engine/DB) */
export interface SteuerContent {
  id: string;
  name_de: string;
  typ: 'direkt' | 'indirekt';
  aktueller_satz: number;
  einnahmen_basis: number;
  satz_delta?: number;
}
