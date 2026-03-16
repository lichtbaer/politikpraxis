import { create } from 'zustand';
import type { GameState, ContentBundle, GameEvent, EventChoice, SpeedLevel, RouteType, ViewName } from '../core/types';
import { createInitialState } from '../core/state';
import { tick, addLog } from '../core/engine';
import { einbringen, lobbying, abstimmen } from '../core/systems/parliament';
import { startRoute } from '../core/systems/levels';
import { resolveEvent } from '../core/systems/events';
import { medienkampagne, type MilieuKey } from '../core/systems/media';
import { lobbyLand } from '../core/systems/bundesrat';
import { DEFAULT_CONTENT } from '../data/defaults/scenarios';

interface GameStore {
  state: GameState;
  content: ContentBundle;

  init: (content?: ContentBundle) => void;
  gameTick: () => void;
  setSpeed: (speed: SpeedLevel) => void;
  setView: (view: ViewName) => void;

  doEinbringen: (lawId: string) => void;
  doLobbying: (lawId: string) => void;
  doAbstimmen: (lawId: string) => void;
  doStartRoute: (lawId: string, route: RouteType) => void;
  doResolveEvent: (event: GameEvent, choice: EventChoice) => void;
  doMedienkampagne: (milieu: MilieuKey) => void;
  doLobbyLand: (landId: string) => void;
  toggleAgenda: (lawId: string) => void;
  loadSave: (savedState: GameState) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  state: createInitialState(DEFAULT_CONTENT),
  content: DEFAULT_CONTENT,

  init: (content?: ContentBundle) => {
    const c = content || DEFAULT_CONTENT;
    const initial = createInitialState(c);
    const withLogs = addLog(
      addLog(
        addLog(initial, 'Neue Legislaturperiode begonnen', 'hi'),
        'Koalitionsvertrag unterzeichnet', 'g',
      ),
      `${c.laws.length} Gesetzentwürfe in Vorbereitung`, '',
    );
    const withExpanded = {
      ...withLogs,
      gesetze: withLogs.gesetze.map((g, i) => i === 0 ? { ...g, expanded: true } : g),
    };
    set({ state: withExpanded, content: c });
  },

  gameTick: () => {
    const { state: s, content } = get();
    if (s.gameOver || s.speed === 0) return;
    set({ state: tick(s, content) });
  },

  setSpeed: (speed) => set(prev => ({ state: { ...prev.state, speed } })),
  setView: (view) => set(prev => ({ state: { ...prev.state, view } })),

  doEinbringen: (lawId) => set(prev => ({ state: einbringen(prev.state, lawId) })),
  doLobbying: (lawId) => set(prev => ({ state: lobbying(prev.state, lawId) })),
  doAbstimmen: (lawId) => set(prev => ({ state: abstimmen(prev.state, lawId) })),
  doStartRoute: (lawId, route) => set(prev => ({ state: startRoute(prev.state, lawId, route) })),

  doResolveEvent: (event, choice) =>
    set(prev => ({ state: resolveEvent(prev.state, event, choice) })),

  doMedienkampagne: (milieu) => set(prev => ({ state: medienkampagne(prev.state, milieu) })),
  doLobbyLand: (landId) => set(prev => ({ state: lobbyLand(prev.state, landId) })),

  toggleAgenda: (lawId) =>
    set(prev => ({
      state: {
        ...prev.state,
        gesetze: prev.state.gesetze.map(g =>
          g.id === lawId ? { ...g, expanded: !g.expanded } : g,
        ),
      },
    })),

  loadSave: (savedState) => set({ state: savedState }),
}));
