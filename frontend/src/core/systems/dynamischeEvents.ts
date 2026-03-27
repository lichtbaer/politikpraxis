/**
 * SMA-394: Zustandsabhängige dynamische Events (Trigger pro Monat).
 * Daten kommen aus ContentBundle.dynamicEvents (event_type dynamic in DB).
 */
import type { ContentBundle, EventChoice, GameEvent, GameState } from '../types';
import { clamp, KONJUNKTUR_INDEX_MIN, KONJUNKTUR_INDEX_MAX } from '../constants';
import { withPause, getAutoPauseLevel } from '../eventPause';
import { scheduleEffects } from './economy';
import { featureActive } from './features';
import { addLog } from '../log';
import { getEventNamespace } from '../eventNamespaces';
import { applyMoodChange } from './characters';
import { adjustMedienKlimaGlobal } from './medienklima';
import i18n from '../../i18n';

export interface DynamicResolveOptions {
  complexity?: number;
  contentBundle?: ContentBundle;
}

function partnerParteiId(state: GameState): string | undefined {
  return state.koalitionspartner?.id;
}

function countConsecutiveMonthsUnder(
  history: number[] | undefined,
  threshold: number,
  required: number,
): boolean {
  if (!history?.length || required <= 0) return false;
  let run = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i]! < threshold) {
      run++;
      if (run >= required) return true;
    } else {
      break;
    }
  }
  return false;
}

function countConsecutiveMonthsCondition(
  history: number[] | undefined,
  pred: (v: number) => boolean,
  required: number,
): boolean {
  if (!history?.length || required <= 0) return false;
  let run = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    if (pred(history[i]!)) {
      run++;
      if (run >= required) return true;
    } else {
      break;
    }
  }
  return false;
}

function alreadyFiredDynamic(state: GameState, id: string, einmalig: boolean | undefined): boolean {
  if (!einmalig) return false;
  const aus = state.ausgeloesteEvents ?? [];
  return aus.includes(id) || state.firedEvents.includes(id);
}

function markFiredDynamic(state: GameState, id: string, einmalig: boolean | undefined): Partial<GameState> {
  if (!einmalig) return {};
  const aus = [...(state.ausgeloesteEvents ?? [])];
  if (!aus.includes(id)) aus.push(id);
  const fe = state.firedEvents.includes(id) ? state.firedEvents : [...state.firedEvents, id];
  return { ausgeloesteEvents: aus, firedEvents: fe };
}

/** Haushalt: Saldo um delta Mrd. verschieben (negative delta = Mehrausgaben) */
function applyHaushaltSaldoDelta(state: GameState, deltaMrd: number): GameState {
  const h = state.haushalt;
  if (!h) return state;
  const la = Math.max(0, h.laufendeAusgaben - deltaMrd);
  const saldo = h.einnahmen - h.pflichtausgaben - la;
  return { ...state, haushalt: { ...h, laufendeAusgaben: la, saldo } };
}

function applyRezessionEintritt(state: GameState): GameState {
  let s = scheduleEffects(state, {
    effekte: { al: 3 },
    lag: 1,
    kurz: 'Rezession: Arbeitsmarkt',
  });
  const h = s.haushalt;
  if (h) {
    const steuerpolitikModifikator = Math.max(0.5, h.steuerpolitikModifikator - 0.15);
    const schuldenbremseSpielraum = (h.schuldenbremseSpielraum ?? 13) + 2;
    const einnahmen = Math.round(
      h.einnahmen * (steuerpolitikModifikator / h.steuerpolitikModifikator),
    );
    s = {
      ...s,
      haushalt: {
        ...h,
        steuerpolitikModifikator,
        schuldenbremseSpielraum,
        einnahmen,
        saldo: einnahmen - h.pflichtausgaben - h.laufendeAusgaben,
        spielraum: einnahmen - h.pflichtausgaben,
      },
    };
  }
  return s;
}

function applyInternationalImmediate(state: GameState, eventId: string): GameState {
  if (eventId === 'dyn_energiekrise_eu') {
    const s = applyHaushaltSaldoDelta(state, -8);
    return { ...s, kpi: { ...s.kpi, gi: Math.max(0, s.kpi.gi - 10) } };
  }
  if (eventId === 'dyn_fluechtlingswelle') {
    let s = state;
    if (s.bundesratFraktionen?.length) {
      s = {
        ...s,
        bundesratFraktionen: s.bundesratFraktionen.map(f => ({
          ...f,
          beziehung: clamp(f.beziehung - 5, 0, 100),
        })),
      };
    }
    const mk = s.medienKlima ?? 55;
    return { ...s, medienKlima: Math.max(0, mk - 5) };
  }
  if (eventId === 'dyn_naturkatastrophe_inland') {
    return applyHaushaltSaldoDelta(state, -6);
  }
  return state;
}

function applyGesellschaftImmediate(state: GameState, eventId: string): GameState {
  if (eventId === 'dyn_vertrauenskrise_umfrage') {
    const z = { ...state.zust, g: Math.max(0, state.zust.g - 5) };
    const w = state.wahlprognose != null ? Math.max(0, state.wahlprognose - 5) : z.g;
    return { ...state, zust: z, wahlprognose: state.wahlprognose != null ? w : undefined };
  }
  if (eventId === 'dyn_desinformation_kampagne') {
    const mk = Math.max(0, (state.medienKlima ?? 55) - 5);
    const op = state.opposition ?? { staerke: 40, aktivesThema: null, letzterAngriff: 0 };
    return {
      ...state,
      medienKlima: mk,
      opposition: { ...op, staerke: Math.min(100, op.staerke + 2) },
    };
  }
  return state;
}

function evaluateTrigger(ev: GameEvent, state: GameState, complexity: number): boolean {
  const minC = ev.min_complexity ?? 1;
  if (minC > complexity) return false;

  const typ = ev.triggerTyp;
  const p = ev.triggerParams ?? {};
  if (!typ) return false;

  switch (typ) {
    case 'saldo_unter': {
      const wert = Number(p.wert ?? -35);
      const monate = Number(p.monate ?? 3);
      const saldo = state.haushalt?.saldo ?? 0;
      const hist = [...(state.haushaltSaldoHistory ?? []), saldo];
      return countConsecutiveMonthsUnder(hist, wert, monate);
    }
    case 'konjunktur_unter': {
      const wert = Number(p.wert ?? -2);
      const k = state.haushalt?.konjunkturIndex ?? 0;
      return k < wert;
    }
    case 'konjunktur_ueber_monate': {
      const wert = Number(p.wert ?? 2);
      const monate = Number(p.monate ?? 6);
      const cur = state.haushalt?.konjunkturIndex ?? 0;
      const hist = [...(state.konjunkturIndexHistory ?? []), cur];
      return countConsecutiveMonthsCondition(hist, v => v > wert, monate);
    }
    case 'koalition_unter': {
      const wert = Number(p.wert ?? 30);
      const k = state.koalitionspartner?.beziehung ?? state.coalition;
      return k < wert;
    }
    case 'partner_minister_ablehnungen': {
      const need = Number(p.anzahl ?? 3);
      const pp = partnerParteiId(state);
      if (!pp) return false;
      for (const c of state.chars) {
        if (!c.ist_partner_minister) continue;
        if (c.pool_partei !== pp) continue;
        const cnt = state.ministerAgenden?.[c.id]?.ablehnungen_count ?? 0;
        if (cnt >= need) return true;
      }
      return false;
    }
    case 'monat_range': {
      const von = Number(p.von ?? 1);
      const bis = Number(p.bis ?? 48);
      const prob = Number(p.wahrscheinlichkeit ?? 0.1);
      if (state.month < von || state.month > bis) return false;
      return Math.random() < prob;
    }
    case 'medienklima_unter_monate': {
      const wert = Number(p.wert ?? 25);
      const monate = Number(p.monate ?? 4);
      const cur = state.medienKlima ?? 55;
      const hist = [...(state.medienKlimaHistory ?? []), cur];
      return countConsecutiveMonthsUnder(hist, wert, monate);
    }
    case 'medienakteur_reichweite': {
      const akteur = String(p.akteur ?? 'alternativ');
      const ueber = Number(p.ueber ?? 12);
      if (!featureActive(complexity, 'medien_akteure_2')) return false;
      const r = state.medienAkteure?.[akteur]?.reichweite ?? 0;
      return r > ueber;
    }
    default:
      return false;
  }
}

function findPartnerMinisterForRuecktritt(state: GameState): import('../types').Character | undefined {
  const pp = partnerParteiId(state);
  if (!pp) return undefined;
  let best: import('../types').Character | undefined;
  let bestCnt = -1;
  for (const c of state.chars) {
    if (!c.ist_partner_minister) continue;
    if (c.pool_partei !== pp) continue;
    const cnt = state.ministerAgenden?.[c.id]?.ablehnungen_count ?? 0;
    if (cnt > bestCnt) {
      bestCnt = cnt;
      best = c;
    }
  }
  return best;
}

function enrichDynamicEvent(state: GameState, ev: GameEvent): GameEvent {
  if (ev.id !== 'dyn_minister_ruecktritt_angebot') return ev;
  const char = findPartnerMinisterForRuecktritt(state);
  if (!char) return ev;
  return {
    ...ev,
    charId: char.id,
    title: `${char.name} bietet Rücktritt an`,
    quote: `${char.name} signalisiert angesichts der Eskalation Bereitschaft zum Rückzug.`,
  };
}

function applyImmediateOnFire(state: GameState, ev: GameEvent): GameState {
  let s = state;
  if (ev.id === 'dyn_wirtschaftskrise_droht') {
    s = applyHaushaltSaldoDelta(s, -5);
    const mk = (s.medienKlima ?? 55) - 8;
    s = { ...s, medienKlima: Math.max(0, mk) };
    const mz = { ...(s.milieuZustimmung ?? {}) };
    for (const [k, d] of Object.entries({ etablierte: -5, leistungstraeger: -3 })) {
      mz[k] = clamp((mz[k] ?? 50) + d, 0, 100);
    }
    s = { ...s, milieuZustimmung: mz };
  } else if (ev.id === 'dyn_rezession_eintritt') {
    s = applyRezessionEintritt(s);
  } else if (ev.id.startsWith('dyn_') && ['dyn_energiekrise_eu', 'dyn_fluechtlingswelle', 'dyn_naturkatastrophe_inland'].includes(ev.id)) {
    s = applyInternationalImmediate(s, ev.id);
  } else if (ev.id === 'dyn_vertrauenskrise_umfrage' || ev.id === 'dyn_desinformation_kampagne') {
    s = applyGesellschaftImmediate(s, ev.id);
  }
  return s;
}

/**
 * Monatlicher Check: höchstens ein dynamisches Event pro Tick, kein aktives Event.
 */
export function checkDynamischeEvents(
  state: GameState,
  content: ContentBundle,
  complexity: number,
): GameState {
  if (state.activeEvent) return state;
  const pool = content.dynamicEvents ?? [];
  if (!pool.length) return state;

  const s = state;

  for (const ev of pool) {
    if (alreadyFiredDynamic(s, ev.id, ev.einmalig !== false)) continue;
    if (!evaluateTrigger(ev, s, complexity)) continue;

    const evActive = enrichDynamicEvent(s, ev);
    let next = applyImmediateOnFire(s, evActive);
    next = {
      ...next,
      ...markFiredDynamic(next, ev.id, ev.einmalig !== false),
      activeEvent: evActive,
      ...withPause(next, getAutoPauseLevel(evActive)),
    };
    return next;
  }

  return s;
}

function applyKpiEffects(state: GameState, choice: EventChoice): GameState {
  if (!choice.effect) return state;
  const kpi = { ...state.kpi };
  for (const [k, v] of Object.entries(choice.effect)) {
    const key = k as keyof typeof kpi;
    if (key in kpi) {
      kpi[key] = Math.max(0, kpi[key] + v);
      if (key === 'zf') kpi.zf = Math.min(100, kpi.zf);
    }
  }
  return { ...state, kpi };
}

function applyKoalitionspartnerDelta(state: GameState, choice: EventChoice): GameState {
  if (choice.koalitionspartnerBeziehung == null || !state.koalitionspartner) return state;
  return {
    ...state,
    koalitionspartner: {
      ...state.koalitionspartner,
      beziehung: clamp(state.koalitionspartner.beziehung + choice.koalitionspartnerBeziehung, 0, 100),
    },
    koalitionsbruchSeitMonat: undefined,
  };
}

export function applyMilieuDelta(state: GameState, delta: Record<string, number> | undefined): GameState {
  if (!delta || !Object.keys(delta).length) return state;
  const mz = { ...(state.milieuZustimmung ?? {}) };
  for (const [k, d] of Object.entries(delta)) {
    mz[k] = clamp((mz[k] ?? 50) + d, 0, 100);
  }
  return { ...state, milieuZustimmung: mz };
}

function applyHaushaltChoiceExtras(state: GameState, choice: EventChoice): GameState {
  let s = state;
  const h = s.haushalt;
  if (!h) return s;
  if (choice.schuldenbremseSpielraumDelta != null) {
    s = {
      ...s,
      haushalt: {
        ...h,
        schuldenbremseSpielraum: Math.max(0, (h.schuldenbremseSpielraum ?? 0) + choice.schuldenbremseSpielraumDelta),
      },
    };
  }
  if (choice.steuerpolitikModifikatorDelta != null) {
    const hh = s.haushalt!;
    const npm = Math.max(0.3, hh.steuerpolitikModifikator + choice.steuerpolitikModifikatorDelta);
    const einnahmen = Math.round(hh.einnahmen * (npm / hh.steuerpolitikModifikator));
    s = {
      ...s,
      haushalt: {
        ...hh,
        steuerpolitikModifikator: npm,
        einnahmen,
        saldo: einnahmen - hh.pflichtausgaben - hh.laufendeAusgaben,
        spielraum: einnahmen - hh.pflichtausgaben,
      },
    };
  }
  if (choice.konjunkturIndexDelta != null) {
    const hh = s.haushalt!;
    const ki = clamp(
      hh.konjunkturIndex + choice.konjunkturIndexDelta,
      KONJUNKTUR_INDEX_MIN,
      KONJUNKTUR_INDEX_MAX,
    );
    s = { ...s, haushalt: { ...hh, konjunkturIndex: ki } };
  }
  return s;
}

function canAfford(state: GameState, choice: EventChoice): boolean {
  return state.pk >= (choice.cost || 0);
}

function deductPk(state: GameState, choice: EventChoice): GameState {
  return { ...state, pk: state.pk - (choice.cost || 0) };
}

function finalizeDynamicEvent(state: GameState, event: GameEvent, choice: EventChoice): GameState {
  const logType = choice.type === 'danger' ? 'r' : 'g';
  const ns = getEventNamespace(event);
  const choiceIdx = event.choices.indexOf(choice);
  const logKey = `game:${ns}.${event.id}.choices.${choiceIdx}.log`;
  const msg = i18n.exists(logKey) ? i18n.t(logKey) : (choice.log || logKey);
  const s = addLog(state, msg, logType);
  const tickerKey = `game:${ns}.${event.id}.ticker`;
  const ticker = i18n.exists(tickerKey) ? i18n.t(tickerKey) : event.ticker;
  return { ...s, ticker, activeEvent: null };
}

/** Auflösung dynamischer Events (dyn_*) — gleiche Effektkette wie Standard inkl. Medien/Milieu/Haushalt-Extras */
export function resolveDynamicEvent(
  state: GameState,
  event: GameEvent,
  choice: EventChoice,
  options?: DynamicResolveOptions,
): GameState {
  const complexity = options?.complexity ?? 4;
  const medienContent = options?.contentBundle;

  if (!canAfford(state, choice)) return state;

  let s = deductPk(state, choice);
  s = applyKpiEffects(s, choice);
  if (choice.medienklima_delta != null) {
    s = adjustMedienKlimaGlobal(s, choice.medienklima_delta, complexity, medienContent);
  }
  s = applyKoalitionspartnerDelta(s, choice);
  s = applyMilieuDelta(s, choice.milieuDelta);
  s = applyHaushaltChoiceExtras(s, choice);

  if (event.id === 'dyn_minister_ruecktritt_angebot' && choice.key === 'annehmen' && event.charId) {
    const cid = event.charId;
    s = {
      ...s,
      chars: s.chars.filter(c => c.id !== cid),
      ministerAgenden: Object.fromEntries(Object.entries(s.ministerAgenden ?? {}).filter(([k]) => k !== cid)),
    };
  }

  if (choice.charMood) {
    s = applyMoodChange(s, choice.charMood, choice.loyalty);
  }

  return finalizeDynamicEvent(s, event, choice);
}
