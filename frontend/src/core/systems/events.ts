import type { GameState, GameEvent, EventChoice } from '../types';
import { addLog } from '../engine';
import { applyMoodChange } from './characters';
import { resolveMinisterialInitiative } from './ministerialInitiativen';
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

export function checkRandomEvents(state: GameState, eventPool: GameEvent[]): GameState {
  if (state.activeEvent) return state;
  if (Math.random() >= 0.22) return state;

  const available = eventPool.filter(e => !state.firedEvents.includes(e.id));
  if (!available.length) return state;

  const ev = available[Math.floor(Math.random() * available.length)];
  return {
    ...state,
    firedEvents: [...state.firedEvents, ev.id],
    activeEvent: ev,
    speed: 0,
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
        speed: 0,
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
        speed: 0,
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
          speed: 0,
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
          speed: 0,
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
          speed: 0,
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
        speed: 0,
      };
    }
  }

  return state;
}

export function resolveEvent(state: GameState, event: GameEvent, choice: EventChoice): GameState {
  // Ministerial-Initiative: eigene Auflösung
  if (choice.ministerialAction && state.aktiveMinisterialInitiative && event.id.startsWith('mi_')) {
    return resolveMinisterialInitiative(state, choice.ministerialAction);
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

  const logType = choice.type === 'danger' ? 'r' : 'g';
  const choiceIdx = event.choices.indexOf(choice);
  const BR_IDS = new Set(['laenderfinanzausgleich', 'landtagswahl', 'kohl_eskaliert', 'sprecher_wechsel', 'bundesrat_initiative', 'foederalismusgipfel']);
  const CHAR_IDS = new Set(['fm_ultimatum', 'braun_ultimatum', 'wolf_ultimatum', 'kern_ultimatum', 'kanzler_ultimatum', 'kohl_bundesrat_sabotage', 'wm_ultimatum', 'am_ultimatum', 'gm_ultimatum', 'bm_ultimatum']);
  const eventNs = event.charId || CHAR_IDS.has(event.id) ? 'charEvents' : BR_IDS.has(event.id) ? 'bundesratEvents' : 'events';
  const logKey = `game:${eventNs}.${event.id}.choices.${choiceIdx}.log`;
  newState = addLog(newState, logKey, logType);
  const tickerKey = `game:${eventNs}.${event.id}.ticker`;
  newState.ticker = i18n.exists(tickerKey) ? i18n.t(tickerKey) : event.ticker;
  newState.activeEvent = null;

  return newState;
}
