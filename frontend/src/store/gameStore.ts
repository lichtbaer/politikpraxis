import { create } from 'zustand';
import type { GameState, ContentBundle, GameEvent, EventChoice, SpeedLevel, RouteType, ViewName } from '../core/types';
import { createInitialState } from '../core/state';
import { tick, addLog } from '../core/engine';
import { einbringen, lobbying, abstimmen } from '../core/systems/parliament';
import { startRoute } from '../core/systems/levels';
import { resolveEvent } from '../core/systems/events';
import { medienkampagne, type MilieuKey } from '../core/systems/media';
import { lobbyLand, lobbyFraktion } from '../core/systems/bundesrat';
import { verbandGespraech, verbandTradeoff, verbandLobbyAbstimmung } from '../core/systems/verbaende';
import { applyAusrichtung, type Ausrichtung } from '../core/systems/ausrichtung';
import type { LobbyTradeoffOptions } from '../core/types';
import { getContentBundle } from '../stores/contentStore';
import { DEFAULT_CONTENT } from '../data/defaults/scenarios';
import { saveGame, type SaveFile } from '../services/localStorageSave';

export type GamePhase = 'onboarding' | 'playing';

const DEFAULT_AUSRICHTUNG: Ausrichtung = { wirtschaft: 0, gesellschaft: 0, staat: 0 };

interface GameStore {
  state: GameState;
  content: ContentBundle;
  phase: GamePhase;
  playerName: string;
  complexity: number;
  ausrichtung: Ausrichtung;
  ausrichtungApplied: boolean;

  init: (content?: ContentBundle) => void;
  startGame: () => void;
  setPlayerName: (name: string) => void;
  setComplexity: (c: number) => void;
  setAusrichtung: (a: Ausrichtung) => void;
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
  doLobbyFraktion: (fraktionId: string, gesetzeId: string, schicht: 1 | 2 | 'beziehungspflege' | 'reparatur', tradeoffOptions?: LobbyTradeoffOptions) => void;
  doVerbandGespraech: (verbandId: string) => void;
  doVerbandTradeoff: (verbandId: string, tradeoffKey: string) => void;
  doVerbandLobbyAbstimmung: (verbandId: string, gesetzId: string) => number;
  toggleAgenda: (lawId: string) => void;
  loadSave: (savedState: GameState) => void;
  loadSaveFromFile: (save: SaveFile) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  state: createInitialState(DEFAULT_CONTENT),
  content: DEFAULT_CONTENT,

  phase: 'onboarding',
  playerName: '',
  complexity: 2,
  ausrichtung: DEFAULT_AUSRICHTUNG,
  ausrichtungApplied: false,

  init: (content?: ContentBundle) => {
    const { ausrichtung, ausrichtungApplied, complexity } = get();
    const c = content ?? getContentBundle();
    let initial = createInitialState(c, complexity);
    if (!ausrichtungApplied && (ausrichtung.wirtschaft !== 0 || ausrichtung.gesellschaft !== 0 || ausrichtung.staat !== 0)) {
      initial = applyAusrichtung(initial, ausrichtung);
      set({ ausrichtungApplied: true });
    }
    const withLogs = addLog(
      addLog(
        addLog(initial, 'game:logs.legislaturBegonnen', 'hi'),
        'game:logs.koalitionsvertrag', 'g',
      ),
      'game:logs.gesetzeVorbereitung', '',
      { count: c.laws.length },
    );
    const ELECTION_THRESHOLDS: Record<number, number> = { 1: 35, 2: 38, 3: 40, 4: 42 };
    const electionThreshold = ELECTION_THRESHOLDS[get().complexity] ?? 40;
    const withExpanded = {
      ...withLogs,
      gesetze: withLogs.gesetze.map((g, i) => i === 0 ? { ...g, expanded: true } : g),
      electionThreshold,
    };
    set({ state: withExpanded, content: c });
  },

  startGame: () => set({ phase: 'playing' }),

  setPlayerName: (playerName) => set({ playerName }),

  setComplexity: (complexity) => set({ complexity }),

  setAusrichtung: (ausrichtung) => set({ ausrichtung, ausrichtungApplied: false }),

  gameTick: () => {
    const { state: s, content, phase, playerName, complexity, ausrichtung } = get();
    if (s.gameOver || s.speed === 0) return;
    const nextState = tick(s, content, complexity);
    set({ state: nextState });
    if (phase === 'playing' && !nextState.gameOver) {
      saveGame({ gameState: nextState, playerName, complexity, ausrichtung });
    }
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
  doLobbyFraktion: (fraktionId, gesetzeId, schicht, tradeoffOptions) =>
    set(prev => ({ state: lobbyFraktion(prev.state, fraktionId, gesetzeId, schicht, tradeoffOptions) })),

  doVerbandGespraech: (verbandId) =>
    set(prev => ({
      state: verbandGespraech(prev.state, verbandId, prev.content.verbaende ?? [], prev.complexity),
    })),
  doVerbandTradeoff: (verbandId, tradeoffKey) =>
    set(prev => ({
      state: verbandTradeoff(prev.state, verbandId, tradeoffKey, prev.content.verbaende ?? [], prev.complexity),
    })),
  doVerbandLobbyAbstimmung: (verbandId, gesetzId) => {
    const { state, content, complexity } = get();
    const { state: newState, bonus } = verbandLobbyAbstimmung(state, verbandId, gesetzId, content.verbaende ?? [], complexity);
    set({ state: newState });
    return bonus;
  },

  toggleAgenda: (lawId) =>
    set(prev => ({
      state: {
        ...prev.state,
        gesetze: prev.state.gesetze.map(g =>
          g.id === lawId ? { ...g, expanded: !g.expanded } : g,
        ),
      },
    })),

  loadSave: (savedState) => {
    const initial = createInitialState(getContentBundle(), get().complexity);
    const state = {
      ...savedState,
      bundesratFraktionen: savedState.bundesratFraktionen ?? initial.bundesratFraktionen,
      firedBundesratEvents: savedState.firedBundesratEvents ?? [],
      electionThreshold: savedState.electionThreshold ?? 40,
    };
    set({ state, content: getContentBundle() });
  },

  loadSaveFromFile: (save) => {
    const initial = createInitialState(getContentBundle(), save.complexity);
    const state = {
      ...save.gameState,
      bundesratFraktionen: save.gameState.bundesratFraktionen ?? initial.bundesratFraktionen,
      firedBundesratEvents: save.gameState.firedBundesratEvents ?? [],
      electionThreshold: save.gameState.electionThreshold ?? 40,
    };
    set({
      state,
      content: getContentBundle(),
      playerName: save.playerName,
      complexity: save.complexity,
      ausrichtung: save.ausrichtung,
      ausrichtungApplied: true,
      phase: 'playing',
    });
  },
}));
