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
  log: string;
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

export type ViewName = 'agenda' | 'eu' | 'land' | 'kommune' | 'medien' | 'bundesrat';
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
}

/** Politikfeld mit Verbands-Zuordnung */
export interface Politikfeld {
  id: string;
  verbandId: string | null;
  druckEventId?: string | null;
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

  pending: PendingEffect[];

  log: LogEntry[];
  ticker: string;

  gameOver: boolean;
  won: boolean;
  /** Wahlhürde in % (35/38/40/42 je nach Komplexitätsstufe) */
  electionThreshold?: number;

  /** Milieu-Zustimmung (ersetzt zust.arbeit/mitte/prog bei Stufe 2+) */
  milieuZustimmung?: Record<string, number>;
  /** Verbands-Beziehungen */
  verbandsBeziehungen?: Record<string, number>;
  /** Politikfeld-Druck-Scores (0–100) */
  politikfeldDruck?: Record<string, number>;
  /** Monat des letzten Beschlusses pro Politikfeld */
  politikfeldLetzterBeschluss?: Record<string, number>;
}

export interface ContentBundle {
  characters: Character[];
  events: GameEvent[];
  charEvents: Record<string, GameEvent>;
  bundesratEvents?: GameEvent[];
  laws: Law[];
  bundesrat: BundesratLand[];
  bundesratFraktionen?: BundesratFraktion[];
  milieus?: Milieu[];
  politikfelder?: Politikfeld[];
  scenario: {
    id: string;
    name: string;
    startMonth: number;
    startPK: number;
    startKPI: KPI;
    startCoalition: number;
  };
}
