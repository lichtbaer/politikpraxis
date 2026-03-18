/**
 * SMA-330: Minister-Agenden als kontinuierliche Erzählung
 * Minister kehren mit ihren Forderungen zurück — 2 Ablehnungen führen zum Ultimatum, danach Koalitionskrise.
 */

import type { GameState, Character, MinisterAgendaConfig, AgendaStatus } from '../types';
import { addLog } from '../engine';
import { withPause } from '../eventPause';
import { MINISTER_AGENDEN_CONFIG } from '../../data/defaults/ministerAgenden';
import { featureActive } from './features';

/** Agenda-Event-ID Präfix für Erkennung */
export const AGENDA_EVENT_PREFIX = 'agenda_';

/** Holt Agenda-Config für Charakter (ID oder Resort+Partei-Match) */
function getAgendaConfig(char: Character): MinisterAgendaConfig | null {
  const config = MINISTER_AGENDEN_CONFIG[char.id];
  if (config) return config;
  const byRessort = (char.ressort === 'umwelt' && char.pool_partei === 'gp') ? MINISTER_AGENDEN_CONFIG.gp_um
    : (char.ressort === 'finanzen' && char.pool_partei === 'cdp') ? MINISTER_AGENDEN_CONFIG.cdp_fm
    : null;
  return byRessort ?? null;
}

/** Prüft ob conditional Trigger erfüllt (Lehmann: Saldo < -15) */
function isConditionalTriggerMet(state: GameState, config: MinisterAgendaConfig): boolean {
  if (config.trigger_type !== 'conditional') return true;
  const saldo = state.haushalt?.saldo ?? 0;
  const schwelle = config.saldo_schwelle ?? -15;
  return saldo < schwelle;
}

/** Erstellt Event für Agenda-Forderung */
function createAgendaEvent(
  char: Character,
  status: AgendaStatus,
  config: MinisterAgendaConfig,
): import('../types').GameEvent {
  const isUltimatum = status === 'ultimatum';
  const label = config.gesetz_ref_id
    ? (isUltimatum ? 'Ultimatum: CO2-Steuer jetzt!' : 'CO2-Steuer fordern')
    : (isUltimatum ? 'Ultimatum: Konsolidierung!' : 'Konsolidierung fordern');

  const choices: import('../types').EventChoice[] = [
    {
      label: 'Zusagen',
      desc: 'Forderung annehmen und umsetzen.',
      cost: 0,
      type: 'primary',
      effect: {},
      agendaAction: 'annehmen',
      log: `${char.name}s Forderung angenommen.`,
    },
    {
      label: 'Ablehnen',
      desc: isUltimatum ? 'Ultimatum ablehnen — Koalitionskrise droht.' : 'Forderung ablehnen.',
      cost: 0,
      type: 'danger',
      effect: {},
      agendaAction: 'ablehnen',
      log: `${char.name}s Forderung abgelehnt.`,
    },
  ];

  const quote = config.gesetz_ref_id
    ? (isUltimatum ? '„Ohne die CO2-Steuer kann ich dieses Kabinett nicht mehr vertreten."' : '„Die CO2-Steuer gehört auf die Agenda. Jetzt."')
    : (isUltimatum ? '„Ohne spürbare Konsolidierung kann ich nicht weiter mitmachen."' : '„Der Haushalt muss konsolidiert werden."');

  const context = config.gesetz_ref_id
    ? (isUltimatum ? 'Ultimatum: Der Umweltminister fordert die CO2-Steuer — oder er droht mit Rücktritt.' : `${char.name} fordert erneut die CO2-Steuer auf die Agenda.`)
    : (isUltimatum ? 'Ultimatum: Der Finanzminister fordert Haushaltskonsolidierung — oder er droht mit Rücktritt.' : `${char.name} fordert Haushaltskonsolidierung — der Saldo ist kritisch.`);

  return {
    id: `${AGENDA_EVENT_PREFIX}${char.id}_${status}`,
    type: isUltimatum ? 'danger' : 'warn',
    icon: 'ministerial',
    typeLabel: isUltimatum ? 'Ultimatum' : 'Minister-Forderung',
    title: `${char.name} fordert ${config.gesetz_ref_id ? 'CO2-Steuer' : 'Konsolidierung'}`,
    quote,
    context,
    ticker: `${char.name}: ${label}`,
    choices,
    charId: char.id,
  };
}

/** Triggert Agenda-Event und setzt Status */
function triggerAgenda(
  state: GameState,
  char: Character,
  status: AgendaStatus,
  config: MinisterAgendaConfig,
): GameState {
  const agenden = state.ministerAgenden ?? {};
  const agendenState = agenden[char.id] ?? {
    status: 'wartend' as const,
    letzte_forderung_monat: 0,
    ablehnungen_count: 0,
  };

  const ev = createAgendaEvent(char, status, config);

  return {
    ...state,
    ministerAgenden: {
      ...agenden,
      [char.id]: {
        ...agendenState,
        status,
        letzte_forderung_monat: state.month,
      },
    },
    aktiveMinisterAgenda: { charId: char.id, status },
    activeEvent: ev,
    ...withPause(state),
  };
}

/**
 * Prüft Minister-Agenden jeden Tick.
 * Stufe 1: Keine Agenden, Stufe 2+: aktiv
 */
export function checkMinisterAgenden(
  state: GameState,
  complexity: number,
): GameState {
  if (!featureActive(complexity, 'char_ultimatums')) return state;
  if (state.activeEvent) return state;
  if (state.aktiveMinisterAgenda) return state;

  const kabinett = state.chars;

  for (const char of kabinett) {
    const config = getAgendaConfig(char);
    if (!config) continue;

    const agenden = state.ministerAgenden ?? {};
    const a = agenden[char.id] ?? {
      status: 'wartend' as const,
      letzte_forderung_monat: 0,
      ablehnungen_count: 0,
    };

    if (a.status === 'erfuellt' || a.status === 'aufgegeben') continue;
    if (state.month < config.trigger_monat) continue;

    if (config.trigger_type === 'conditional' && !isConditionalTriggerMet(state, config)) {
      continue;
    }

    const naechsteForderung = a.letzte_forderung_monat + config.wiederholung_intervall;
    if (a.letzte_forderung_monat > 0 && state.month < naechsteForderung) continue;

    if (a.status === 'wartend') {
      return triggerAgenda(state, char, 'erste_forderung', config);
    }

    if (a.ablehnungen_count >= config.max_ablehnungen) {
      return triggerAgenda(state, char, 'ultimatum', config);
    }

    return triggerAgenda(state, char, 'wiederholung', config);
  }

  return state;
}

/**
 * Spieler-Reaktion auf Agenda-Forderung.
 * Eskalation: erste_forderung → Mood -1; wiederholung → Mood -2, KV -5; ultimatum → Koalitionskrise, Medien -5, Koalition -10
 */
export function resolveMinisterAgenda(
  state: GameState,
  action: 'annehmen' | 'ablehnen',
  content: { charEvents?: Record<string, import('../types').GameEvent> },
): GameState {
  const active = state.aktiveMinisterAgenda;
  if (!active) return state;

  const char = state.chars.find(c => c.id === active.charId);
  if (!char) {
    return { ...state, aktiveMinisterAgenda: null, activeEvent: null };
  }

  const config = getAgendaConfig(char);
  if (!config) {
    return { ...state, aktiveMinisterAgenda: null, activeEvent: null };
  }

  const agenden = state.ministerAgenden ?? {};
  const agendenState = agenden[active.charId] ?? {
    status: 'wartend' as const,
    letzte_forderung_monat: 0,
    ablehnungen_count: 0,
  };

  if (action === 'annehmen') {
    const newAgenden = { ...agenden, [active.charId]: { ...agendenState, status: 'erfuellt' as const } };
    return addLog(
      {
        ...state,
        ministerAgenden: newAgenden,
        aktiveMinisterAgenda: null,
        activeEvent: null,
      },
      `${char.name}s Forderung angenommen.`,
      'g',
    );
  }

  // ablehnen
  const newAblehnungen = agendenState.ablehnungen_count + 1;

  if (active.status === 'erste_forderung') {
    const newMood = Math.max(0, char.mood - 1);
    const chars = state.chars.map(c => (c.id === active.charId ? { ...c, mood: newMood } : c));
    const newAgenden = {
      ...agenden,
      [active.charId]: { ...agendenState, ablehnungen_count: newAblehnungen },
    };
    return addLog(
      {
        ...state,
        chars,
        ministerAgenden: newAgenden,
        aktiveMinisterAgenda: null,
        activeEvent: null,
      },
      `${char.name}s Forderung abgelehnt. Stimmung verändert.`,
      'r',
    );
  }

  if (active.status === 'wiederholung') {
    const newMood = Math.max(0, char.mood - 2);
    const chars = state.chars.map(c => (c.id === active.charId ? { ...c, mood: newMood } : c));
    const newCoalition = Math.max(0, (state.koalitionspartner ? state.coalition - 5 : state.coalition));
    const newAgenden = {
      ...agenden,
      [active.charId]: { ...agendenState, ablehnungen_count: newAblehnungen },
    };
    return addLog(
      {
        ...state,
        chars,
        coalition: newCoalition,
        ministerAgenden: newAgenden,
        aktiveMinisterAgenda: null,
        activeEvent: null,
      },
      `${char.name}s wiederholte Forderung abgelehnt.`,
      'r',
    );
  }

  // ultimatum ablehnen → Koalitionskrise-Event, Medienklima -5, Koalition -10
  const koalitionskriseEv = content.charEvents?.koalitionskrise_ultimatum;
  const newMedienKlima = Math.max(0, (state.medienKlima ?? 55) - 5);
  const newCoalition = Math.max(0, (state.koalitionspartner ? state.coalition - 10 : state.coalition));
  const newAgenden = {
    ...agenden,
    [active.charId]: { ...agendenState, status: 'aufgegeben' as const, ablehnungen_count: newAblehnungen },
  };

  let newState: GameState = {
    ...state,
    medienKlima: newMedienKlima,
    coalition: newCoalition,
    ministerAgenden: newAgenden,
    aktiveMinisterAgenda: null,
    activeEvent: koalitionskriseEv ?? null,
  };

  if (koalitionskriseEv) {
    newState = { ...newState, ...withPause(newState) };
  }

  return addLog(newState, `Ultimatum von ${char.name} abgelehnt. Koalitionskrise.`, 'r');
}

/** Prüft ob Gesetz eine Agenda-Erfüllung auslöst (proaktive Erfüllung) — bei Einbringen oder Beschluss */
export function checkProaktiveErfuellung(state: GameState, gesetzId: string): GameState {
  for (const [configCharId, config] of Object.entries(MINISTER_AGENDEN_CONFIG)) {
    if (config.gesetz_ref_id !== gesetzId) continue;
    const char = state.chars.find(c =>
      c.id === configCharId ||
      (configCharId === 'gp_um' && c.ressort === 'umwelt' && c.pool_partei === 'gp') ||
      (configCharId === 'um' && (c.id === 'um' || (c.ressort === 'umwelt' && c.pool_partei === 'gp'))),
    );
    if (!char) continue;
    const agenden = state.ministerAgenden ?? {};
    const a = agenden[char.id];
    if (!a) continue;
    if (a.status === 'erfuellt' || a.status === 'aufgegeben') continue;
    return applyProaktiveErfuellung(state, char);
  }
  return state;
}

function applyProaktiveErfuellung(state: GameState, char: import('../types').Character): GameState {
  const agenden = state.ministerAgenden ?? {};
  const a = agenden[char.id];
  if (!a) return state;

  if (a.status === 'erfuellt' || a.status === 'aufgegeben') return state;
  if (a.status !== 'wartend' && a.status !== 'erste_forderung' && a.status !== 'wiederholung') return state;

  const newMood = Math.min(4, char.mood + 2);
  const chars = state.chars.map(c => (c.id === char.id ? { ...c, mood: newMood } : c));
  const newAgenden = {
    ...agenden,
    [char.id]: { ...a, status: 'erfuellt' as const },
  };

  return addLog(
    {
      ...state,
      chars,
      ministerAgenden: newAgenden,
    },
    `${char.name} freut sich über proaktive Erfüllung seiner Agenda.`,
    'g',
  );
}
