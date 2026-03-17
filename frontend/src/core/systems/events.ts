import type { GameState, GameEvent, EventChoice } from '../types';
import { addLog } from '../engine';
import { withPause, getAutoPauseLevel } from '../eventPause';
import { applyMoodChange } from './characters';
import { resolveMinisterialInitiative } from './ministerialInitiativen';
import { startKommunalPilot } from './gesetzLebenszyklus';
import { applyVorbildBonus } from './gesetzLebenszyklus';
import { resolveTVDuell } from './wahlkampf';
import { applyMedienChoiceDelta } from './medienklima';
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

export function checkRandomEvents(state: GameState, eventPool: GameEvent[]): GameState {
  if (state.activeEvent) return state;
  if (Math.random() >= 0.22) return state;

  const available = eventPool
    .filter(e => !WAHLKAMPF_EVENT_IDS.has(e.id))
    .filter(e => !state.firedEvents.includes(e.id));
  if (!available.length) return state;

  const ev = available[Math.floor(Math.random() * available.length)];
  return {
    ...state,
    firedEvents: [...state.firedEvents, ev.id],
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

  const fired = state.firedEvents ?? [];
  const haushaltSaldo = state.haushalt?.saldo ?? 0;
  const politikfeldDruck = state.politikfeldDruck ?? {};
  const minBrBeziehung = state.bundesratFraktionen?.length
    ? Math.min(...state.bundesratFraktionen.map(f => f.beziehung))
    : 100;

  for (const ev of events) {
    if (fired.includes(ev.id)) continue;
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
      firedEvents: [...fired, ev.id],
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

  const fired = state.firedEvents ?? [];
  const haushaltSaldo = state.haushalt?.saldo ?? 0;
  const konjunkturIndex = state.haushalt?.konjunkturIndex ?? 0;

  for (const ev of events) {
    if (fired.includes(ev.id)) continue;
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
      firedEvents: [...fired, ev.id],
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
}

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

  // Kommunal-Initiative: als_vorbild — +2% BT auf GesetzProjekt, 0 PK (SMA-274)
  const kommunalIds = new Set(['kommunal_klima_initiative', 'kommunal_sozial_initiative', 'kommunal_sicherheit_initiative']);
  if (kommunalIds.has(event.id) && choice.key === 'als_vorbild' && event.lawId) {
    if (state.pk < (choice.cost || 0)) return state;
    let newState: GameState = { ...state, pk: state.pk - (choice.cost || 0) };
    newState = applyVorbildBonus(newState, event.lawId);
    const choiceIdx = event.choices.indexOf(choice);
    const logKey = `game:kommunalEvents.${event.id}.choices.${choiceIdx}.log`;
    newState = addLog(newState, logKey, 'g');
    newState.ticker = i18n.exists(`game:kommunalEvents.${event.id}.ticker`) ? i18n.t(`game:kommunalEvents.${event.id}.ticker`) : event.ticker;
    newState.activeEvent = null;
    return newState;
  }

  // Kommunal-Initiative: koordinieren — startKommunalPilot (8 PK, voller Bonus) (SMA-274)
  if (kommunalIds.has(event.id) && choice.key === 'koordinieren' && event.lawId) {
    if (state.pk < (choice.cost || 0)) return state;
    const stadttyp = (event as GameEvent & { stadttyp?: 'progressiv' | 'konservativ' | 'industrie' }).stadttyp ?? 'progressiv';
    let newState = startKommunalPilot(state, event.lawId, stadttyp, undefined, complexity);
    const choiceIdx = event.choices.indexOf(choice);
    newState = addLog(newState, `game:kommunalEvents.${event.id}.choices.${choiceIdx}.log`, 'g');
    newState.ticker = event.ticker;
    newState.activeEvent = null;
    return newState;
  }

  // Medien-Events (Skandal, positiv): medienklima_delta aus Choice anwenden (SMA-277)
  if (event.id.startsWith('medien_')) {
    if (state.pk < (choice.cost || 0)) return state;
    let newState: GameState = { ...state, pk: state.pk - (choice.cost || 0) };
    newState = applyMedienChoiceDelta(newState, choice);
    if (choice.charMood) {
      newState = applyMoodChange(newState, choice.charMood, choice.loyalty);
    }
    newState = addLog(newState, choice.log, choice.type === 'danger' ? 'r' : 'g');
    newState.ticker = event.ticker;
    newState.activeEvent = null;
    return newState;
  }

  // TV-Duell (SMA-278): eigene Auflösung
  if (event.id === 'tv_duell') {
    const vorbereitet = choice.key === 'vorbereiten';
    if (vorbereitet && state.pk < (choice.cost || 0)) return state;
    const nextPk = vorbereitet ? state.pk - (choice.cost || 0) : state.pk;
    let newState = { ...state, pk: nextPk };
    newState = resolveTVDuell(newState, vorbereitet);
    newState = addLog(newState, choice.log, vorbereitet ? 'g' : 'r');
    newState.ticker = event.ticker;
    newState.activeEvent = null;
    return newState;
  }

  // Wahlkampf-Beginn, Koalitionspartner-Alleingang: einfaches Bestätigen
  if (event.id === 'wahlkampf_beginn' || event.id === 'koalitionspartner_alleingang') {
    return { ...state, activeEvent: null };
  }

  // SMA-309: Steuer-Events (steuereinnahmen_einbruch, haushaltsstreit_opposition, steuerstreit_koalition)
  const STEUER_IDS = new Set(['steuereinnahmen_einbruch', 'haushaltsstreit_opposition', 'steuerstreit_koalition']);
  if (STEUER_IDS.has(event.id)) {
    if (state.pk < (choice.cost || 0)) return state;
    let newState: GameState = { ...state, pk: state.pk - (choice.cost || 0) };
    newState = applyMedienChoiceDelta(newState, choice);
    if (choice.koalitionspartnerBeziehung != null && newState.koalitionspartner) {
      newState = {
        ...newState,
        koalitionspartner: {
          ...newState.koalitionspartner,
          beziehung: Math.max(0, Math.min(100, newState.koalitionspartner.beziehung + choice.koalitionspartnerBeziehung)),
        },
      };
    }
    if (event.id === 'steuereinnahmen_einbruch' && newState.haushalt && choice.effect?.hh != null) {
      const hhDelta = choice.effect.hh;
      if (choice.key === 'sparen' && hhDelta > 0) {
        newState = {
          ...newState,
          haushalt: {
            ...newState.haushalt,
            laufendeAusgaben: Math.max(0, newState.haushalt.laufendeAusgaben - hhDelta),
            saldo: newState.haushalt.einnahmen - newState.haushalt.pflichtausgaben - Math.max(0, newState.haushalt.laufendeAusgaben - hhDelta),
          },
        };
      } else if (choice.key === 'steuer' && hhDelta > 0) {
        newState = {
          ...newState,
          haushalt: {
            ...newState.haushalt,
            einnahmen: newState.haushalt.einnahmen + hhDelta,
            saldo: newState.haushalt.einnahmen + hhDelta - newState.haushalt.pflichtausgaben - newState.haushalt.laufendeAusgaben,
          },
        };
      }
    }
    newState = addLog(newState, choice.log, choice.type === 'danger' ? 'r' : 'g');
    newState.ticker = event.ticker;
    newState.activeEvent = null;
    return newState;
  }

  // SMA-298: Kommunal/Länder conditional Events (Haushaltskrise, Bürgerprotest, Länder-Koalitionskrise)
  const KOMMUNAL_LAENDER_IDS = new Set(['kommunal_haushaltskrise', 'kommunal_buergerprotest', 'laender_koalitionskrise']);
  if (KOMMUNAL_LAENDER_IDS.has(event.id)) {
    if (state.pk < (choice.cost || 0)) return state;
    let newState: GameState = { ...state, pk: state.pk - (choice.cost || 0), kpi: { ...state.kpi } };
    newState = applyMedienChoiceDelta(newState, choice);
    for (const [k, v] of Object.entries(choice.effect || {})) {
      const key = k as 'al' | 'hh' | 'gi' | 'zf';
      if (key in newState.kpi) {
        newState.kpi[key] = +Math.max(0, newState.kpi[key] + v).toFixed(2);
        if (key === 'zf') newState.kpi.zf = Math.min(100, newState.kpi.zf);
      }
    }
    if (choice.bundesratBonusAll != null && newState.bundesratFraktionen) {
      newState = {
        ...newState,
        bundesratFraktionen: newState.bundesratFraktionen.map(f =>
          ({ ...f, beziehung: Math.max(0, Math.min(100, f.beziehung + choice.bundesratBonusAll!)) }),
        ),
      };
    }
    newState = addLog(newState, choice.log, choice.type === 'danger' ? 'r' : 'g');
    newState.ticker = event.ticker;
    newState.activeEvent = null;
    return newState;
  }

  // SMA-280: Extremismus-Events (Koalitionspartner-Warnung, Verfassungsgericht)
  const EXTREMISMUS_IDS = new Set(['koalitionspartner_extremismus_warnung', 'verfassungsgericht_klage']);
  if (EXTREMISMUS_IDS.has(event.id)) {
    if (state.pk < (choice.cost || 0)) return state;
    let newState: GameState = { ...state, pk: state.pk - (choice.cost || 0) };
    newState = applyMedienChoiceDelta(newState, choice);
    if (choice.koalitionspartnerBeziehung != null && newState.koalitionspartner) {
      newState = {
        ...newState,
        koalitionspartner: {
          ...newState.koalitionspartner,
          beziehung: Math.min(100, Math.max(0, newState.koalitionspartner.beziehung + choice.koalitionspartnerBeziehung)),
        },
      };
    }
    if (event.id === 'verfassungsgericht_klage' && choice.verfahrenDauerMonate != null) {
      if (choice.verfahrenDauerMonate === 0) {
        newState = {
          ...newState,
          verfassungsgerichtPausiert: true,
          verfassungsgerichtVerfahrenBisMonat: undefined,
        };
      } else {
        newState = {
          ...newState,
          verfassungsgerichtVerfahrenBisMonat: newState.month + choice.verfahrenDauerMonate,
          verfassungsgerichtPausiert: false,
        };
      }
    }
    newState = addLog(newState, choice.log, choice.type === 'danger' ? 'r' : 'g');
    newState.ticker = event.ticker;
    newState.activeEvent = null;
    return newState;
  }

  if (state.pk < (choice.cost || 0)) return state;

  let newState: GameState = { ...state, pk: state.pk - (choice.cost || 0), kpi: { ...state.kpi } };

  for (const [k, v] of Object.entries(choice.effect || {})) {
    const key = k as keyof typeof newState.kpi;
    newState.kpi[key] = +Math.max(0, newState.kpi[key] + v).toFixed(2);
    if (key === 'zf') newState.kpi.zf = Math.min(100, newState.kpi.zf);
  }

  if (choice.charMood) {
    newState = applyMoodChange(newState, choice.charMood, choice.loyalty);
  }

  if (choice.brRelation && newState.bundesratFraktionen) {
    newState = {
      ...newState,
      bundesratFraktionen: newState.bundesratFraktionen.map(f => {
        const delta = choice.brRelation![f.id];
        if (delta == null) return f;
        return { ...f, beziehung: Math.max(0, Math.min(100, f.beziehung + delta)) };
      }),
    };
  }
  if (choice.bundesratBonusAll != null && newState.bundesratFraktionen) {
    newState = {
      ...newState,
      bundesratFraktionen: newState.bundesratFraktionen.map(f =>
        ({ ...f, beziehung: Math.max(0, Math.min(100, f.beziehung + choice.bundesratBonusAll!)) }),
      ),
    };
  }

  if (choice.brRelationInitiator != null && event.fraktionId && newState.bundesratFraktionen) {
    newState = {
      ...newState,
      bundesratFraktionen: newState.bundesratFraktionen.map(f =>
        f.id === event.fraktionId
          ? { ...f, beziehung: Math.max(0, Math.min(100, f.beziehung + choice.brRelationInitiator!)) }
          : f,
      ),
    };
  }

  // Bundesrat-spezifische Effekte
  if (event.id === 'landtagswahl' && event.fraktionId && event.landId && event.landtagswahlToFraktion) {
    newState = applyLandtagswahlEffect(newState, event);
  }
  if (event.id === 'sprecher_wechsel' && event.fraktionId && event.sprecherErsatz) {
    newState = applySprecherWechselEffect(newState, event);
  }

  if (choice.koalitionspartnerBeziehung != null && newState.koalitionspartner) {
    newState = {
      ...newState,
      koalitionspartner: {
        ...newState.koalitionspartner,
        beziehung: Math.min(100, Math.max(0, newState.koalitionspartner.beziehung + choice.koalitionspartnerBeziehung)),
      },
      koalitionsbruchSeitMonat: undefined,
    };
  }

  const logType = choice.type === 'danger' ? 'r' : 'g';
  const choiceIdx = event.choices.indexOf(choice);
  const BR_IDS = new Set(['laenderfinanzausgleich', 'landtagswahl', 'kohl_eskaliert', 'sprecher_wechsel', 'bundesrat_initiative', 'foederalismusgipfel']);
  const KOMMUNAL_IDS = new Set(['kommunal_klima_initiative', 'kommunal_sozial_initiative', 'kommunal_sicherheit_initiative']);
  const VORSTUFEN_IDS = new Set(['vorstufe_kommunal_erfolg', 'vorstufe_laender_erfolg']);
  const CHAR_IDS = new Set(['fm_ultimatum', 'braun_ultimatum', 'wolf_ultimatum', 'kern_ultimatum', 'kanzler_ultimatum', 'kohl_bundesrat_sabotage', 'wm_ultimatum', 'am_ultimatum', 'gm_ultimatum', 'bm_ultimatum', 'koalitionsbruch', 'koalitionskrise_ultimatum']);
  const eventNs = event.charId || CHAR_IDS.has(event.id) ? 'charEvents' : BR_IDS.has(event.id) ? 'bundesratEvents' : KOMMUNAL_IDS.has(event.id) ? 'kommunalEvents' : VORSTUFEN_IDS.has(event.id) ? 'vorstufenEvents' : 'events';
  const logKey = `game:${eventNs}.${event.id}.choices.${choiceIdx}.log`;
  newState = addLog(newState, logKey, logType);
  const tickerKey = `game:${eventNs}.${event.id}.ticker`;
  newState.ticker = i18n.exists(tickerKey) ? i18n.t(tickerKey) : event.ticker;
  newState.activeEvent = null;

  return newState;
}
