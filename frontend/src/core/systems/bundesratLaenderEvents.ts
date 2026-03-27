/**
 * SMA-395: Länderspezifische Bundesrat-Events (Bayern, NRW, Ostländer).
 */
import type { ContentBundle, GameEvent, GameState } from '../types';
import { withPause, getAutoPauseLevel } from '../eventPause';
import { featureActive } from './features';

function findBrEvent(events: GameEvent[] | undefined, id: string): GameEvent | undefined {
  return events?.find((e) => e.id === id);
}

/** Nach BR-Beschluss: pending Event ausführen */
export function flushPendingBundesratLandEvent(
  state: GameState,
  bundesratEvents: GameEvent[] | undefined,
): GameState {
  const pending = state.pendingBundesratLandEvent;
  if (!pending || state.activeEvent) return state;
  const ev = findBrEvent(bundesratEvents, pending);
  if (!ev) {
    return { ...state, pendingBundesratLandEvent: undefined };
  }
  return {
    ...state,
    pendingBundesratLandEvent: undefined,
    activeEvent: ev,
    firedBundesratEvents: [...(state.firedBundesratEvents ?? []), pending],
    ...withPause(state, getAutoPauseLevel(ev)),
  };
}

export function checkBundesratLaenderEvents(
  state: GameState,
  content: ContentBundle,
  complexity: number,
): GameState {
  if (state.activeEvent) return state;
  if (!featureActive(complexity, 'bundesrat_detail')) return state;

  const br = content.bundesratEvents ?? [];
  const fired = new Set(state.firedBundesratEvents ?? []);

  // 1. Ostländer: Konjunkturindex unter Schwelle
  const kIdx = state.haushalt?.konjunkturIndex ?? 0;
  if (!fired.has('ostlaender_abhaengung') && kIdx <= -10) {
    const ev = findBrEvent(br, 'ostlaender_abhaengung');
    if (ev && (ev.min_complexity ?? 1) <= complexity) {
      return {
        ...state,
        firedBundesratEvents: [...(state.firedBundesratEvents ?? []), 'ostlaender_abhaengung'],
        activeEvent: ev,
        ...withPause(state, getAutoPauseLevel(ev)),
      };
    }
  }

  // 2. NRW: Monat 12
  if (state.month === 12 && !fired.has('nrw_strukturwandel')) {
    const ev = findBrEvent(br, 'nrw_strukturwandel');
    if (ev && (ev.min_complexity ?? 1) <= complexity) {
      return {
        ...state,
        firedBundesratEvents: [...(state.firedBundesratEvents ?? []), 'nrw_strukturwandel'],
        activeEvent: ev,
        ...withPause(state, getAutoPauseLevel(ev)),
      };
    }
  }

  // 3. Bayern: Umwelt-Gesetz im Bundesratsverfahren (einmalig)
  if (!fired.has('bayern_umwelt_konflikt')) {
    const bt = state.gesetze.find(
      (g) =>
        g.status === 'bt_passed' &&
        g.brVoteMonth != null &&
        g.politikfeldId === 'umwelt_energie',
    );
    if (bt) {
      const ev = findBrEvent(br, 'bayern_umwelt_konflikt');
      if (ev && (ev.min_complexity ?? 1) <= complexity) {
        return {
          ...state,
          firedBundesratEvents: [...(state.firedBundesratEvents ?? []), 'bayern_umwelt_konflikt'],
          activeEvent: { ...ev, lawId: bt.id },
          ...withPause(state, getAutoPauseLevel(ev)),
        };
      }
    }
  }

  return state;
}
