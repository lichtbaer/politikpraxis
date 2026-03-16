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
}

export interface LawEffects {
  hh?: number;
  zf?: number;
  gi?: number;
  al?: number;
}

export type LawStatus = 'entwurf' | 'aktiv' | 'blockiert' | 'beschlossen' | 'ausweich';
export type RouteType = 'eu' | 'land' | 'kommune';
export type LawTag = 'bund' | 'eu' | 'land' | 'kommune';

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
  };
  laender: string[];
  basisBereitschaft: number;
  beziehung: number;
  tradeoffPool: Tradeoff[];
  sonderregel?: string;
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

  pending: PendingEffect[];

  log: LogEntry[];
  ticker: string;

  gameOver: boolean;
  won: boolean;
}

export interface ContentBundle {
  characters: Character[];
  events: GameEvent[];
  charEvents: Record<string, GameEvent>;
  laws: Law[];
  bundesrat: BundesratLand[];
  bundesratFraktionen?: BundesratFraktion[];
  scenario: {
    id: string;
    name: string;
    startMonth: number;
    startPK: number;
    startKPI: KPI;
    startCoalition: number;
  };
}
