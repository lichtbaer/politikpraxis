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
  bonus_desc?: string | null;
  interests: string[];
  keyword?: string | null;
  ideologie?: IdeologieApi;
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
}

export interface MilieuApi {
  id: string;
  ideologie: IdeologieApi;
  min_complexity: number;
}

export interface PolitikfeldApi {
  id: string;
  verband_id?: string | null;
  druck_event_id?: string | null;
}

export interface VerbandTradeoffApi {
  key: string;
  effekte: { al?: number; hh?: number; gi?: number; zf?: number };
  feld_druck_delta?: number;
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
