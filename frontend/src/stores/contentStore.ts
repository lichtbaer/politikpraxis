import { create } from 'zustand';
import { apiFetch } from '../services/api';
import type {
  CharApi,
  GesetzApi,
  EventApi,
  BundesratFraktionApi,
  MilieuApi,
  PolitikfeldApi,
  VerbandApi,
} from '../types/content';
import type {
  ContentBundle,
  Character,
  Law,
  GameEvent,
  EventChoice,
  BundesratFraktion,
  BundesratLand,
  Milieu,
  Politikfeld,
  GesetzRelation,
} from '../core/types';
import { DEFAULT_VERBAENDE, DEFAULT_MINISTERIAL_INITIATIVEN } from '../data/defaults/scenarios';
import { DEFAULT_BUNDESRAT, DEFAULT_SCENARIO } from '../data/defaults/scenarios';
import {
  BUNDESRAT_EVENTS,
  SPRECHER_ERSATZ,
  LANDTAGSWAHL_TRANSITIONS,
} from '../data/defaults/bundesratEvents';
import {
  GRUENE,
  KOALITIONSBRUCH_EVENT,
  KOALITIONSKRISE_ULTIMATUM_EVENT,
} from '../data/defaults/koalitionspartner';
import {
  WAHLKAMPF_BEGINN_EVENT,
  TV_DUELL_EVENT,
  KOALITIONSPARTNER_ALLEINGANG_EVENT,
  WAHLKAMPF_THEMA_WAHL_EVENT,
  WAHLKAMPF_VERSPRECHEN_EVENT,
} from '../data/defaults/wahlkampfEvents';
import { DEFAULT_MEDIEN_EVENTS } from '../data/defaults/medienEvents';

const EVENT_TYPE_ICON_KEYS: Record<string, string> = {
  danger: 'danger',
  warn: 'warn',
  good: 'good',
  info: 'info',
  random: 'random',
  char_ultimatum: 'char_ultimatum',
  bundesrat: 'bundesrat',
  kommunal_initiative: 'kommunal_initiative',
  vorstufe_erfolg: 'vorstufe_erfolg',
};

const EVENT_TYPE_MAP: Record<string, 'danger' | 'warn' | 'good' | 'info'> = {
  danger: 'danger',
  warn: 'warn',
  good: 'good',
  info: 'info',
  random: 'info',
  char_ultimatum: 'danger',
  bundesrat: 'warn',
  kommunal_initiative: 'warn',
  vorstufe_erfolg: 'good',
};

function transformChar(api: CharApi): Character {
  const char: Character = {
    id: api.id,
    name: api.name,
    role: api.role,
    initials: api.initials,
    color: api.color,
    mood: api.mood_start,
    loyalty: api.loyalty_start,
    bio: api.bio,
    interests: api.interests ?? [],
    tag: api.keyword ?? undefined,
    min_complexity: api.min_complexity ?? 1,
    ideologie: api.ideologie,
    bonus: {
      trigger: api.bonus_trigger ?? 'mood>=3',
      desc: api.bonus_desc ?? '',
      applies: api.bonus_applies ?? '',
    },
    ultimatum: {
      moodThresh: api.ultimatum_mood_thresh ?? -1,
      event: api.ultimatum_event_id ?? '',
    },
  };
  if (api.eingangszitat) char.eingangszitat = api.eingangszitat;
  if (api.partei_kuerzel) char.partei_kuerzel = api.partei_kuerzel;
  if (api.partei_farbe) char.partei_farbe = api.partei_farbe;
  if (api.pool_partei) char.pool_partei = api.pool_partei;
  if (api.ressort) char.ressort = api.ressort;
  if (api.ressort_partner) char.ressort_partner = api.ressort_partner;
  if (api.agenda) char.agenda = api.agenda;
  if (api.ist_kanzler) char.ist_kanzler = api.ist_kanzler;
  if (api.ist_partner_minister) char.ist_partner_minister = api.ist_partner_minister;
  if (api.agenda_stufe_aktuell != null) char.agenda_stufe_aktuell = api.agenda_stufe_aktuell;
  if (api.agenda_ablehnungen != null) char.agenda_ablehnungen = api.agenda_ablehnungen;
  return char;
}

function transformGesetz(api: GesetzApi): Law {
  return {
    id: api.id,
    titel: api.titel,
    kurz: api.kurz,
    desc: api.desc,
    tags: api.tags as ('bund' | 'eu' | 'land' | 'kommune')[],
    status: 'entwurf',
    ja: api.bt_stimmen_ja,
    nein: 100 - api.bt_stimmen_ja,
    effekte: api.effekte,
    lag: api.effekt_lag,
    expanded: false,
    route: null,
    rprog: 0,
    rdur: 0,
    blockiert: null,
    ideologie: api.ideologie,
    politikfeldId: api.politikfeld_id ?? null,
    kosten_einmalig: api.kosten_einmalig,
    kosten_laufend: api.kosten_laufend,
    einnahmeeffekt: api.einnahmeeffekt,
    pflichtausgaben_delta: api.pflichtausgaben_delta,
    investiv: (api as { investiv?: boolean }).investiv,
    kommunal_pilot_moeglich: api.kommunal_pilot_moeglich ?? true,
    laender_pilot_moeglich: api.laender_pilot_moeglich ?? true,
    eu_initiative_moeglich: api.eu_initiative_moeglich ?? true,
    framing_optionen: (api as { framing_optionen?: { key: string; label?: string; slogan?: string; milieu_effekte: Record<string, number>; verband_effekte?: Record<string, number>; medienklima_delta: number }[] }).framing_optionen ?? [],
    lobby_mood_effekte: api.lobby_mood_effekte ?? {},
    lobby_pk_kosten: api.lobby_pk_kosten ?? 12,
    lobby_gain_range: api.lobby_gain_range ?? { min: 2, max: 6 },
    route_overrides: api.route_overrides ?? {},
    min_complexity: (api as { min_complexity?: number }).min_complexity ?? 1,
    steuer_id: (api as { steuer_id?: string | null }).steuer_id ?? null,
    steuer_delta: (api as { steuer_delta?: number | null }).steuer_delta ?? null,
    konjunktur_effekt: (api as { konjunktur_effekt?: number }).konjunktur_effekt ?? 0,
    konjunktur_lag: (api as { konjunktur_lag?: number }).konjunktur_lag ?? 0,
  };
}

function transformEventChoice(api: {
  key: string;
  type: string;
  cost_pk: number;
  effekte: { al?: number; hh?: number; gi?: number; zf?: number };
  char_mood: Record<string, number>;
  label: string;
  desc: string;
  log_msg: string;
  loyalty?: Record<string, number>;
  koalitionspartner_beziehung_delta?: number;
  medienklima_delta?: number;
  verfahren_dauer_monate?: number;
  bundesrat_bonus?: number;
}): EventChoice {
  const type = (['primary', 'danger', 'safe'].includes(api.type)
    ? api.type
    : 'safe') as 'primary' | 'danger' | 'safe';
  const choice: EventChoice = {
    label: api.label,
    desc: api.desc,
    cost: api.cost_pk,
    type,
    effect: api.effekte,
    charMood: api.char_mood,
    loyalty: api.loyalty,
    log: api.log_msg,
    key: api.key,
  };
  if (api.koalitionspartner_beziehung_delta != null) {
    choice.koalitionspartnerBeziehung = api.koalitionspartner_beziehung_delta;
  }
  if (api.medienklima_delta != null) {
    choice.medienklima_delta = api.medienklima_delta;
  }
  if (api.verfahren_dauer_monate != null) {
    choice.verfahrenDauerMonate = api.verfahren_dauer_monate;
  }
  if (api.bundesrat_bonus != null) {
    choice.bundesratBonusAll = api.bundesrat_bonus;
  }
  return choice;
}

function transformEvent(api: EventApi): GameEvent {
  const eventType = EVENT_TYPE_MAP[api.event_type] ?? 'info';
  const icon = EVENT_TYPE_ICON_KEYS[api.event_type] ?? 'random';
  const ev: GameEvent = {
    id: api.id,
    type: eventType,
    icon,
    typeLabel: api.type_label,
    title: api.title,
    quote: api.quote,
    context: api.context,
    ticker: api.ticker,
    choices: api.choices.map(transformEventChoice),
  };
  if (api.politikfeld_id) ev.politikfeldId = api.politikfeld_id;
  if (api.trigger_druck_min != null) ev.triggerDruckMin = api.trigger_druck_min;
  if (api.trigger_milieu_key) ev.triggerMilieuKey = api.trigger_milieu_key;
  if (api.trigger_milieu_op) ev.triggerMilieuOp = api.trigger_milieu_op;
  if (api.trigger_milieu_val != null) ev.triggerMilieuVal = api.trigger_milieu_val;
  if (api.gesetz_ref?.length) ev.gesetzRef = api.gesetz_ref;
  if (api.min_complexity != null) ev.min_complexity = api.min_complexity;
  return ev;
}

function transformBundesratFraktion(api: BundesratFraktionApi): BundesratFraktion {
  return {
    id: api.id,
    name: api.name,
    sprecher: {
      name: api.sprecher_name,
      partei: api.sprecher_partei,
      land: api.sprecher_land,
      initials: api.sprecher_initials,
      color: api.sprecher_color,
      bio: api.sprecher_bio,
    },
    laender: api.laender ?? [],
    basisBereitschaft: api.basis_bereitschaft,
    beziehung: api.beziehung_start,
    tradeoffPool: (api.tradeoffs ?? []).map((t) => ({
      id: t.key,
      label: t.label,
      desc: t.desc,
      effect: t.effekte,
      charMood: t.char_mood,
    })),
    sonderregel: api.sonderregel ?? undefined,
  };
}

const MILIEU_DEFAULTS: Record<string, { gewicht: number; basisbeteiligung: number; kurz: string }> = {
  postmaterielle: { gewicht: 12, basisbeteiligung: 85, kurz: 'Postmat.' },
  soziale_mitte: { gewicht: 18, basisbeteiligung: 72, kurz: 'Soz. Mitte' },
  prekaere: { gewicht: 14, basisbeteiligung: 55, kurz: 'Prekär' },
  buergerliche_mitte: { gewicht: 22, basisbeteiligung: 78, kurz: 'Bürg. Mitte' },
  leistungstraeger: { gewicht: 16, basisbeteiligung: 68, kurz: 'Leistung' },
  etablierte: { gewicht: 10, basisbeteiligung: 88, kurz: 'Etabliert' },
  traditionelle: { gewicht: 8, basisbeteiligung: 62, kurz: 'Tradition' },
};

function transformMilieu(api: MilieuApi): Milieu {
  const def = MILIEU_DEFAULTS[api.id];
  return {
    id: api.id,
    ideologie: api.ideologie,
    min_complexity: api.min_complexity,
    gewicht: api.gewicht ?? def?.gewicht ?? 14,
    basisbeteiligung: api.basisbeteiligung ?? def?.basisbeteiligung ?? 70,
    kurz: api.kurz ?? api.kurzcharakter ?? def?.kurz ?? api.id,
    beschreibung: api.beschreibung,
  };
}

function transformPolitikfeld(api: PolitikfeldApi, verbaende: VerbandApi[]): Politikfeld {
  const verband = verbaende.find((v) => v.politikfeld_id === api.id);
  return {
    id: api.id,
    verbandId: api.verband_id ?? verband?.id ?? null,
    druckEventId: api.druck_event_id ?? null,
  };
}

function transformVerband(api: VerbandApi): import('../core/types').Verband {
  return {
    id: api.id,
    kurz: api.kurz,
    name: api.name,
    politikfeld_id: api.politikfeld_id,
    beziehung_start: api.beziehung_start,
    tradeoffs: (api.tradeoffs ?? []).map((t) => ({
      key: t.key,
      cost_pk: t.cost_pk ?? 0,
      effekte: t.effekte ?? {},
      feld_druck_delta: t.feld_druck_delta ?? 0,
      medienklima_delta: t.medienklima_delta ?? 0,
      verband_effekte: t.verband_effekte ?? {},
      label: t.label,
      desc: t.desc,
    })),
  };
}

/** SMA-312: API-Format für Gesetz-Relation */
export interface GesetzRelationApi {
  gesetz_a_id: string;
  gesetz_b_id: string;
  relation_typ: 'requires' | 'excludes' | 'enhances';
  beschreibung_de?: string | null;
  enhances_faktor?: number | null;
}

export interface ContentStore {
  chars: Character[];
  gesetze: Law[];
  events: GameEvent[];
  charEvents: Record<string, GameEvent>;
  bundesratEvents: GameEvent[];
  kommunalEvents: GameEvent[];
  vorstufenEvents: GameEvent[];
  extremismusEvents: GameEvent[];
  kommunalLaenderEvents: GameEvent[];
  steuerEvents: GameEvent[];
  bundesrat: BundesratLand[];
  bundesratFraktionen: BundesratFraktion[];
  milieus: Milieu[];
  politikfelder: Politikfeld[];
  verbaende: import('../core/types').Verband[];
  ministerialInitiativen: import('../core/types').MinisterialInitiative[];
  euKlimaStartwerte: { politikfeld_id: string; startwert: number }[];
  euEvents: import('../core/types').EUEventContent[];
  /** SMA-312: Gesetz-Abhängigkeiten — gesetzId -> Relationen */
  gesetzRelationen: Record<string, GesetzRelation[]>;
  scenario: ContentBundle['scenario'];
  loading: boolean;
  loaded: boolean;
  error: string | null;
  load: (locale: string) => Promise<void>;
}

function buildGesetzRelationen(api: GesetzRelationApi[]): Record<string, GesetzRelation[]> {
  const out: Record<string, GesetzRelation[]> = {};
  for (const r of api) {
    const rel: GesetzRelation = {
      typ: r.relation_typ,
      targetId: r.gesetz_b_id,
      beschreibung: r.beschreibung_de ?? undefined,
      enhancesFaktor: r.enhances_faktor ?? undefined,
    };
    if (!out[r.gesetz_a_id]) out[r.gesetz_a_id] = [];
    out[r.gesetz_a_id].push(rel);
  }
  return out;
}

export const useContentStore = create<ContentStore>((set) => ({
  chars: [],
  gesetze: [],
  events: [],
  charEvents: {},
  bundesratEvents: [],
  kommunalEvents: [],
  vorstufenEvents: [],
  extremismusEvents: [],
  kommunalLaenderEvents: [],
  steuerEvents: [],
  bundesrat: DEFAULT_BUNDESRAT,
  bundesratFraktionen: [],
  milieus: [],
  politikfelder: [],
  verbaende: DEFAULT_VERBAENDE,
  ministerialInitiativen: DEFAULT_MINISTERIAL_INITIATIVEN,
  euKlimaStartwerte: [],
  euEvents: [],
  gesetzRelationen: {},
  scenario: DEFAULT_SCENARIO,
  loading: false,
  loaded: false,
  error: null,

  load: async (locale: string) => {
    set({ error: null, loaded: false, loading: true });
    try {
      const [chars, gesetze, eventsAll, bundesratFraktionen, milieusRaw, politikfelderRaw, verbaendeRaw, gesetzRelationenRaw] =
        await Promise.all([
          apiFetch<CharApi[]>(`/content/chars?locale=${locale}`),
          apiFetch<GesetzApi[]>(`/content/gesetze?locale=${locale}`),
          apiFetch<EventApi[]>(`/content/events?locale=${locale}`),
          apiFetch<BundesratFraktionApi[]>(`/content/bundesrat?locale=${locale}`),
          apiFetch<MilieuApi[]>(`/content/milieus?locale=${locale}`).catch(() => []),
          apiFetch<PolitikfeldApi[]>(`/content/politikfelder?locale=${locale}`).catch(() => []),
          apiFetch<VerbandApi[]>(`/content/verbaende?locale=${locale}`).catch(() => []),
          apiFetch<GesetzRelationApi[]>(`/content/gesetz-relationen`).catch(() => []),
        ]);

      const events = eventsAll.map(transformEvent);
      const eventTypeById = new Map(eventsAll.map((a) => [a.id, a.event_type]));
      const randomEvents = events.filter((e) => eventTypeById.get(e.id) === 'random');
      const charEventsList = events.filter((e) => eventTypeById.get(e.id) === 'char_ultimatum');
      const brEventsList = events.filter((e) => eventTypeById.get(e.id) === 'bundesrat');
      const kommunalEventsList = events.filter((e) => eventTypeById.get(e.id) === 'kommunal_initiative');
      const vorstufenEventsList = events.filter((e) => eventTypeById.get(e.id) === 'vorstufe_erfolg');
      const extremismusEventsList = events.filter((e) =>
        ['koalitionspartner_extremismus_warnung', 'verfassungsgericht_klage'].includes(e.id),
      );
      const kommunalLaenderEventsList = events.filter((e) =>
        ['kommunal_haushaltskrise', 'kommunal_buergerprotest', 'laender_koalitionskrise'].includes(e.id),
      );
      const steuerEventsList = events.filter((e) =>
        ['steuerstreit_koalition', 'steuereinnahmen_einbruch', 'haushaltsstreit_opposition'].includes(e.id),
      );

      const charEventsMap: Record<string, GameEvent> = {};
      for (const ev of charEventsList) {
        charEventsMap[ev.id] = ev;
      }

      const bundesratEventsResolved =
        brEventsList.length > 0 ? brEventsList : BUNDESRAT_EVENTS;

      const milieus = (milieusRaw ?? []).map(transformMilieu);
      const verbaende = (verbaendeRaw ?? []).length > 0
        ? (verbaendeRaw ?? []).map(transformVerband)
        : DEFAULT_VERBAENDE;
      const politikfelder = (politikfelderRaw ?? []).map((p) => transformPolitikfeld(p, verbaendeRaw ?? []));

      set({
        chars: chars.map(transformChar),
        gesetze: gesetze.map(transformGesetz),
        events: randomEvents.length > 0 ? randomEvents : events,
        charEvents: charEventsMap,
        bundesratEvents: bundesratEventsResolved,
        kommunalEvents: kommunalEventsList,
        vorstufenEvents: vorstufenEventsList,
        extremismusEvents: extremismusEventsList,
        kommunalLaenderEvents: kommunalLaenderEventsList,
        steuerEvents: steuerEventsList,
        bundesratFraktionen: bundesratFraktionen.map(transformBundesratFraktion),
        milieus,
        politikfelder,
        verbaende,
        ministerialInitiativen: DEFAULT_MINISTERIAL_INITIATIVEN,
        gesetzRelationen: buildGesetzRelationen(gesetzRelationenRaw ?? []),
        loading: false,
        loaded: true,
        error: null,
      });
    } catch {
      set({
        error: 'Inhalte konnten nicht geladen werden.',
        loading: false,
        loaded: false,
      });
    }
  },
}));

/** Koalitions-Events (immer verfügbar für Koalitionspartner-System) */
const KOALITION_CHAR_EVENTS: Record<string, GameEvent> = {
  koalitionsbruch: KOALITIONSBRUCH_EVENT,
  koalitionskrise_ultimatum: KOALITIONSKRISE_ULTIMATUM_EVENT,
};

/** Erstellt ContentBundle aus dem aktuellen Store-Zustand */
export function getContentBundle(): ContentBundle {
  const s = useContentStore.getState();
  const wahlkampfEvents = [
    WAHLKAMPF_BEGINN_EVENT,
    TV_DUELL_EVENT,
    KOALITIONSPARTNER_ALLEINGANG_EVENT,
    WAHLKAMPF_THEMA_WAHL_EVENT,
    WAHLKAMPF_VERSPRECHEN_EVENT,
  ];
  return {
    characters: s.chars,
    laws: s.gesetze,
    events: [...wahlkampfEvents, ...s.events],
    charEvents: { ...KOALITION_CHAR_EVENTS, ...s.charEvents },
    bundesratEvents: s.bundesratEvents,
    kommunalEvents: s.kommunalEvents ?? [],
    vorstufenEvents: s.vorstufenEvents ?? [],
    extremismusEvents: s.extremismusEvents ?? [],
    kommunalLaenderEvents: s.kommunalLaenderEvents ?? [],
    steuerEvents: s.steuerEvents ?? [],
    bundesrat: s.bundesrat,
    bundesratFraktionen: s.bundesratFraktionen,
    koalitionspartner: GRUENE,
    milieus: s.milieus,
    politikfelder: s.politikfelder,
    verbaende: s.verbaende?.length ? s.verbaende : DEFAULT_VERBAENDE,
    ministerialInitiativen: s.ministerialInitiativen?.length ? s.ministerialInitiativen : DEFAULT_MINISTERIAL_INITIATIVEN,
    euKlimaStartwerte: s.euKlimaStartwerte ?? [],
    euEvents: s.euEvents ?? [],
    gesetzRelationen: s.gesetzRelationen,
    medienEvents: DEFAULT_MEDIEN_EVENTS,
    scenario: s.scenario,
  };
}

export { SPRECHER_ERSATZ, LANDTAGSWAHL_TRANSITIONS };
