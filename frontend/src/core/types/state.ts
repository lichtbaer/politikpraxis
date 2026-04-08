/** GameState, ContentBundle, and related compound types. */

import type { Approval, Ideologie, KPI, LogEntry, PendingEffect, SpeedLevel, TickLogEntry, ViewName } from './common';
import type { AgendaZielContent, KoalitionsZielContent } from './agenda';
import type { AgendaStatus, Character, MinisterAgendaState } from './character';
import type { EingebrachteGesetz, GesetzProjekt, GesetzRelation, Law, SteuerContent } from './law';
import type { GameEvent, MedienEventContent } from './event';
import type {
  BundesratFraktion,
  BundesratLand,
  EUEventContent,
  KoalitionspartnerContent,
  KoalitionspartnerParteiId,
  KoalitionspartnerState,
  Milieu,
  MinisterialInitiative,
  OppositionState,
  Politikfeld,
  SpielerParteiState,
  Verband,
  BundeslandContent,
} from './politics';
import type { MedienAkteurContent } from '../../data/defaults/medienAkteure';
import type { MonatsDiff } from './monatszusammenfassung';
import type { WirtschaftsState } from './wirtschaft';

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

/** SMA-392: Temporärer Stimmungs-Buff (z. B. Boulevard/Social-Aktion), bis einschließlich bisMonat */
export interface MedienAkteurBuffState {
  stimmung: number;
  bisMonat: number;
}

/** SMA-502: Laufende Milieu-Zustimmung über die Legislatur (min/max/Ø) */
export interface MilieuHistoryStats {
  min: number;
  max: number;
  sum: number;
  months: number;
}

/** SMA-502: Kumulierte Koalitionspartner-Beziehung (Summe/Monate → Ø = sum/months) */
export interface KoalitionsbeziehungLegislaturStats {
  sum: number;
  months: number;
}

/** SMA-505: Gesamtnote der Legislatur-Bilanz (100 Punkte, Schwellen wie Ticket) */
export type LegislaturBilanzNote = 'A' | 'B' | 'C' | 'D' | 'F';

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
  /** SMA-505: Reform-Tiefe aus History (Milieu-Impact, Gesetze) */
  reformTiefe?: 'tief' | 'mittel' | 'flach';
  /** SMA-505: Koalitionslage aus Verlauf (Ø-Beziehung, Vertrag) */
  koalitionsBilanz?: 'harmonisch' | 'angespannt' | 'kritisch';
  /** SMA-505: nur bei Spielende (Monat 48) gesetzt */
  bilanzPunkte?: number;
  bilanzNote?: LegislaturBilanzNote;
  /** SMA-505: optional Aufschlüsselung für Analytics/UI */
  bilanzPunkteDetail?: {
    gesetze: number;
    politikfelder: number;
    haushalt: number;
    stabilitaet: number;
    koalition: number;
    zusammenhalt: number;
    reformTiefe: number;
  };
}

/** SMA-499: Gesamtbewertung aus Bilanz, Agenda, Urteil (+ Wahlbonus) */
export interface SpielzielSnapshot {
  gesamtpunkte: number;
  gesamtnote: LegislaturBilanzNote;
  bilanzPunkte: number;
  agendaPunkte: number;
  urteilPunkte: number;
  wahlbonus: number;
}

export interface SpielzielErgebnis extends SpielzielSnapshot {
  agendaSpielerErfuellt: number;
  agendaSpielerGesamt: number;
  agendaKoalitionErfuellt: number;
  agendaKoalitionGesamt: number;
  beschlosseneGesetzeUrteil: number;
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
  /** SMA-500: vom Spieler gewählte Agenda-Ziel-IDs (Content-Referenzen) */
  spielerAgenda?: string[];
  /** SMA-500: aktive Koalitions-Ziel-IDs */
  koalitionsAgenda?: string[];
  gesetze: Law[];
  eingebrachteGesetze?: EingebrachteGesetz[];
  bundesrat: BundesratLand[];
  bundesratFraktionen: BundesratFraktion[];
  /** SMA-395: Beziehung 0–100 je Land-ID (BY, NW, …) */
  landBeziehungen?: Record<string, number>;
  /** SMA-395: Nach BR-Beschluss einmalig zu prüfendes Land-Event */
  pendingBundesratLandEvent?: string;

  activeEvent: GameEvent | null;
  firedEvents: string[];
  /** SMA-394: IDs dynamisch ausgelöster Events (zusätzlich zu firedEvents für Kompatibilität) */
  ausgeloesteEvents?: string[];
  firedCharEvents: string[];
  firedBundesratEvents: string[];
  firedKommunalEvents?: string[];
  eventCooldowns?: Record<string, number>;

  pending: PendingEffect[];

  log: LogEntry[];
  ticker: string;

  /** Seed für den deterministischen PRNG (Mulberry32). Einmalig bei Spielstart gesetzt. */
  rngSeed: number;

  gameOver: boolean;
  won: boolean;
  /** SMA-499: Erfolg nach dreistufigem Spielziel (unabhängig von reiner Wahlhürde) */
  legislaturErfolg?: boolean;
  /** Wahlergebnis hat die konfigurierte Hürde überschritten (für Achievements / Text) */
  wahlUeberHuerde?: boolean;
  /** SMA-499: Auswertung Bilanz / Agenda / Urteil / Wahlbonus */
  spielziel?: SpielzielErgebnis | null;
  electionThreshold?: number;
  lowApprovalMonths?: number;
  misstrauensvotumAbgewendet?: boolean;
  complexity?: number;
  koalitionspartner?: KoalitionspartnerState;
  koalitionsvertragProfil?: Ideologie;
  milieuZustimmung?: Record<string, number>;
  milieuZustimmungHistory?: Record<string, number[]>;
  /** SMA-502: Aggregierte Zustimmung je Milieu über die Legislatur */
  milieuHistory?: Record<string, MilieuHistoryStats>;
  milieuGesetzReaktionen?: Record<string, { gesetzId: string; delta: number }[]>;
  verbandsBeziehungen?: Record<string, number>;
  /** SMA-405: zuletzt aus Wirtschaftssektor ausgelöste Verbands-Anpassung (Anzeige Verbände-Tab) */
  verbandsLetzteWirtschaftsReaktion?: Record<
    string,
    {
      sektor_id: string;
      sektor_name_de: string;
      zustand: number;
      monat: number;
      /** z. B. Haushaltssaldo statt Sektorzustand 0–100 */
      kontext_de?: string;
    }
  >;
  partnerPrioGesetz?: { gesetzId: string; bisMonat: number };
  /** SMA-403: Nach Koalitionsverhandlung (15 PK) darf ein veto-pflichtiges Gesetz einmal eingebracht werden */
  partnerWiderstandVetoFreigabeGesetzId?: string;
  /** SMA-403: UI-Modal für Partner-Widerstand vor Einbringen */
  pendingPartnerWiderstand?: {
    lawId: string;
    framingKey?: string | null;
    intensitaet: 'hinweis' | 'widerstand' | 'veto';
    koalitionsMalus: number;
    partnerId: KoalitionspartnerParteiId;
  };
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
  /** SMA-390/392: letzter Monat je Medien-Aktion (Cooldown 3 Monate) */
  medienAktionenGenutzt?: Record<string, number>;
  /** SMA-392: additive Stimmungs-Buffs mit Ablaufmonat */
  medienAkteurBuffs?: Record<string, MedienAkteurBuffState>;
  medienKlimaHistory?: number[];
  /** SMA-502: Anzahl Monate mit Medienklima unter Agenda-Schwelle */
  medienklimaBelowMonths?: number;
  letzterSkandal?: number;
  letztesPressemitteilungMonat?: number;
  opposition?: OppositionState;
  bundestagTabHinweisGezeigt?: boolean;
  extremismusWarnung?: boolean;
  bverfgVorwarnung?: boolean;
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
    /** SMA-403: Nach „Trotzdem einbringen“ im Partner-Widerstand-Modal */
    partnerWiderstandConfirmed?: boolean;
    partnerWiderstandKoalitionsMalus?: number;
  };
  wahlergebnis?: number;
  charGespraechCooldowns?: Record<string, number>;
  /** SMA-502: Zähler je Char-ID — Monate mit Mood ≤ Schwellenwert */
  charMoodHistory?: Record<string, number>;
  /** SMA-502: Kumulierte Partner-Beziehung (Ø = sum/months) */
  koalitionsbeziehungLegislatur?: KoalitionsbeziehungLegislaturStats;
  approvalHistory?: number[];
  kpiHistory?: { al: number[]; hh: number[]; gi: number[]; zf: number[] };
  haushaltSaldoHistory?: number[];
  /** SMA-394: letzte Monatswerte Konjunkturindex (Haushalt) für Boom-Trigger */
  konjunkturIndexHistory?: number[];
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
  /** SMA-396: Zusammenfassung des letzten abgeschlossenen Monats */
  letzterMonatsDiff?: MonatsDiff | null;
  /** SMA-404/405: Sektoren + Makroindikatoren (ab Komplexität 2) */
  wirtschaft?: WirtschaftsState;
}

export interface ContentBundle {
  characters: Character[];
  events: GameEvent[];
  charEvents: Record<string, GameEvent>;
  bundesratEvents?: GameEvent[];
  kommunalEvents?: GameEvent[];
  vorstufenEvents?: GameEvent[];
  laws: Law[];
  /** SMA-501: kuratierter Pool Spieler-Agenda-Ziele */
  agendaZiele?: AgendaZielContent[];
  /** SMA-501: Koalitionspartner-Ziele je Profil */
  koalitionsZiele?: KoalitionsZielContent[];
  bundesrat: BundesratLand[];
  bundesratFraktionen?: BundesratFraktion[];
  landBeziehungen?: Record<string, number>;
  /** SMA-395: optional für Merge in createInitialState */
  bundeslaender?: BundeslandContent[];
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
  /** SMA-394: zustandsabhängige Events (nicht im Zufallspool) */
  dynamicEvents?: GameEvent[];
  scenario: {
    id: string;
    name: string;
    startMonth: number;
    startPK: number;
    startKPI: KPI;
    startCoalition: number;
  };
}
