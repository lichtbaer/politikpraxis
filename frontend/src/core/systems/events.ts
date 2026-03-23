import type { GameState, GameEvent, EventChoice } from '../types';
import { getEventNamespace } from '../eventNamespaces';
import { addLog } from '../engine';
import { withPause, getAutoPauseLevel } from '../eventPause';
import { applyMoodChange } from './characters';
import { resolveMinisterialInitiative } from './ministerialInitiativen';
import { resolveMinisterAgenda, AGENDA_EVENT_PREFIX } from './ministerAgenden';
import { startKommunalPilot } from './gesetzLebenszyklus';
import { applyVorbildBonus } from './gesetzLebenszyklus';
import { resolveTVDuell } from './wahlkampf';
import { applyMedienChoiceDelta } from './medienklima';
import { featureActive } from './features';
import i18n from '../../i18n';

/** Landtagswahl: Land von Fraktion A zu B verschieben, verlierende Fraktion Beziehung -20 */
function applyLandtagswahlEffect(state: GameState, event: GameEvent): GameState {
  const { fraktionId, landId, landtagswahlToFraktion } = event;
  if (!fraktionId || !landId || !landtagswahlToFraktion) return state;

  const fraktionen = state.bundesratFraktionen.map(f => {
    if (f.id === fraktionId) {
      const laender = f.laender.filter(l => l !== landId);
      const beziehung = Math.max(0, f.beziehung - 20);
      return { ...f, laender, beziehung };
    }
    if (f.id === landtagswahlToFraktion) {
      const laender = [...f.laender, landId];
      return { ...f, laender };
    }
    return f;
  });
  return { ...state, bundesratFraktionen: fraktionen };
}

/** Sprecher-Wechsel: Neuen Sprecher einsetzen, Beziehung -15 */
function applySprecherWechselEffect(state: GameState, event: GameEvent): GameState {
  const { fraktionId, sprecherErsatz } = event;
  if (!fraktionId || !sprecherErsatz) return state;

  const fraktionen = state.bundesratFraktionen.map(f => {
    if (f.id === fraktionId) {
      const beziehung = Math.max(0, f.beziehung - 15);
      return {
        ...f,
        sprecher: { ...sprecherErsatz },
        beziehung,
      };
    }
    return f;
  });
  return { ...state, bundesratFraktionen: fraktionen };
}

/** Wahlkampf-Events werden nie zufällig getriggert; nur durch dedizierte Check-Funktionen (Monat 43–48) */
const WAHLKAMPF_EVENT_IDS = new Set(['wahlkampf_beginn', 'tv_duell', 'koalitionspartner_alleingang']);

export { isOnCooldown, isEventAvailable, recordEventFired } from './eventUtils';
import { isEventAvailable, recordEventFired } from './eventUtils';

export function checkRandomEvents(state: GameState, eventPool: GameEvent[]): GameState {
  if (state.activeEvent) return state;
  if (Math.random() >= 0.22) return state;

  const available = eventPool
    .filter(e => !WAHLKAMPF_EVENT_IDS.has(e.id))
    .filter(e => isEventAvailable(state, e));
  if (!available.length) return state;

  const ev = available[Math.floor(Math.random() * available.length)];
  return {
    ...state,
    ...recordEventFired(state, ev),
    activeEvent: ev,
    ...withPause(state, getAutoPauseLevel(ev)),
  };
}

export interface BundesratEventContext {
  bundesratEvents: GameEvent[];
  sprecherErsatz: Record<string, { name: string; partei: string; land: string; initials: string; color: string; bio: string; quote?: string }>;
  landtagswahlTransitions: Array<{ landId: string; landName: string; newParty: string; fromFraktion: string; toFraktion: string }>;
}

/** Prüft Bundesrat-spezifische Events: fix (12/18 Mo.), konditionell (Kohl, Initiative), zufällig (Landtagswahl, Sprecher-Wechsel) */
export function checkBundesratEvents(
  state: GameState,
  ctx: BundesratEventContext,
): GameState {
  if (state.activeEvent) return state;

  const fired = state.firedBundesratEvents ?? [];
  const { bundesratEvents, sprecherErsatz, landtagswahlTransitions } = ctx;

  // 1. Fix: Länderfinanzausgleich (alle 12 Monate: 12, 24, 36, 48) — wiederkehrend, nicht in fired
  if (state.month >= 12 && state.month % 12 === 0) {
    const ev = bundesratEvents.find(e => e.id === 'laenderfinanzausgleich');
    if (ev) {
      return {
        ...state,
        activeEvent: ev,
        ...withPause(state, getAutoPauseLevel(ev)),
      };
    }
  }

  // 2. Fix: Föderalismusgipfel (alle 18 Monate: 18, 36, 48)
  if (state.month >= 18 && state.month % 18 === 0) {
    const ev = bundesratEvents.find(e => e.id === 'foederalismusgipfel');
    if (ev) {
      return {
        ...state,
        activeEvent: ev,
        ...withPause(state, getAutoPauseLevel(ev)),
      };
    }
  }

  // 3. Konditionell: Kohl eskaliert (Beziehung < 15, laufendes Gesetz)
  const kohl = state.bundesratFraktionen.find(f => f.id === 'ostblock' && f.sonderregel === 'kohl_saboteur');
  if (kohl && kohl.beziehung < 15) {
    const btPassedLaws = state.gesetze.filter(
      g => g.status === 'bt_passed' && g.tags.includes('land') && !g.kohlSabotageTriggered,
    );
    if (btPassedLaws.length > 0) {
      const ev = bundesratEvents.find(e => e.id === 'kohl_eskaliert');
      if (ev) {
        const law = btPassedLaws[0];
        const gesetze = state.gesetze.map(g =>
          g.id === law.id
            ? { ...g, kohlSabotageTriggered: true, brVoteMonth: (g.brVoteMonth ?? state.month) + 2 }
            : g,
        );
        return {
          ...state,
          gesetze,
          firedBundesratEvents: [...fired, 'kohl_eskaliert'],
          activeEvent: { ...ev, lawId: law.id },
          ...withPause(state, getAutoPauseLevel(ev)),
        };
      }
    }
  }

  // 4. Zufällig: Landtagswahl (ab Monat 10, ~15% Chance)
  if (state.month >= 10 && Math.random() < 0.15 && !fired.includes('landtagswahl')) {
    const ev = bundesratEvents.find(e => e.id === 'landtagswahl');
    if (ev && landtagswahlTransitions.length > 0) {
      const t = landtagswahlTransitions[Math.floor(Math.random() * landtagswahlTransitions.length)];
      const fromFraktion = state.bundesratFraktionen.find(f => f.id === t.fromFraktion);
      if (fromFraktion?.laender.includes(t.landId)) {
        return {
          ...state,
          firedBundesratEvents: [...fired, 'landtagswahl'],
          activeEvent: {
            ...ev,
            fraktionId: t.fromFraktion,
            landId: t.landId,
            landName: t.landName,
            landtagswahlToFraktion: t.toFraktion,
            ticker: `${t.landName}: ${t.newParty} gewinnt Landtagswahl`,
          },
          ...withPause(state, getAutoPauseLevel(ev)),
        };
      }
    }
  }

  // 5. Zufällig: Sprecher-Wechsel (~20% nach Monat 24)
  if (state.month >= 24 && Math.random() < 0.2 && !fired.includes('sprecher_wechsel')) {
    const ev = bundesratEvents.find(e => e.id === 'sprecher_wechsel');
    if (ev) {
      const fraktionen = state.bundesratFraktionen.filter(f => sprecherErsatz[f.id]);
      if (fraktionen.length > 0) {
        const f = fraktionen[Math.floor(Math.random() * fraktionen.length)];
        const ersatz = sprecherErsatz[f.id];
        return {
          ...state,
          firedBundesratEvents: [...fired, 'sprecher_wechsel'],
          activeEvent: {
            ...ev,
            fraktionId: f.id,
            sprecherErsatz: ersatz,
            ticker: `${f.name}: Neuer Sprecher ${ersatz.name}`,
          },
          ...withPause(state, getAutoPauseLevel(ev)),
        };
      }
    }
  }

  // 6. Konditionell: Bundesrat-Initiative (Fraktion 3 oder 4, ab Monat 18)
  if (state.month >= 18 && Math.random() < 0.25 && !fired.includes('bundesrat_initiative')) {
    const ev = bundesratEvents.find(e => e.id === 'bundesrat_initiative');
    if (ev) {
      const initiatoren = ['konservativer_block', 'ostblock'];
      const fraktionId = initiatoren[Math.floor(Math.random() * initiatoren.length)];
      return {
        ...state,
        firedBundesratEvents: [...fired, 'bundesrat_initiative'],
        activeEvent: { ...ev, fraktionId },
        ...withPause(state, getAutoPauseLevel(ev)),
      };
    }
  }

  return state;
}

/** SMA-298: Prüft Kommunal/Länder conditional Events */
export function checkKommunalLaenderEvents(
  state: GameState,
  events: GameEvent[],
  complexity: number,
): GameState {
  if (state.activeEvent) return state;
  if (!events.length) return state;

  const haushaltSaldo = state.haushalt?.saldo ?? 0;
  const politikfeldDruck = state.politikfeldDruck ?? {};
  const minBrBeziehung = state.bundesratFraktionen?.length
    ? Math.min(...state.bundesratFraktionen.map(f => f.beziehung))
    : 100;

  for (const ev of events) {
    if (!isEventAvailable(state, ev)) continue;
    const evMinC = (ev as GameEvent & { min_complexity?: number }).min_complexity;
    if (evMinC != null && evMinC > complexity) continue;

    let trigger = false;
    if (ev.id === 'kommunal_haushaltskrise') {
      trigger = haushaltSaldo < -20 && state.month > 12;
    } else if (ev.id === 'kommunal_buergerprotest') {
      trigger = (politikfeldDruck['umwelt_energie'] ?? 0) > 70;
    } else if (ev.id === 'laender_koalitionskrise') {
      trigger = minBrBeziehung < 30;
    }
    if (!trigger) continue;

    return {
      ...state,
      ...recordEventFired(state, ev),
      activeEvent: ev,
      ...withPause(state, getAutoPauseLevel(ev)),
    };
  }
  return state;
}

/** SMA-309: Prüft Steuer-Events (conditional) */
export function checkSteuerEvents(
  state: GameState,
  events: GameEvent[],
  complexity: number,
): GameState {
  if (state.activeEvent) return state;
  if (!events.length) return state;
  if (complexity < 2) return state;

  const haushaltSaldo = state.haushalt?.saldo ?? 0;
  const konjunkturIndex = state.haushalt?.konjunkturIndex ?? 0;

  for (const ev of events) {
    if (!isEventAvailable(state, ev)) continue;
    const evMinC = (ev as GameEvent & { min_complexity?: number }).min_complexity;
    if (evMinC != null && evMinC > complexity) continue;

    let trigger = false;
    if (ev.id === 'steuereinnahmen_einbruch') {
      trigger = konjunkturIndex < -1.5;
    } else if (ev.id === 'haushaltsstreit_opposition') {
      trigger = haushaltSaldo < -20 && state.month > 6;
    }
    if (!trigger) continue;

    let newState: GameState = {
      ...state,
      ...recordEventFired(state, ev),
      activeEvent: ev,
      ...withPause(state, getAutoPauseLevel(ev)),
    };

    if (ev.id === 'steuereinnahmen_einbruch' && newState.haushalt) {
      const neueEinnahmen = Math.max(0, newState.haushalt.einnahmen - 15);
      newState = {
        ...newState,
        haushalt: {
          ...newState.haushalt,
          einnahmen: neueEinnahmen,
          saldo: neueEinnahmen - newState.haushalt.pflichtausgaben - newState.haushalt.laufendeAusgaben,
        },
      };
    }

    if (ev.id === 'haushaltsstreit_opposition' && (newState.medienKlima ?? 55) > 0) {
      newState = { ...newState, medienKlima: Math.max(0, (newState.medienKlima ?? 55) - 4) };
    }

    return newState;
  }
  return state;
}

export interface KommunalEventContext {
  kommunalEvents: GameEvent[];
}

/** Prüft Kommunal-Initiative Events (SMA-275): Trigger bei politikfeldDruck + Milieu-Zustimmung */
export function checkKommunalEvents(
  state: GameState,
  ctx: KommunalEventContext,
  complexity: number,
): GameState {
  if (state.activeEvent) return state;

  const fired = state.firedKommunalEvents ?? [];
  const { kommunalEvents } = ctx;
  if (!kommunalEvents.length) return state;

  const milieuZustimmung = state.milieuZustimmung ?? {};
  const politikfeldDruck = state.politikfeldDruck ?? {};

  for (const ev of kommunalEvents) {
    if (fired.includes(ev.id)) continue;
    const evMinC = (ev as GameEvent & { min_complexity?: number }).min_complexity;
    if (evMinC != null && evMinC > complexity) continue;

    const pfId = ev.politikfeldId;
    let druckMin = ev.triggerDruckMin ?? 0;
    if (state.staedtebuendnisBisMonat != null && state.month <= state.staedtebuendnisBisMonat) {
      druckMin = Math.max(0, druckMin - 10);
    }
    const milieuKey = ev.triggerMilieuKey;
    const milieuOp = ev.triggerMilieuOp;
    const milieuVal = ev.triggerMilieuVal ?? 0;

    const druck = pfId ? (politikfeldDruck[pfId] ?? 0) : 0;
    if (druck <= druckMin) continue;

    const milieuZust = milieuKey ? (milieuZustimmung[milieuKey] ?? 50) : 50;
    const milieuOk = milieuOp === '>'
      ? milieuZust > milieuVal
      : milieuOp === '<'
        ? milieuZust < milieuVal
        : true;
    if (!milieuOk) continue;

    // Gesetz-Referenz: passendes Gesetz für Pilot (bei koordinieren)
    const gesetzRef = ev.gesetzRef ?? [];
    const passendesGesetz = state.gesetze.find(
      g => gesetzRef.includes(g.id) && (g.status === 'entwurf' || g.status === 'aktiv' || g.status === 'eingebracht') &&
           g.kommunal_pilot_moeglich !== false,
    );
    if (!passendesGesetz && gesetzRef.length > 0) continue;

    return {
      ...state,
      firedKommunalEvents: [...fired, ev.id],
      activeEvent: passendesGesetz ? { ...ev, lawId: passendesGesetz.id } : ev,
      ...withPause(state, getAutoPauseLevel(ev)),
    };
  }

  return state;
}

export interface ResolveEventOptions {
  complexity?: number;
  /** Content für resolveMinisterAgenda (charEvents) */
  content?: { charEvents?: Record<string, import('../types').GameEvent> };
}

/** Prüft ob der Spieler genug PK hat */
function canAfford(state: GameState, choice: EventChoice): boolean {
  return state.pk >= (choice.cost || 0);
}

/** Zieht PK-Kosten ab */
function deductPk(state: GameState, choice: EventChoice): GameState {
  return { ...state, pk: state.pk - (choice.cost || 0) };
}

/** Wendet KPI-Effekte aus choice.effect an */
function applyKpiEffects(state: GameState, choice: EventChoice): GameState {
  if (!choice.effect) return state;
  const kpi = { ...state.kpi };
  for (const [k, v] of Object.entries(choice.effect)) {
    const key = k as keyof typeof kpi;
    if (key in kpi) {
      kpi[key] = +Math.max(0, kpi[key] + v).toFixed(2);
      if (key === 'zf') kpi.zf = Math.min(100, kpi.zf);
    }
  }
  return { ...state, kpi };
}

/** Wendet Koalitionspartner-Beziehungsänderung an */
function applyKoalitionspartnerDelta(state: GameState, choice: EventChoice): GameState {
  if (choice.koalitionspartnerBeziehung == null || !state.koalitionspartner) return state;
  return {
    ...state,
    koalitionspartner: {
      ...state.koalitionspartner,
      beziehung: Math.max(0, Math.min(100, state.koalitionspartner.beziehung + choice.koalitionspartnerBeziehung)),
    },
    koalitionsbruchSeitMonat: undefined,
  };
}

/** Wendet Bundesrat-Bonus auf alle Fraktionen an */
function applyBundesratBonusAll(state: GameState, choice: EventChoice): GameState {
  if (choice.bundesratBonusAll == null || !state.bundesratFraktionen) return state;
  return {
    ...state,
    bundesratFraktionen: state.bundesratFraktionen.map(f =>
      ({ ...f, beziehung: Math.max(0, Math.min(100, f.beziehung + choice.bundesratBonusAll!)) }),
    ),
  };
}

/** Schreibt Log + Ticker und setzt activeEvent auf null */
function finalizeEvent(state: GameState, event: GameEvent, choice: EventChoice, logMsg?: string): GameState {
  const logType = choice.type === 'danger' ? 'r' : 'g';
  const ns = getEventNamespace(event);
  const choiceIdx = event.choices.indexOf(choice);

  let msg = logMsg;
  if (!msg) {
    const logKey = `game:${ns}.${event.id}.choices.${choiceIdx}.log`;
    msg = i18n.exists(logKey) ? i18n.t(logKey) : (choice.log || logKey);
  }

  const s = addLog(state, msg, logType);
  const tickerKey = `game:${ns}.${event.id}.ticker`;
  s.ticker = i18n.exists(tickerKey) ? i18n.t(tickerKey) : event.ticker;
  s.activeEvent = null;
  return s;
}

const KOMMUNAL_INITIATIVE_IDS = new Set(['kommunal_klima_initiative', 'kommunal_sozial_initiative', 'kommunal_sicherheit_initiative']);
const STEUER_IDS = new Set(['steuereinnahmen_einbruch', 'haushaltsstreit_opposition', 'steuerstreit_koalition']);
const KOMMUNAL_LAENDER_IDS = new Set(['kommunal_haushaltskrise', 'kommunal_buergerprotest', 'laender_koalitionskrise']);
const EXTREMISMUS_IDS = new Set(['koalitionspartner_extremismus_warnung', 'verfassungsgericht_klage']);

export function resolveEvent(
  state: GameState,
  event: GameEvent,
  choice: EventChoice,
  options?: ResolveEventOptions,
): GameState {
  const complexity = options?.complexity ?? 4;

  // Ministerial-Initiative: eigene Auflösung
  if (choice.ministerialAction && state.aktiveMinisterialInitiative && event.id.startsWith('mi_')) {
    return resolveMinisterialInitiative(state, choice.ministerialAction);
  }

  // SMA-330: Minister-Agenda: eigene Auflösung
  if (choice.agendaAction && state.aktiveMinisterAgenda && event.id.startsWith(AGENDA_EVENT_PREFIX)) {
    return resolveMinisterAgenda(state, choice.agendaAction, options?.content ?? {});
  }

  // Wahlkampf-Beginn, Koalitionspartner-Alleingang: einfaches Bestätigen
  if (event.id === 'wahlkampf_beginn' || event.id === 'koalitionspartner_alleingang') {
    return { ...state, activeEvent: null };
  }

  // Kommunal-Initiative: als_vorbild (SMA-274)
  if (KOMMUNAL_INITIATIVE_IDS.has(event.id) && choice.key === 'als_vorbild' && event.lawId) {
    if (!canAfford(state, choice)) return state;
    const s = applyVorbildBonus(deductPk(state, choice), event.lawId);
    return finalizeEvent(s, event, choice);
  }

  // Kommunal-Initiative: koordinieren (SMA-274)
  if (KOMMUNAL_INITIATIVE_IDS.has(event.id) && choice.key === 'koordinieren' && event.lawId) {
    if (!canAfford(state, choice)) return state;
    const stadttyp = (event as GameEvent & { stadttyp?: 'progressiv' | 'konservativ' | 'industrie' }).stadttyp ?? 'progressiv';
    const s = startKommunalPilot(state, event.lawId, stadttyp, undefined, complexity);
    return finalizeEvent(s, event, choice);
  }

  // Medien-Events (SMA-277)
  if (event.id.startsWith('medien_')) {
    if (!canAfford(state, choice)) return state;
    let s = applyMedienChoiceDelta(deductPk(state, choice), choice);
    if (choice.charMood) s = applyMoodChange(s, choice.charMood, choice.loyalty);
    return finalizeEvent(s, event, choice, choice.log);
  }

  // TV-Duell (SMA-278)
  if (event.id === 'tv_duell') {
    const vorbereitet = choice.key === 'vorbereiten';
    if (vorbereitet && !canAfford(state, choice)) return state;
    let s = vorbereitet ? deductPk(state, choice) : state;
    s = resolveTVDuell(s, vorbereitet);
    return finalizeEvent(s, event, choice, choice.log);
  }

  // Steuer-Events (SMA-309)
  if (STEUER_IDS.has(event.id)) {
    if (!canAfford(state, choice)) return state;
    let s = applyMedienChoiceDelta(deductPk(state, choice), choice);
    s = applyKoalitionspartnerDelta(s, choice);
    if (event.id === 'steuereinnahmen_einbruch' && s.haushalt && choice.effect?.hh != null) {
      const hhDelta = choice.effect.hh;
      if (choice.key === 'sparen' && hhDelta > 0) {
        s = { ...s, haushalt: { ...s.haushalt,
          laufendeAusgaben: Math.max(0, s.haushalt.laufendeAusgaben - hhDelta),
          saldo: s.haushalt.einnahmen - s.haushalt.pflichtausgaben - Math.max(0, s.haushalt.laufendeAusgaben - hhDelta),
        }};
      } else if (choice.key === 'steuer' && hhDelta > 0) {
        s = { ...s, haushalt: { ...s.haushalt,
          einnahmen: s.haushalt.einnahmen + hhDelta,
          saldo: s.haushalt.einnahmen + hhDelta - s.haushalt.pflichtausgaben - s.haushalt.laufendeAusgaben,
        }};
      }
    }
    return finalizeEvent(s, event, choice, choice.log);
  }

  // Kommunal/Länder conditional Events (SMA-298)
  if (KOMMUNAL_LAENDER_IDS.has(event.id)) {
    if (!canAfford(state, choice)) return state;
    let s = applyKpiEffects(applyMedienChoiceDelta(deductPk(state, choice), choice), choice);
    s = applyBundesratBonusAll(s, choice);
    return finalizeEvent(s, event, choice, choice.log);
  }

  // Extremismus-Events (SMA-280)
  if (EXTREMISMUS_IDS.has(event.id)) {
    if (!canAfford(state, choice)) return state;
    let s = applyMedienChoiceDelta(deductPk(state, choice), choice);
    s = applyKoalitionspartnerDelta(s, choice);
    if (event.id === 'verfassungsgericht_klage' && choice.verfahrenDauerMonate != null) {
      s = choice.verfahrenDauerMonate === 0
        ? { ...s, verfassungsgerichtPausiert: true, verfassungsgerichtVerfahrenBisMonat: undefined }
        : { ...s, verfassungsgerichtVerfahrenBisMonat: s.month + choice.verfahrenDauerMonate, verfassungsgerichtPausiert: false };
    }
    return finalizeEvent(s, event, choice, choice.log);
  }

  // Standard-Event: vollständige Effekt-Kette
  if (!canAfford(state, choice)) return state;

  let s = applyKpiEffects(deductPk(state, choice), choice);

  if (choice.charMood) {
    s = applyMoodChange(s, choice.charMood, choice.loyalty);
  }

  if (choice.brRelation && s.bundesratFraktionen) {
    s = {
      ...s,
      bundesratFraktionen: s.bundesratFraktionen.map(f => {
        const delta = choice.brRelation![f.id];
        if (delta == null) return f;
        return { ...f, beziehung: Math.max(0, Math.min(100, f.beziehung + delta)) };
      }),
    };
  }
  s = applyBundesratBonusAll(s, choice);

  if (choice.brRelationInitiator != null && event.fraktionId && s.bundesratFraktionen) {
    s = {
      ...s,
      bundesratFraktionen: s.bundesratFraktionen.map(f =>
        f.id === event.fraktionId
          ? { ...f, beziehung: Math.max(0, Math.min(100, f.beziehung + choice.brRelationInitiator!)) }
          : f,
      ),
    };
  }

  // Bundesrat-spezifische Effekte
  if (event.id === 'landtagswahl' && event.fraktionId && event.landId && event.landtagswahlToFraktion) {
    s = applyLandtagswahlEffect(s, event);
  }
  if (event.id === 'sprecher_wechsel' && event.fraktionId && event.sprecherErsatz) {
    s = applySprecherWechselEffect(s, event);
  }

  s = applyKoalitionspartnerDelta(s, choice);

  // Gesetze freischalten + Follow-up Events planen
  s = applyUnlocksAndFollowups(s, choice, options);

  return finalizeEvent(s, event, choice);
}

/** Schaltet Gesetze frei und plant Follow-up Events */
function applyUnlocksAndFollowups(
  state: GameState,
  choice: EventChoice,
  options?: ResolveEventOptions,
): GameState {
  let s = state;

  // Gesetze freischalten
  if (choice.unlocks_laws?.length) {
    const unlockedLaws = [...(s.unlockedLaws ?? [])];
    for (const lawId of choice.unlocks_laws) {
      if (!unlockedLaws.includes(lawId)) {
        unlockedLaws.push(lawId);
      }
    }
    s = { ...s, unlockedLaws };
  }

  // Follow-up Events planen (nur bei Komplexität >= 4)
  const complexity = options?.complexity ?? 4;
  if (choice.followup_event_id && featureActive(complexity, 'followup_events')) {
    const delay = choice.followup_delay ?? 2;
    const pendingFollowups = [...(s.pendingFollowups ?? [])];
    pendingFollowups.push({
      eventId: choice.followup_event_id,
      triggerMonth: s.month + delay,
    });
    s = { ...s, pendingFollowups };
  }

  return s;
}

/** Prüft ob ein geplanter Follow-up Event fällig ist */
export function checkFollowupEvents(state: GameState, allEvents: GameEvent[]): GameState {
  if (state.activeEvent) return state;
  const pending = state.pendingFollowups ?? [];
  if (!pending.length) return state;

  const dueIdx = pending.findIndex(p => state.month >= p.triggerMonth);
  if (dueIdx === -1) return state;

  const due = pending[dueIdx];
  const ev = allEvents.find(e => e.id === due.eventId);
  if (!ev) {
    // Event nicht gefunden — entfernen und weiter
    return { ...state, pendingFollowups: pending.filter((_, i) => i !== dueIdx) };
  }

  return {
    ...state,
    pendingFollowups: pending.filter((_, i) => i !== dueIdx),
    activeEvent: ev,
    ...withPause(state, getAutoPauseLevel(ev)),
  };
}

