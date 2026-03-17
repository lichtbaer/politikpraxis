/** Ideologie-Profil (wirtschaft, gesellschaft, staat) — Werte -100 bis +100 */
export interface Ideologie {
  wirtschaft: number;
  gesellschaft: number;
  staat: number;
}

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
  interests: string[];
  bonus: CharacterBonus;
  ultimatum: CharacterUltimatum;
  /** Ein-Wort-Charakterisierung für Onboarding */
  tag?: string;
  /** Mindest-Komplexitätsstufe, ab der der Char im Kabinett erscheint (default: 1) */
  min_complexity?: number;
  /** Ideologie-Profil für Kongruenz-Berechnung */
  ideologie?: Ideologie;
}

export interface LawEffects {
  hh?: number;
  zf?: number;
  gi?: number;
  al?: number;
}

export type LawStatus = 'entwurf' | 'aktiv' | 'blockiert' | 'beschlossen' | 'ausweich' | 'bt_passed';
export type RouteType = 'eu' | 'land' | 'kommune';
export type LawTag = 'bund' | 'eu' | 'land' | 'kommune';

/** Lobby-Status pro Fraktion pro Gesetz */
export interface LawLobbyFraktion {
  pkInvestiert: boolean;
  tradeoffAngenommen?: boolean;
  tradeoffAblehnen?: boolean;
  tradeoffGegenvorschlag?: boolean;
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
  /** Monat der geplanten Bundesratsabstimmung (nur bei land-Tag) */
  brVoteMonth?: number;
  /** Lobby-State pro Fraktion: fraktionId -> State */
  lobbyFraktionen?: Record<string, LawLobbyFraktion>;
  /** Kohl-Sonderregel: Sabotage bereits ausgelöst für dieses Gesetz */
  kohlSabotageTriggered?: boolean;
  /** Ideologie-Profil für Kongruenz-Berechnung */
  ideologie?: Ideologie;
  /** Primäres Politikfeld (für Druck-System) */
  politikfeldId?: string | null;
  /** EU-Route: Wirkungsfaktor bei Kompromiss (0.85) */
  wirkungFaktor?: number;
  /** Einmalige Haushaltskosten in Mrd. € (bei Beschluss) */
  kosten_einmalig?: number;
  /** Laufende Haushaltskosten in Mrd. €/Jahr (bei Beschluss) */
  kosten_laufend?: number;
  /** Einnahmeeffekt in Mrd. € (z.B. Steueränderung) */
  einnahmeeffekt?: number;
  /** Investitionsgesetz (+2 Mo. Lag) */
  investiv?: boolean;
  /** Kommunal-Pilot möglich (SMA-272) */
  kommunal_pilot_moeglich?: boolean;
}

/** Koalitionspartner-State im GameState */
export interface KoalitionspartnerState {
  id: 'gruene' | 'spd_fluegel';
  beziehung: number;
  koalitionsvertragScore: number;
  schluesselthemenErfuellt: string[];
}

/** Koalitionspartner-Content (Daten des Partners) */
export interface KoalitionspartnerContent {
  id: 'gruene' | 'spd_fluegel';
  name: string;
  sprecher: string;
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

export type EventType = 'danger' | 'warn' | 'good' | 'info';

export interface EventChoiceEffect {
  hh?: number;
  zf?: number;
  gi?: number;
  al?: number;
}

export interface EventChoice {
  label: string;
  desc: string;
  cost: number;
  type: 'safe' | 'primary' | 'danger';
  effect: EventChoiceEffect;
  charMood?: Record<string, number>;
  loyalty?: Record<string, number>;
  /** Bundesrat-Fraktion Beziehung: fraktionId -> Delta */
  brRelation?: Record<string, number>;
  /** Bei Bundesrat-Initiative: Delta für initiierende Fraktion (event.fraktionId) */
  brRelationInitiator?: number;
  /** Bei Koalitionsbruch-Event: Delta für Koalitionspartner-Beziehung */
  koalitionspartnerBeziehung?: number;
  /** Bei Ministerial-Initiative: Aktion für resolveMinisterialInitiative */
  ministerialAction?: 'unterstuetzen' | 'ablehnen' | 'ignorieren';
  log: string;
  /** Choice-Key aus API (z.B. als_vorbild, koordinieren) */
  key?: string;
}

export interface GameEvent {
  id: string;
  type: EventType;
  icon: string;
  typeLabel: string;
  title: string;
  quote: string;
  context: string;
  choices: EventChoice[];
  ticker: string;
  charId?: string;
  /** Bei Bundesrat-Events: betroffenes Gesetz */
  lawId?: string;
  /** Bei Bundesrat-Events: betroffene Fraktion (z.B. Landtagswahl, Sprecher-Wechsel, Initiative) */
  fraktionId?: string;
  /** Bei Landtagswahl: welches Land wechselt */
  landId?: string;
  landName?: string;
  /** Bei Landtagswahl: Ziel-Fraktion (Land wechselt zu) */
  landtagswahlToFraktion?: string;
  /** Bei Sprecher-Wechsel: neuer Sprecher */
  sprecherErsatz?: { name: string; partei: string; land: string; initials: string; color: string; bio: string; quote?: string };
  /** Kommunal-Initiative: Politikfeld für Trigger-Check */
  politikfeldId?: string | null;
  /** Kommunal-Initiative: min. Druck-Wert */
  triggerDruckMin?: number | null;
  /** Kommunal-Initiative: Milieu-Key für Trigger */
  triggerMilieuKey?: string | null;
  /** Kommunal-Initiative: Milieu-Vergleich (>, <) */
  triggerMilieuOp?: string | null;
  /** Kommunal-Initiative: Milieu-Schwellwert */
  triggerMilieuVal?: number | null;
  /** Kommunal-Initiative: passende Gesetze für Pilot */
  gesetzRef?: string[];
  /** Mindest-Komplexitätsstufe */
  min_complexity?: number;
}

export interface KPI {
  al: number;
  hh: number;
  gi: number;
  zf: number;
}

export interface Approval {
  g: number;
  arbeit: number;
  mitte: number;
  prog: number;
}

export interface PendingEffect {
  month: number;
  key: keyof KPI;
  delta: number;
  label: string;
}

export interface LogEntry {
  time: string;
  msg: string;
  type: string;
  /** Optional params for i18n interpolation when msg is a translation key */
  params?: Record<string, string | number>;
}

export type ViewName = 'agenda' | 'eu' | 'land' | 'kommune' | 'medien' | 'bundesrat' | 'verbaende';
export type SpeedLevel = 0 | 1 | 2;

export interface BundesratLand {
  id: string;
  name: string;
  mp: string;
  party: string;
  alignment: 'koalition' | 'neutral' | 'opposition';
  mood: number;
  interests: string[];
  votes: number;
}

/** KPI-Delta für Tradeoff-Effekte (hh, zf, gi, al) */
export interface KpiDelta {
  hh?: number;
  zf?: number;
  gi?: number;
  al?: number;
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
    /** Fiktives Zitat für Lobbying-Overlay */
    quote?: string;
  };
  laender: string[];
  basisBereitschaft: number;
  beziehung: number;
  tradeoffPool: Tradeoff[];
  sonderregel?: string;
  /** Monat bis zu dem Reparatur läuft (bei Beziehung 0-19) */
  reparaturEndMonth?: number;
}

/** Milieu-Daten aus Content (Ideologie, min_complexity) */
export interface Milieu {
  id: string;
  ideologie: Ideologie;
  min_complexity: number;
  /** Anteil an Wählerschaft 0–100 (für Wahlprognose) */
  gewicht?: number;
  /** Basisbeteiligung 0–100 (für Wahlprognose) */
  basisbeteiligung?: number;
  /** Kurzbezeichnung für Anzeige */
  kurz?: string;
}

/** Politikfeld mit Verbands-Zuordnung */
export interface Politikfeld {
  id: string;
  verbandId: string | null;
  druckEventId?: string | null;
}

/** EU-Substate (SMA-269): Klima, Ratsvorsitz, Ausweichroute, Umsetzungsfristen */
export interface EUState {
  klima: Record<string, number>;
  /** Sperre pro Politikfeld: feldId → Monat bis wann gesperrt */
  klimaSperre: Record<string, number>;
  ratsvorsitz: boolean;
  ratsvorsitzStartMonat: number;
  ratsvorsitzPrioritaeten: string[];
  umsetzungsfristen: {
    gesetzId: string;
    feldId: string;
    fristMonat: number;
    umgesetzt: boolean;
  }[];
  foerdermittelBeantragt: string[];
  aktiveRoute: {
    gesetzId: string;
    phase: 1 | 2 | 3;
    startMonat: number;
    dauer: number;
    erfolgschance: number;
    verwässert: boolean;
  } | null;
}

/** Schuldenbremsen-Status */
export type SchuldenbremsenStatus = 'inaktiv' | 'ausgeglichen' | 'grenzwertig' | 'verletzt_mild' | 'verletzt_stark';

/** Haushalt-Objekt im GameState (SMA-268) */
export interface Haushalt {
  einnahmen: number;
  pflichtausgaben: number;
  laufendeAusgaben: number;
  spielraum: number;
  saldo: number;
  saldoKumulativ: number;
  konjunkturIndex: number;
  steuerpolitikModifikator: number;
  investitionsquote: number;
  schuldenbremseAktiv: boolean;
  haushaltsplanMonat: number;
  haushaltsplanBeschlossen: boolean;
  planPrioritaeten: string[];
}

/** Aktives Strukturevent (z.B. Haushaltsdebatte) */
export interface AktivesStrukturEvent {
  type: 'haushaltsdebatte';
  ausgangslage: 'ueberschuss' | 'ausgeglichen' | 'defizit';
  phase: number;
  verfuegbarePrioritaeten: string[];
  gewaehlePrioritaeten: string[];
}

export interface GameState {
  month: number;
  speed: SpeedLevel;
  pk: number;
  view: ViewName;

  kpi: KPI;
  kpiPrev: KPI | null;
  zust: Approval;
  coalition: number;

  chars: Character[];
  gesetze: Law[];
  bundesrat: BundesratLand[];
  bundesratFraktionen: BundesratFraktion[];

  activeEvent: GameEvent | null;
  firedEvents: string[];
  firedCharEvents: string[];
  firedBundesratEvents: string[];
  /** Kommunal-Initiative Events (SMA-275) */
  firedKommunalEvents?: string[];

  pending: PendingEffect[];

  log: LogEntry[];
  ticker: string;

  gameOver: boolean;
  won: boolean;
  /** Wahlhürde in % (35/38/40/42 je nach Komplexitätsstufe) */
  electionThreshold?: number;
  /** Koalitionspartner (ab Stufe 2) */
  koalitionspartner?: KoalitionspartnerState;
  /** Berechnetes Koalitionsvertrag-Profil (60% Spieler, 40% Partner) */
  koalitionsvertragProfil?: Ideologie;
  /** Milieu-Zustimmung (ersetzt zust.arbeit/mitte/prog bei Stufe 2+) */
  milieuZustimmung?: Record<string, number>;
  /** Letzte 3 Monate pro Milieu für Trend-Pfeil */
  milieuZustimmungHistory?: Record<string, number[]>;
  /** Verbands-Beziehungen (ab Stufe 3): verbandId → 0–100 */
  verbandsBeziehungen?: Record<string, number>;
  /** Partner priorisiert Gesetz für 3 Monate (+5% BT-Stimmen) */
  partnerPrioGesetz?: { gesetzId: string; bisMonat: number };
  /** +2% BT-Stimmen-Bonus (z.B. durch „als_vorbild“ bei Kommunal-Initiative), bis Monat */
  btStimmenBonus?: { pct: number; bisMonat: number };
  /** Monat, in dem Koalitionsbruch-Warnung ausgelöst wurde (für 3-Monats-Frist) */
  koalitionsbruchSeitMonat?: number;
  /** Politikfeld-Druck-Scores (0–100) */
  politikfeldDruck?: Record<string, number>;
  /** Monat des letzten Beschlusses pro Politikfeld */
  politikfeldLetzterBeschluss?: Record<string, number>;
  /** Ministerial-Initiativen: charId → Monat der letzten Initiative */
  ministerialCooldowns?: Record<string, number>;
  /** Aktive Ministerial-Initiative (max. 1 gleichzeitig) */
  aktiveMinisterialInitiative?: { initId: string; charId: string; gesetzId: string } | null;
  /** EU-System (ab Stufe 2): Klima, Ratsvorsitz, Ausweichroute */
  eu?: EUState;
  /** Haushalt (ab Stufe 2, SMA-268) */
  haushalt?: Haushalt;
  /** Lehmann-Ultimatum beschleunigt bei starker Schuldenbremsen-Verletzung */
  lehmannUltimatumBeschleunigt?: boolean;
  /** Lehmann-Sparvorschlag aktiv (Saldo < -15 Mrd.) */
  lehmannSparvorschlagAktiv?: boolean;
  /** Aktives Strukturevent (z.B. Haushaltsdebatte) */
  aktivesStrukturEvent?: AktivesStrukturEvent | null;
}

/** Verband (Wirtschaftsverband, Lobby) — ab Stufe 3 */
export interface Verband {
  id: string;
  kurz: string;
  name?: string;
  politikfeld_id: string;
  beziehung_start: number;
  tradeoffs?: VerbandTradeoff[];
  /** EU-Einflussstärke 1–5 (für EU-Route Verbands-Option) */
  staerke_eu?: number;
}

/** Trade-off eines Verbands */
export interface VerbandTradeoff {
  key: string;
  effekte: Partial<KpiDelta>;
  feld_druck_delta: number;
  label?: string;
  desc?: string;
}

/** EU-Event-Content für reaktive Richtlinien */
export interface EUEventContent {
  id: string;
  politikfeld_id: string | null;
  trigger_klima_min: number | null;
  min_complexity: number;
}

/** Ministerial-Initiative (Minister bringt eigenes Gesetz ein) */
export interface MinisterialInitiative {
  id: string;
  char_id: string;
  gesetz_ref_id: string;
  cooldown_months: number;
  /** Bedingungen: z.B. mood >= 3, interest match, etc. */
  bedingungen?: Array<{ type: string; value?: number | string }>;
}

export interface ContentBundle {
  characters: Character[];
  events: GameEvent[];
  charEvents: Record<string, GameEvent>;
  bundesratEvents?: GameEvent[];
  /** Kommunal-Initiative Events (SMA-275) */
  kommunalEvents?: GameEvent[];
  /** Vorstufen-Erfolg Events (von resolveVorstufe aufgerufen) */
  vorstufenEvents?: GameEvent[];
  laws: Law[];
  bundesrat: BundesratLand[];
  bundesratFraktionen?: BundesratFraktion[];
  koalitionspartner?: KoalitionspartnerContent;
  milieus?: Milieu[];
  politikfelder?: Politikfeld[];
  verbaende?: Verband[];
  ministerialInitiativen?: MinisterialInitiative[];
  /** EU-Klima-Startwerte pro Politikfeld (aus DB eu_klima_startwerte) */
  euKlimaStartwerte?: { politikfeld_id: string; startwert: number }[];
  /** EU-Events für reaktive Richtlinien (aus DB eu_events) */
  euEvents?: EUEventContent[];
  scenario: {
    id: string;
    name: string;
    startMonth: number;
    startPK: number;
    startKPI: KPI;
    startCoalition: number;
  };
}
