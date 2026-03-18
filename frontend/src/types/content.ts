/** API-Response-Typen für Content-Endpoints (/api/content/*) */

export interface Effekte {
  al: number;
  hh: number;
  gi: number;
  zf: number;
}

export interface IdeologieApi {
  wirtschaft: number;
  gesellschaft: number;
  staat: number;
}

export interface CharApi {
  id: string;
  initials: string;
  color: string;
  mood_start: number;
  loyalty_start: number;
  ultimatum_mood_thresh?: number | null;
  ultimatum_event_id?: string | null;
  bonus_trigger?: string | null;
  bonus_applies?: string | null;
  min_complexity?: number | null;
  name: string;
  role: string;
  bio: string;
  eingangszitat?: string | null;
  bonus_desc?: string | null;
  interests: string[];
  keyword?: string | null;
  ideologie?: IdeologieApi;
  /** SMA-288: Parteikürzel für Kanzler-Badge */
  partei_id?: string | null;
  partei_kuerzel?: string | null;
  partei_farbe?: string | null;
}

export interface GesetzApi {
  id: string;
  tags: string[];
  bt_stimmen_ja: number;
  effekte: Effekte;
  effekt_lag: number;
  foederalismus_freundlich: boolean;
  titel: string;
  kurz: string;
  desc: string;
  ideologie?: IdeologieApi;
  politikfeld_id?: string | null;
  /** SMA-268: Einmalige Haushaltskosten in Mrd. € */
  kosten_einmalig?: number;
  /** SMA-268: Laufende Haushaltskosten in Mrd. €/Jahr */
  kosten_laufend?: number;
  /** SMA-268: Einnahmeeffekt in Mrd. € (z.B. Steueränderung) */
  einnahmeeffekt?: number;
  /** SMA-310: Pflichtausgaben-Delta in Mrd. € (negativ = Kürzung bei Beschluss) */
  pflichtausgaben_delta?: number;
  /** Investitionsgesetz (+2 Mo. Lag) */
  investiv?: boolean;
  /** Kommunal-Pilot möglich (SMA-272), Länder/EU-Vorstufen (SMA-273) */
  kommunal_pilot_moeglich?: boolean;
  laender_pilot_moeglich?: boolean;
  eu_initiative_moeglich?: boolean;
  /** Lobby-Mood-Effekte: {char_id: mood_delta} bei Lobbying */
  lobby_mood_effekte?: Record<string, number>;
  /** PK-Kosten pro Lobbying-Aktion (Default 12) */
  lobby_pk_kosten?: number;
  /** Zustimmungs-Gain-Range bei Lobbying (Default {min: 2, max: 6}) */
  lobby_gain_range?: { min: number; max: number };
  /** Gesetzspezifische Route-Kosten/Dauer-Overrides */
  route_overrides?: Record<string, { cost?: number; dur?: number }>;
}

export interface MilieuApi {
  id: string;
  ideologie: IdeologieApi;
  min_complexity: number;
  gewicht?: number;
  basisbeteiligung?: number;
  kurz?: string;
  /** Aus milieus_i18n (kurzcharakter) */
  kurzcharakter?: string;
  /** Aus milieus_i18n */
  name?: string;
  beschreibung?: string;
}

export interface PolitikfeldApi {
  id: string;
  verband_id?: string | null;
  druck_event_id?: string | null;
}

export interface VerbandTradeoffApi {
  key: string;
  cost_pk?: number;
  effekte: { al?: number; hh?: number; gi?: number; zf?: number };
  feld_druck_delta?: number;
  medienklima_delta?: number;
  verband_effekte?: Record<string, number>;
  label?: string;
  desc?: string;
}

export interface VerbandApi {
  id: string;
  kurz: string;
  name?: string;
  politikfeld_id: string;
  beziehung_start: number;
  tradeoffs?: VerbandTradeoffApi[];
}

export interface EventChoiceApi {
  key: string;
  type: string;
  cost_pk: number;
  effekte: Effekte;
  char_mood: Record<string, number>;
  label: string;
  desc: string;
  log_msg: string;
  loyalty?: Record<string, number>;
  /** SMA-280: Koalitionspartner-Beziehung Delta */
  koalitionspartner_beziehung_delta?: number;
  /** SMA-280: Medienklima Delta */
  medienklima_delta?: number;
  /** SMA-280: Verfassungsgericht Verfahrensdauer in Monaten */
  verfahren_dauer_monate?: number;
  /** SMA-298: Bundesrat-Bonus für alle Fraktionen (Länder-Koalitionskrise) */
  bundesrat_bonus?: number;
}

export interface EventApi {
  id: string;
  event_type: string;
  trigger_type?: string | null;
  min_complexity?: number | null;
  type_label: string;
  title: string;
  quote: string;
  context: string;
  ticker: string;
  choices: EventChoiceApi[];
  /** Kommunal-Initiative Trigger (SMA-275) */
  politikfeld_id?: string | null;
  trigger_druck_min?: number | null;
  trigger_milieu_key?: string | null;
  trigger_milieu_op?: string | null;
  trigger_milieu_val?: number | null;
  gesetz_ref?: string[];
}

export interface BundesratTradeoffApi {
  key: string;
  effekte: Effekte;
  char_mood: Record<string, number>;
  label: string;
  desc: string;
}

export interface BundesratFraktionApi {
  id: string;
  laender: string[];
  basis_bereitschaft: number;
  beziehung_start: number;
  sonderregel?: string | null;
  sprecher_initials: string;
  sprecher_color: string;
  name: string;
  sprecher_name: string;
  sprecher_partei: string;
  sprecher_land: string;
  sprecher_bio: string;
  tradeoffs: BundesratTradeoffApi[];
}
