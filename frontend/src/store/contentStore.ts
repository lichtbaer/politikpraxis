import { create } from 'zustand';
import { logger } from '../utils/logger';
import i18n from '../i18n';
import { apiFetch } from '../services/api';
import type {
  CharApi,
  GesetzApi,
  EventApi,
  BundesratFraktionApi,
  BundeslandApi,
  MilieuApi,
  PolitikfeldApi,
  VerbandApi,
  MedienAkteurApi,
} from '../types/content';
import type {
  ContentBundle,
  Character,
  Law,
  GameEvent,
  EventChoice,
  BundesratFraktion,
  BundesratLand,
  BundeslandContent,
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
  WAHLKAMPF_ZWISCHENBILANZ_EVENT,
} from '../data/defaults/wahlkampfEvents';
import { DEFAULT_MEDIEN_EVENTS } from '../data/defaults/medienEvents';
import { DEFAULT_MEDIEN_AKTEURE, type MedienAkteurContent, type MedienAkteurTyp } from '../data/defaults/medienAkteure';

/** Leichtgewichtige Laufzeit-Guard für API-Rohdaten.
 *  Warnt bei unerwarteter Struktur und gibt einen sicheren Fallback zurück. */
function guardString(val: unknown, path: string, fallback = ''): string {
  if (typeof val === 'string') return val;
  logger.warn(`ContentGuard: ${path} ist kein String (${typeof val}), Fallback: "${fallback}"`);
  return fallback;
}

function guardNumber(val: unknown, path: string, fallback = 0): number {
  if (typeof val === 'number' && isFinite(val)) return val;
  const n = Number(val);
  if (!isNaN(n) && isFinite(n)) return n;
  logger.warn(`ContentGuard: ${path} ist keine gültige Zahl (${String(val)}), Fallback: ${fallback}`);
  return fallback;
}

function guardArray<T>(val: unknown, path: string): T[] {
  if (Array.isArray(val)) return val as T[];
  logger.warn(`ContentGuard: ${path} ist kein Array (${typeof val}), Fallback: []`);
  return [];
}

function guardObject<T extends object>(val: unknown, path: string, fallback: T): T {
  if (val !== null && typeof val === 'object' && !Array.isArray(val)) return val as T;
  logger.warn(`ContentGuard: ${path} ist kein Objekt (${typeof val}), Fallback: {}`);
  return fallback;
}

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
  dynamic: 'random',
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
  dynamic: 'warn',
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
  const id = guardString(api.id, 'Gesetz.id', '_unknown_');
  const tags = guardArray<'bund' | 'eu' | 'land' | 'kommune'>(api.tags, `Gesetz[${id}].tags`);
  const btJa = guardNumber(api.bt_stimmen_ja, `Gesetz[${id}].bt_stimmen_ja`, 50);
  const law: Law = {
    id,
    titel: guardString(api.titel, `Gesetz[${id}].titel`, id),
    kurz: guardString(api.kurz, `Gesetz[${id}].kurz`, ''),
    desc: guardString(api.desc, `Gesetz[${id}].desc`, ''),
    tags,
    status: 'entwurf',
    ja: btJa,
    nein: 100 - btJa,
    effekte: api.effekte,
    lag: api.effekt_lag,
    expanded: false,
    route: null,
    rprog: 0,
    rdur: 0,
    blockiert: null,
    ideologie: api.ideologie,
    ideologie_wert: api.ideologie_wert ?? null,
    politikfeldId: api.politikfeld_id ?? null,
    politikfeldSekundaer: api.politikfeld_sekundaer ?? [],
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
    sektor_effekte: (api as { sektor_effekte?: Law['sektor_effekte'] }).sektor_effekte ?? [],
    // Art. 77 GG: Einspruchsgesetz vs. Zustimmungsgesetz.
    // Default: land-Gesetze sind zustimmungspflichtig, es sei denn explizit als Einspruchsgesetz markiert.
    zustimmungspflichtig: api.zustimmungspflichtig ?? (tags.includes('land') ? true : undefined),
  };
  if (api.locked_until_event) {
    law.locked_until_event = api.locked_until_event;
  }
  return law;
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
  milieu_delta?: Record<string, number>;
  schuldenbremse_spielraum_delta?: number;
  steuerpolitik_modifikator_delta?: number;
  konjunktur_index_delta?: number;
  br_relation_json?: Record<string, number>;
  verband_delta?: Record<string, number>;
  sektor_delta?: Record<string, number>;
  haushalt_saldo_delta_mrd?: number;
}): EventChoice {
  const choiceKey = guardString(api.key, 'EventChoice.key', '_choice_');
  const type = (['primary', 'danger', 'safe'].includes(api.type)
    ? api.type
    : 'safe') as 'primary' | 'danger' | 'safe';
  const choice: EventChoice = {
    label: guardString(api.label, `EventChoice[${choiceKey}].label`, choiceKey),
    desc: guardString(api.desc, `EventChoice[${choiceKey}].desc`, ''),
    cost: guardNumber(api.cost_pk, `EventChoice[${choiceKey}].cost_pk`, 0),
    type,
    effect: guardObject(api.effekte, `EventChoice[${choiceKey}].effekte`, {}),
    charMood: guardObject(api.char_mood, `EventChoice[${choiceKey}].char_mood`, {}),
    loyalty: api.loyalty,
    log: guardString(api.log_msg, `EventChoice[${choiceKey}].log_msg`, ''),
    key: choiceKey,
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
  if (api.milieu_delta && Object.keys(api.milieu_delta).length) {
    choice.milieuDelta = api.milieu_delta;
  }
  if (api.schuldenbremse_spielraum_delta != null) {
    choice.schuldenbremseSpielraumDelta = api.schuldenbremse_spielraum_delta;
  }
  if (api.steuerpolitik_modifikator_delta != null) {
    choice.steuerpolitikModifikatorDelta = api.steuerpolitik_modifikator_delta;
  }
  if (api.konjunktur_index_delta != null) {
    choice.konjunkturIndexDelta = api.konjunktur_index_delta;
  }
  if (api.br_relation_json && Object.keys(api.br_relation_json).length) {
    choice.brRelationJson = api.br_relation_json;
  }
  if (api.verband_delta && Object.keys(api.verband_delta).length) {
    choice.verbandDelta = api.verband_delta;
  }
  if (api.sektor_delta && Object.keys(api.sektor_delta).length) {
    choice.sektorDelta = api.sektor_delta;
  }
  if (api.haushalt_saldo_delta_mrd != null) {
    choice.haushaltSaldoDeltaMrd = api.haushalt_saldo_delta_mrd;
  }
  return choice;
}

function transformEvent(api: EventApi): GameEvent {
  const id = guardString(api.id, 'Event.id', '_unknown_event_');
  const eventType = EVENT_TYPE_MAP[api.event_type] ?? 'info';
  const icon = EVENT_TYPE_ICON_KEYS[api.event_type] ?? 'random';
  const choices = guardArray<Parameters<typeof transformEventChoice>[0]>(api.choices, `Event[${id}].choices`);
  const ev: GameEvent = {
    id,
    type: eventType,
    icon,
    typeLabel: guardString(api.type_label, `Event[${id}].type_label`, ''),
    title: guardString(api.title, `Event[${id}].title`, id),
    quote: api.quote,
    context: api.context,
    ticker: api.ticker,
    choices: choices.map(transformEventChoice),
  };
  if (api.politikfeld_id) ev.politikfeldId = api.politikfeld_id;
  if (api.trigger_druck_min != null) ev.triggerDruckMin = api.trigger_druck_min;
  if (api.trigger_milieu_key) ev.triggerMilieuKey = api.trigger_milieu_key;
  if (api.trigger_milieu_op) ev.triggerMilieuOp = api.trigger_milieu_op;
  if (api.trigger_milieu_val != null) ev.triggerMilieuVal = api.trigger_milieu_val;
  if (api.gesetz_ref?.length) ev.gesetzRef = api.gesetz_ref;
  if (api.min_complexity != null) ev.min_complexity = api.min_complexity;
  if (api.trigger_typ) {
    ev.triggerTyp = api.trigger_typ as import('../core/types').DynamicEventTriggerTyp;
  }
  if (api.trigger_params) ev.triggerParams = api.trigger_params;
  if (api.einmalig != null) ev.einmalig = api.einmalig;
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
  beschreibung?: string | null;
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
  bundeslaender: BundeslandContent[];
  bundesratFraktionen: BundesratFraktion[];
  milieus: Milieu[];
  politikfelder: Politikfeld[];
  verbaende: import('../core/types').Verband[];
  ministerialInitiativen: import('../core/types').MinisterialInitiative[];
  euKlimaStartwerte: { politikfeld_id: string; startwert: number }[];
  euEvents: import('../core/types').EUEventContent[];
  /** SMA-312: Gesetz-Abhängigkeiten — gesetzId -> Relationen */
  gesetzRelationen: Record<string, GesetzRelation[]>;
  medienAkteureContent: ContentBundle['medienAkteureContent'];
  dynamicEvents: GameEvent[];
  scenario: ContentBundle['scenario'];
  loading: boolean;
  loaded: boolean;
  error: string | null;
  load: (locale: string) => Promise<void>;
}

function transformBundesland(api: BundeslandApi): BundeslandContent {
  return {
    id: api.id,
    name: api.name,
    partei: api.partei,
    koalition: api.koalition ?? [],
    bundesrat_fraktion: api.bundesrat_fraktion as BundeslandContent['bundesrat_fraktion'],
    wirtschaft_typ: api.wirtschaft_typ as BundeslandContent['wirtschaft_typ'],
    themen: api.themen ?? [],
    beziehung_start: api.beziehung_start,
    stimmgewicht: api.stimmgewicht,
    min_complexity: api.min_complexity,
  };
}

function transformMedienAkteur(api: MedienAkteurApi): MedienAkteurContent {
  return {
    id: api.id,
    name: api.name,
    typ: api.typ as MedienAkteurTyp,
    reichweite: api.reichweite,
    stimmung_start: api.stimmung_start,
    min_complexity: api.min_complexity,
  };
}

function buildGesetzRelationen(api: GesetzRelationApi[]): Record<string, GesetzRelation[]> {
  const out: Record<string, GesetzRelation[]> = {};
  for (const r of api) {
    const rel: GesetzRelation = {
      typ: r.relation_typ,
      targetId: r.gesetz_b_id,
      beschreibung: r.beschreibung ?? undefined,
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
  bundeslaender: [],
  bundesratFraktionen: [],
  milieus: [],
  politikfelder: [],
  verbaende: DEFAULT_VERBAENDE,
  ministerialInitiativen: DEFAULT_MINISTERIAL_INITIATIVEN,
  euKlimaStartwerte: [],
  euEvents: [],
  gesetzRelationen: {},
  medienAkteureContent: undefined,
  dynamicEvents: [],
  scenario: DEFAULT_SCENARIO,
  loading: false,
  loaded: false,
  error: null,

  load: async (locale: string) => {
    set({ error: null, loaded: false, loading: true });
    try {
      const [
        chars,
        gesetze,
        eventsAll,
        bundesratFraktionen,
        milieusRaw,
        politikfelderRaw,
        verbaendeRaw,
        gesetzRelationenRaw,
        medienAkteureRaw,
        bundeslaenderRaw,
      ] =
        await Promise.all([
          apiFetch<CharApi[]>(`/content/chars?locale=${locale}`),
          apiFetch<GesetzApi[]>(`/content/gesetze?locale=${locale}`),
          apiFetch<EventApi[]>(`/content/events?locale=${locale}`),
          apiFetch<BundesratFraktionApi[]>(`/content/bundesrat?locale=${locale}`),
          apiFetch<MilieuApi[]>(`/content/milieus?locale=${locale}`).catch(() => []),
          apiFetch<PolitikfeldApi[]>(`/content/politikfelder?locale=${locale}`).catch(() => []),
          apiFetch<VerbandApi[]>(`/content/verbaende?locale=${locale}`).catch(() => []),
          apiFetch<GesetzRelationApi[]>(`/content/gesetz-relationen?locale=${locale}`).catch(() => []),
          apiFetch<MedienAkteurApi[]>(`/content/medien-akteure?locale=${locale}`).catch(() => []),
          apiFetch<BundeslandApi[]>(`/content/bundeslaender?locale=${locale}`).catch(() => []),
        ]);

      const events = eventsAll.map(transformEvent);

      // Kategorisiere Events in einem Durchlauf statt 8 separater .filter()-Aufrufe
      const eventTypeById = new Map(eventsAll.map((a) => [a.id, a.event_type]));
      const byType: Record<string, GameEvent[]> = {};
      const charEventsMap: Record<string, GameEvent> = {};
      const SPECIAL_IDS: Record<string, string> = {
        koalitionspartner_extremismus_warnung: 'extremismus',
        verfassungsgericht_klage: 'extremismus',
        kommunal_haushaltskrise: 'kommunal_laender',
        kommunal_buergerprotest: 'kommunal_laender',
        laender_koalitionskrise: 'kommunal_laender',
        steuerstreit_koalition: 'steuer',
        steuereinnahmen_einbruch: 'steuer',
        haushaltsstreit_opposition: 'steuer',
      };
      for (const ev of events) {
        const type = eventTypeById.get(ev.id) ?? 'random';
        if (ev.id in SPECIAL_IDS) {
          const cat = SPECIAL_IDS[ev.id];
          (byType[cat] ??= []).push(ev);
        }
        (byType[type] ??= []).push(ev);
        if (type === 'char_ultimatum') charEventsMap[ev.id] = ev;
      }
      const dynamicEventsList = byType['dynamic'] ?? [];
      const randomEvents = (byType['random'] ?? []).filter(
        (e) => eventTypeById.get(e.id) !== 'dynamic',
      );
      const brEventsList = byType['bundesrat'] ?? [];
      const kommunalEventsList = byType['kommunal_initiative'] ?? [];
      const vorstufenEventsList = byType['vorstufe_erfolg'] ?? [];
      const extremismusEventsList = byType['extremismus'] ?? [];
      const kommunalLaenderEventsList = byType['kommunal_laender'] ?? [];
      const steuerEventsList = byType['steuer'] ?? [];

      const bundesratEventsResolved =
        brEventsList.length > 0 ? brEventsList : BUNDESRAT_EVENTS;

      const milieus = (milieusRaw ?? []).map(transformMilieu);
      const verbaende = (verbaendeRaw ?? []).length > 0
        ? (verbaendeRaw ?? []).map(transformVerband)
        : DEFAULT_VERBAENDE;
      const politikfelder = (politikfelderRaw ?? []).map((p) => transformPolitikfeld(p, verbaendeRaw ?? []));

      const medienAkteureContent =
        medienAkteureRaw && medienAkteureRaw.length > 0
          ? medienAkteureRaw.map(transformMedienAkteur)
          : DEFAULT_MEDIEN_AKTEURE;

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
        bundeslaender: (bundeslaenderRaw ?? []).map(transformBundesland),
        milieus,
        politikfelder,
        verbaende,
        ministerialInitiativen: DEFAULT_MINISTERIAL_INITIATIVEN,
        gesetzRelationen: buildGesetzRelationen(gesetzRelationenRaw ?? []),
        medienAkteureContent,
        dynamicEvents: dynamicEventsList,
        loading: false,
        loaded: true,
        error: null,
      });
    } catch {
      set({
        error: i18n.t('contentError'),
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

/** Erstellt ContentBundle aus dem aktuellen Store-Zustand.
 *  Warnt wenn kritische Daten fehlen (z.B. vor vollständigem Laden). */
export function getContentBundle(): ContentBundle {
  const s = useContentStore.getState();
  if (!s.chars.length || !s.gesetze.length) {
    logger.warn('ContentBundle: Kritische Daten fehlen — Content noch nicht vollständig geladen');
  }
  const wahlkampfEvents = [
    WAHLKAMPF_BEGINN_EVENT,
    TV_DUELL_EVENT,
    KOALITIONSPARTNER_ALLEINGANG_EVENT,
    WAHLKAMPF_THEMA_WAHL_EVENT,
    WAHLKAMPF_VERSPRECHEN_EVENT,
    WAHLKAMPF_ZWISCHENBILANZ_EVENT,
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
    dynamicEvents: s.dynamicEvents ?? [],
    bundesrat: s.bundesrat,
    bundeslaender: s.bundeslaender?.length ? s.bundeslaender : undefined,
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
    medienAkteureContent:
      s.medienAkteureContent && s.medienAkteureContent.length > 0
        ? s.medienAkteureContent
        : DEFAULT_MEDIEN_AKTEURE,
    scenario: s.scenario,
  };
}

export { SPRECHER_ERSATZ, LANDTAGSWAHL_TRANSITIONS };
