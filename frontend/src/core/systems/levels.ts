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

export interface StartRouteOptions {
  /** Override cost (z.B. 8 PK bei Kommunal-Initiative koordinieren) */
  costOverride?: number;
}

export function startRoute(
  state: GameState,
  lawId: string,
  route: RouteType,
  options?: StartRouteOptions,
): GameState {
  const idx = state.gesetze.findIndex(g => g.id === lawId);
  if (idx === -1) return state;

  const cost = options?.costOverride ?? ROUTE_COSTS[route];
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

export interface AdvanceRoutesResult {
  state: GameState;
  /** Wenn eine Vorstufe abgeschlossen wurde (kommune/land) */
  completedVorstufe?: { lawId: string; route: 'kommune' | 'land' };
}

export function advanceRoutes(state: GameState): AdvanceRoutesResult {
  const gesetze = state.gesetze.map(g => {
    if (g.route && g.status === 'ausweich') {
      if (g.route === 'eu' && state.eu?.aktiveRoute?.gesetzId === g.id) {
        return g;
      }
      const rprog = g.rprog + 1;
      if (rprog >= g.rdur) {
        return { ...g, status: 'beschlossen' as const, rprog };
      }
      return { ...g, rprog };
    }
    return g;
  });

  let newState: GameState = { ...state, gesetze };
  let completedVorstufe: { lawId: string; route: 'kommune' | 'land' } | undefined;

  for (const g of gesetze) {
    if (g.status === 'beschlossen' && g.rprog >= g.rdur && g.route && g.route !== 'eu') {
      const orig = state.gesetze.find(og => og.id === g.id);
      if (orig && orig.status === 'ausweich') {
        const lawForEffects = { effekte: g.effekte as Record<string, number>, lag: g.lag, kurz: g.kurz };
        newState = scheduleEffects(newState, lawForEffects);
        newState = addLog(newState, `${g.kurz} via ${routeLabel(g.route)} beschlossen`, 'g');
        completedVorstufe = { lawId: g.id, route: g.route };
      }
    }
  }

  return { state: newState, completedVorstufe };
}
