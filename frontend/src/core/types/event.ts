/** Event-related types. */

export type EventType = 'danger' | 'warn' | 'good' | 'info' | 'crisis';

/** SMA-394: Trigger für zustandsabhängige (dynamic) Events — kommt aus DB trigger_typ + trigger_params */
export type DynamicEventTriggerTyp =
  | 'saldo_unter'
  | 'konjunktur_unter'
  | 'konjunktur_ueber_monate'
  | 'koalition_unter'
  | 'partner_minister_ablehnungen'
  | 'monat_range'
  | 'medienklima_unter_monate'
  | 'medienakteur_reichweite';

export type DynamicEventTriggerParams = Record<string, number | string>;

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
  brRelation?: Record<string, number>;
  brRelationInitiator?: number;
  koalitionspartnerBeziehung?: number;
  ministerialAction?: 'unterstuetzen' | 'ablehnen' | 'ignorieren';
  agendaAction?: 'annehmen' | 'ablehnen';
  log: string;
  key?: string;
  unlocks_laws?: string[];
  followup_event_id?: string;
  followup_delay?: number;
  medienklima_delta?: number;
  verfahrenDauerMonate?: number;
  bundesratBonusAll?: number;
  /** SMA-394: dynamische Events — Milieu-Zustimmung relativ ändern */
  milieuDelta?: Record<string, number>;
  /** SMA-394: Schuldenbremse-Spielraum (Mrd.) relativ */
  schuldenbremseSpielraumDelta?: number;
  /** SMA-394: Steuerpolitik-Modifikator relativ (Anteil) */
  steuerpolitikModifikatorDelta?: number;
  /** SMA-394: Konjunkturindex relativ (Engine-Spanne ca. -3..+3) */
  konjunkturIndexDelta?: number;
  /** SMA-395: Deltas pro Bundesratsfraktions-ID (API br_relation_json) */
  brRelationJson?: Record<string, number>;
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
  lawId?: string;
  fraktionId?: string;
  landId?: string;
  landName?: string;
  landtagswahlToFraktion?: string;
  sprecherErsatz?: { name: string; partei: string; land: string; initials: string; color: string; bio: string; quote?: string };
  politikfeldId?: string | null;
  triggerDruckMin?: number | null;
  triggerMilieuKey?: string | null;
  triggerMilieuOp?: string | null;
  triggerMilieuVal?: number | null;
  gesetzRef?: string[];
  min_complexity?: number;
  auto_pause?: 'always' | 'fast_only' | 'never';
  repeatable?: boolean;
  cooldownMonths?: number;
  always_include?: boolean;
  /** SMA-394: Engine-Trigger (aus API trigger_typ / trigger_params) */
  triggerTyp?: DynamicEventTriggerTyp;
  triggerParams?: DynamicEventTriggerParams;
  /** Einmalig auslösbar pro Spielstand (Default true für dynamic) */
  einmalig?: boolean;
}

/** Medien-Event (Skandal, positiv) — SMA-277 */
export interface MedienEventChoice {
  key: string;
  cost_pk: number;
  medienklima_delta: number;
  label: string;
  desc: string;
  log_msg: string;
}

/** Medien-Event-Content für Skandale und positive Events */
export interface MedienEventContent {
  id: string;
  event_subtype: 'skandal' | 'positiv' | 'opposition';
  trigger_type: 'random' | 'conditional';
  medienklima_delta: number;
  min_complexity: number;
  trigger_monat_min: number;
  title: string;
  quote: string;
  context: string;
  ticker: string;
  choices: MedienEventChoice[];
  repeatable?: boolean;
  cooldownMonths?: number;
}
