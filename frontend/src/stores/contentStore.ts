import { create } from 'zustand';
import { apiFetch } from '../services/api';
import type {
  CharApi,
  GesetzApi,
  EventApi,
  BundesratFraktionApi,
} from '../types/content';
import type {
  ContentBundle,
  Character,
  Law,
  GameEvent,
  EventChoice,
  BundesratFraktion,
  BundesratLand,
} from '../core/types';
import { DEFAULT_BUNDESRAT, DEFAULT_SCENARIO } from '../data/defaults/scenarios';
import {
  BUNDESRAT_EVENTS,
  SPRECHER_ERSATZ,
  LANDTAGSWAHL_TRANSITIONS,
} from '../data/defaults/bundesratEvents';

const EVENT_TYPE_ICONS: Record<string, string> = {
  danger: '🔴',
  warn: '⚠️',
  good: '✅',
  info: '📢',
  random: '📰',
  char_ultimatum: '💼',
  bundesrat: '🏛️',
};

const EVENT_TYPE_MAP: Record<string, 'danger' | 'warn' | 'good' | 'info'> = {
  danger: 'danger',
  warn: 'warn',
  good: 'good',
  info: 'info',
  random: 'info',
  char_ultimatum: 'danger',
  bundesrat: 'warn',
};

function transformChar(api: CharApi): Character {
  return {
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
}): EventChoice {
  const type = (['primary', 'danger', 'safe'].includes(api.type)
    ? api.type
    : 'safe') as 'primary' | 'danger' | 'safe';
  return {
    label: api.label,
    desc: api.desc,
    cost: api.cost_pk,
    type,
    effect: api.effekte,
    charMood: api.char_mood,
    loyalty: api.loyalty,
    log: api.log_msg,
  };
}

function transformEvent(api: EventApi): GameEvent {
  const eventType = EVENT_TYPE_MAP[api.event_type] ?? 'info';
  const icon = EVENT_TYPE_ICONS[api.event_type] ?? '📰';
  return {
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

export interface ContentStore {
  chars: Character[];
  gesetze: Law[];
  events: GameEvent[];
  charEvents: Record<string, GameEvent>;
  bundesratEvents: GameEvent[];
  bundesrat: BundesratLand[];
  bundesratFraktionen: BundesratFraktion[];
  scenario: ContentBundle['scenario'];
  loaded: boolean;
  error: string | null;
  load: (locale: string) => Promise<void>;
}

export const useContentStore = create<ContentStore>((set) => ({
  chars: [],
  gesetze: [],
  events: [],
  charEvents: {},
  bundesratEvents: [],
  bundesrat: DEFAULT_BUNDESRAT,
  bundesratFraktionen: [],
  scenario: DEFAULT_SCENARIO,
  loaded: false,
  error: null,

  load: async (locale: string) => {
    set({ error: null, loaded: false });
    try {
      const [chars, gesetze, eventsAll, bundesratFraktionen] = await Promise.all([
        apiFetch<CharApi[]>(`/content/chars?locale=${locale}`),
        apiFetch<GesetzApi[]>(`/content/gesetze?locale=${locale}`),
        apiFetch<EventApi[]>(`/content/events?locale=${locale}`),
        apiFetch<BundesratFraktionApi[]>(`/content/bundesrat?locale=${locale}`),
      ]);

      const events = eventsAll.map(transformEvent);
      const eventTypeById = new Map(eventsAll.map((a) => [a.id, a.event_type]));
      const randomEvents = events.filter((e) => eventTypeById.get(e.id) === 'random');
      const charEventsList = events.filter((e) => eventTypeById.get(e.id) === 'char_ultimatum');
      const brEventsList = events.filter((e) => eventTypeById.get(e.id) === 'bundesrat');

      const charEventsMap: Record<string, GameEvent> = {};
      for (const ev of charEventsList) {
        charEventsMap[ev.id] = ev;
      }

      const bundesratEventsResolved =
        brEventsList.length > 0 ? brEventsList : BUNDESRAT_EVENTS;

      set({
        chars: chars.map(transformChar),
        gesetze: gesetze.map(transformGesetz),
        events: randomEvents.length > 0 ? randomEvents : events,
        charEvents: charEventsMap,
        bundesratEvents: bundesratEventsResolved,
        bundesratFraktionen: bundesratFraktionen.map(transformBundesratFraktion),
        loaded: true,
        error: null,
      });
    } catch {
      set({
        error: 'Inhalte konnten nicht geladen werden.',
        loaded: false,
      });
    }
  },
}));

/** Erstellt ContentBundle aus dem aktuellen Store-Zustand */
export function getContentBundle(): ContentBundle {
  const s = useContentStore.getState();
  return {
    characters: s.chars,
    laws: s.gesetze,
    events: s.events,
    charEvents: s.charEvents,
    bundesratEvents: s.bundesratEvents,
    bundesrat: s.bundesrat,
    bundesratFraktionen: s.bundesratFraktionen,
    scenario: s.scenario,
  };
}

export { SPRECHER_ERSATZ, LANDTAGSWAHL_TRANSITIONS };
