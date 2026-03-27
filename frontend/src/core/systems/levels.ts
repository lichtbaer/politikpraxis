import type { GameState, RouteType, ContentBundle } from '../types';
import { addLog } from '../engine';
import { scheduleEffects } from './economy';
import { applyGesetzMedienAkteureNachBeschluss } from './medienklima';

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

  const law = state.gesetze[idx];
  const overrides = law.route_overrides?.[route];
  const cost = options?.costOverride ?? overrides?.cost ?? ROUTE_COSTS[route];
  if (state.pk < cost) return state;

  const dur = overrides?.dur ?? ROUTE_DURATIONS[route];
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

export function advanceRoutes(
  state: GameState,
  content?: ContentBundle,
  complexity?: number,
): AdvanceRoutesResult {
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
        const lawForEffects = {
          effekte: g.effekte as Record<string, number>,
          lag: g.lag,
          kurz: g.kurz,
          gesetzId: g.id,
        };
        newState = scheduleEffects(newState, lawForEffects);
        const cx = complexity ?? newState.complexity ?? 4;
        if (content) {
          newState = applyGesetzMedienAkteureNachBeschluss(newState, g, cx, content);
        }
        newState = addLog(newState, `${g.kurz} via ${routeLabel(g.route)} beschlossen`, 'g');
        completedVorstufe = { lawId: g.id, route: g.route };
      }
    }
  }

  return { state: newState, completedVorstufe };
}
