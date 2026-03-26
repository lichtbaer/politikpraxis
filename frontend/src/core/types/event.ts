/** Event-related types. */

export type EventType = 'danger' | 'warn' | 'good' | 'info' | 'crisis';

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
