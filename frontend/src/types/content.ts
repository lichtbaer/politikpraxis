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
  /** SMA-327: Dynamisches Kabinett */
  pool_partei?: string | null;
  ressort?: string | null;
  ressort_partner?: string | null;
  agenda?: unknown;
  ist_kanzler?: boolean;
  /** SMA-329: Partner-Minister (Juniorpartner) */
  ist_partner_minister?: boolean;
  agenda_stufe_aktuell?: number | null;
  agenda_ablehnungen?: number;
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
  ideologie_wert?: number;
  politikfeld_id?: string | null;
  politikfeld_sekundaer?: string[];
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
  /** SMA-335: Steuer-ID, Konjunktur-Effekte */
  steuer_id?: string | null;
  steuer_delta?: number | null;
  konjunktur_effekt?: number;
  konjunktur_lag?: number;
  /** SMA-404: verzögerte Sektor-Effekte */
  sektor_effekte?: Array<{ sektor: string; delta: number; verzoegerung_monate: number }>;
  /** Art. 77 GG: false = Einspruchsgesetz (BR kann überstimmt werden). Default: true für land-Gesetze. */
  zustimmungspflichtig?: boolean;
  /** Gesetz erst nach diesem Event im Entwurf-Pool (API/DB Single Source of Truth). */
  locked_until_event?: string | null;
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
  /** SMA-394 */
  milieu_delta?: Record<string, number>;
  schuldenbremse_spielraum_delta?: number;
  steuerpolitik_modifikator_delta?: number;
  konjunktur_index_delta?: number;
  /** SMA-395 */
  br_relation_json?: Record<string, number>;
}

export interface EventApi {
  id: string;
  event_type: string;
  trigger_type?: string | null;
  /** SMA-394 */
  trigger_typ?: string | null;
  trigger_params?: Record<string, number | string> | null;
  einmalig?: boolean | null;
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

/** SMA-392: GET /api/content/medien-akteure */
export interface MedienAkteurApi {
  id: string;
  name_de: string;
  typ: string;
  reichweite: number;
  stimmung_start: number;
  min_complexity: number;
}

/** SMA-395: GET /api/content/bundeslaender */
export interface BundeslandApi {
  id: string;
  name_de: string;
  partei: string | null;
  koalition: string[];
  bundesrat_fraktion: string;
  wirtschaft_typ: string;
  themen: string[];
  beziehung_start: number;
  stimmgewicht: number;
  min_complexity: number;
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
