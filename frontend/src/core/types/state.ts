/** GameState, ContentBundle, and related compound types. */

import type { Approval, Ideologie, KPI, LogEntry, PendingEffect, SpeedLevel, TickLogEntry, ViewName } from './common';
import type { AgendaStatus, Character, MinisterAgendaState } from './character';
import type { EingebrachteGesetz, GesetzProjekt, GesetzRelation, Law, SteuerContent } from './law';
import type { GameEvent, MedienEventContent } from './event';
import type {
  BundesratFraktion,
  BundesratLand,
  EUEventContent,
  KoalitionspartnerContent,
  KoalitionspartnerState,
  Milieu,
  MinisterialInitiative,
  OppositionState,
  Politikfeld,
  SpielerParteiState,
  Verband,
} from './politics';
import type { MedienAkteurContent } from '../../data/defaults/medienAkteure';

/** EU-Substate (SMA-269): Klima, Ratsvorsitz, Ausweichroute, Umsetzungsfristen */
export interface EUState {
  klima: Record<string, number>;
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
  schuldenbremseSpielraum?: number;
  einnahmen_basis?: number;
}

/** Aktives Strukturevent (z.B. Haushaltsdebatte) */
export interface AktivesStrukturEvent {
  type: 'haushaltsdebatte';
  ausgangslage: 'ueberschuss' | 'ausgeglichen' | 'defizit';
  phase: number;
  verfuegbarePrioritaeten: string[];
  gewaehlePrioritaeten: string[];
}

/** SMA-390: Laufender Zustand eines Medienakteurs */
export interface MedienAkteurState {
  stimmung: number;
  reichweite: number;
}

/** Legislatur-Bilanz (SMA-278) — berechnet ab Monat 43 für Wahlkampf */
export interface LegislaturBilanz {
  gesetzeBeschlossen: number;
  politikfelderAbgedeckt: number;
  haushaltsaldo: number;
  koalitionsvertragErfuellt: number;
  reformStaerke: 'stark' | 'moderat' | 'schwach';
  stabilitaet: 'stabil' | 'turbulent' | 'krise';
  wirtschaftsBilanz: 'positiv' | 'neutral' | 'negativ';
  medienbilanz: 'gut' | 'gemischt' | 'schlecht';
  kernthemen: string[];
  schwachstellen: string[];
  glaubwuerdigkeitsBonus: number;
}

export interface GameState {
  month: number;
  speed: SpeedLevel;
  speedBeforePause?: SpeedLevel;
  pk: number;
  pkVerbrauchtGesamt?: number;
  skandaleGesamt?: number;
  view: ViewName;

  kpi: KPI;
  kpiStart?: KPI;
  kpiPrev: KPI | null;
  tickLog: TickLogEntry[];
  zust: Approval;
  coalition: number;

  chars: Character[];
  gesetze: Law[];
  eingebrachteGesetze?: EingebrachteGesetz[];
  bundesrat: BundesratLand[];
  bundesratFraktionen: BundesratFraktion[];

  activeEvent: GameEvent | null;
  firedEvents: string[];
  firedCharEvents: string[];
  firedBundesratEvents: string[];
  firedKommunalEvents?: string[];
  eventCooldowns?: Record<string, number>;

  pending: PendingEffect[];

  log: LogEntry[];
  ticker: string;

  gameOver: boolean;
  won: boolean;
  electionThreshold?: number;
  lowApprovalMonths?: number;
  misstrauensvotumAbgewendet?: boolean;
  complexity?: number;
  koalitionspartner?: KoalitionspartnerState;
  koalitionsvertragProfil?: Ideologie;
  milieuZustimmung?: Record<string, number>;
  milieuZustimmungHistory?: Record<string, number[]>;
  milieuGesetzReaktionen?: Record<string, { gesetzId: string; delta: number }[]>;
  verbandsBeziehungen?: Record<string, number>;
  partnerPrioGesetz?: { gesetzId: string; bisMonat: number };
  btStimmenBonus?: { pct: number; bisMonat: number };
  koalitionsbruchSeitMonat?: number;
  politikfeldDruck?: Record<string, number>;
  politikfeldLetzterBeschluss?: Record<string, number>;
  ministerialCooldowns?: Record<string, number>;
  aktiveMinisterialInitiative?: { initId: string; charId: string; gesetzId: string } | null;
  ministerAgenden?: Record<string, MinisterAgendaState>;
  aktiveMinisterAgenda?: { charId: string; status: AgendaStatus } | null;
  eu?: EUState;
  haushalt?: Haushalt;
  lehmannUltimatumBeschleunigt?: boolean;
  lehmannSparvorschlagAktiv?: boolean;
  aktivesStrukturEvent?: AktivesStrukturEvent | null;
  gesetzProjekte?: Record<string, GesetzProjekt>;
  staedtebuendnisBisMonat?: number;
  kommunalKonferenzJahr?: number;
  vorstufeBonusMonate?: Record<string, number>;
  wahlkampfAktiv?: boolean;
  wahlkampfAktionenGenutzt?: number;
  lastRandomEventMonth?: number;
  legislaturBilanz?: LegislaturBilanz | null;
  wahlkampfBotschaften?: string[];
  tvDuellAbgehalten?: boolean;
  tvDuellGewonnen?: boolean | null;
  medienKlima?: number;
  /** SMA-390: plurales Medienökosystem (Stufe 2+) */
  medienAkteure?: Record<string, MedienAkteurState>;
  /** SMA-390: letzter Monat, in dem eine Akteur-spezifische Aktion genutzt wurde */
  medienAktionenGenutzt?: Record<string, number>;
  medienKlimaHistory?: number[];
  letzterSkandal?: number;
  letztesPressemitteilungMonat?: number;
  opposition?: OppositionState;
  bundestagTabHinweisGezeigt?: boolean;
  extremismusWarnung?: boolean;
  verfassungsgerichtAktiv?: boolean;
  verfassungsgerichtVerfahrenBisMonat?: number;
  verfassungsgerichtPolitikfeldIds?: string[];
  verfassungsgerichtPausiert?: boolean;
  gesetzBTStimmen?: Record<string, number>;
  spielerPartei?: SpielerParteiState;
  kanzlerName?: string;
  kanzlerGeschlecht?: 'sie' | 'er' | 'they';
  wahlprognose?: number;
  medienoffensiveGenutzt?: boolean;
  steuerquoteAktionJahr?: number;
  gekoppelteGesetze?: Record<string, string[]>;
  gesetzBeschlossenMonat?: Record<string, number>;
  konjunkturBereitsAngewendet?: Record<string, true>;
  pendingGegenfinanzierung?: {
    gesetzId: string;
    optionen: Array<{
      key: string;
      label_de: string;
      verfuegbar: boolean;
      verfuegbar_grund?: string;
      suboptionen?: Array<{ ressort?: string; gesetzId?: string; kosten_einsparung?: number; einnahmeeffekt?: number }>;
    }>;
    kosten: number;
    pkKosten: number;
    framingKey?: string;
  };
  wahlergebnis?: number;
  charGespraechCooldowns?: Record<string, number>;
  approvalHistory?: number[];
  kpiHistory?: { al: number[]; hh: number[]; gi: number[]; zf: number[] };
  haushaltSaldoHistory?: number[];
  activeEventPool?: string[];
  unlockedLaws?: string[];
  pendingFollowups?: Array<{ eventId: string; triggerMonth: number }>;
  vermittlungAktiv?: Record<string, number>;
  letzteRegierungserklaerungMonat?: number;
  vertrauensfrageGestellt?: boolean;
  sachverstaendigenrat?: {
    naechstesGutachtenMonat: number;
    letztesErgebnis?: 'A' | 'B' | 'C' | 'D' | 'F';
    letzterMonat?: number;
  };
  letzteFraktionssitzungMonat?: number;
  normenkontrollVerfahren?: Array<{
    gesetzId: string;
    klagemonat: number;
    urteilMonat: number;
    spielerReaktion?: 'nachbesserung' | 'akzeptieren' | 'kritisieren';
  }>;
}

export interface ContentBundle {
  characters: Character[];
  events: GameEvent[];
  charEvents: Record<string, GameEvent>;
  bundesratEvents?: GameEvent[];
  kommunalEvents?: GameEvent[];
  vorstufenEvents?: GameEvent[];
  laws: Law[];
  bundesrat: BundesratLand[];
  bundesratFraktionen?: BundesratFraktion[];
  koalitionspartner?: KoalitionspartnerContent;
  milieus?: Milieu[];
  politikfelder?: Politikfeld[];
  verbaende?: Verband[];
  ministerialInitiativen?: MinisterialInitiative[];
  euKlimaStartwerte?: { politikfeld_id: string; startwert: number }[];
  euEvents?: EUEventContent[];
  medienEvents?: MedienEventContent[];
  /** SMA-390: optional aus API; Fallback DEFAULT_MEDIEN_AKTEURE */
  medienAkteureContent?: MedienAkteurContent[];
  extremismusEvents?: GameEvent[];
  kommunalLaenderEvents?: GameEvent[];
  steuerEvents?: GameEvent[];
  gesetzRelationen?: Record<string, GesetzRelation[]>;
  steuern?: SteuerContent[];
  scenario: {
    id: string;
    name: string;
    startMonth: number;
    startPK: number;
    startKPI: KPI;
    startCoalition: number;
  };
}
