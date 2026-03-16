import type { GameState, RouteType } from '../types';
import { addLog } from '../engine';
import { scheduleEffects } from './economy';

const ROUTE_COSTS: Record<RouteType, number> = { eu: 28, land: 18, kommune: 10 };
const ROUTE_DURATIONS: Record<RouteType, number> = { eu: 8, land: 5, kommune: 4 };

export const ROUTE_INFO: Record<RouteType, { cost: number; dur: number }> = {
  eu: { cost: 28, dur: 8 },
  land: { cost: 18, dur: 5 },
  kommune: { cost: 10, dur: 4 },
};

export function routeLabel(r: RouteType): string {
  return { eu: 'EU-Ebene', land: 'Länder-Pilot', kommune: 'Städtebündnis' }[r];
}

export function startRoute(state: GameState, lawId: string, route: RouteType): GameState {
  const idx = state.gesetze.findIndex(g => g.id === lawId);
  if (idx === -1) return state;

  const cost = ROUTE_COSTS[route];
  if (state.pk < cost) return state;

  const dur = ROUTE_DURATIONS[route];
  const gesetze = state.gesetze.map((g, i) =>
    i === idx
      ? { ...g, status: 'ausweich' as const, route, rprog: 0, rdur: dur, blockiert: null }
      : g,
  );

  return addLog(
    { ...state, pk: state.pk - cost, gesetze, speed: 1 },
    `${gesetze[idx].kurz}: ${routeLabel(route)} gestartet (${dur} Monate)`,
    'b',
  );
}

export function advanceRoutes(state: GameState): GameState {
  const gesetze = state.gesetze.map(g => {
    if (g.route && g.status === 'ausweich') {
      const rprog = g.rprog + 1;
      if (rprog >= g.rdur) {
        return { ...g, status: 'beschlossen' as const, rprog };
      }
      return { ...g, rprog };
    }
    return g;
  });

  let newState = { ...state, gesetze };

  for (const g of gesetze) {
    if (g.status === 'beschlossen' && g.rprog >= g.rdur && g.route) {
      const orig = state.gesetze.find(og => og.id === g.id);
      if (orig && orig.status === 'ausweich') {
        newState = scheduleEffects(newState, g);
        newState = addLog(newState, `${g.kurz} via ${routeLabel(g.route)} beschlossen`, 'g');
      }
    }
  }

  return newState;
}
