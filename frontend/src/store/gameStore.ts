import { create } from 'zustand';
import i18n from '../i18n';
import type { GameState, ContentBundle, GameEvent, EventChoice, SpeedLevel, RouteType, ViewName, SpielerParteiState } from '../core/types';
import { createInitialState } from '../core/state';
import { tick, addLog } from '../core/engine';
import { einbringen, lobbying, abstimmen, type EinbringenContext, type GesetzBeschlussContext } from '../core/systems/parliament';
import {
  updateKoalitionsvertragScore,
  koalitionsrunde,
  prioritaetsgespraech,
  koalitionsZugestaendnis,
} from '../core/systems/koalition';
import { startRoute } from '../core/systems/levels';
import {
  startEURoute,
  euLobbyingRunde,
  euKompromissAnbieten,
  setRatsvorsitzPrioritaeten,
} from '../core/systems/eu';
import { resolveEvent } from '../core/systems/events';
import { medienkampagne, type MilieuKey } from '../core/systems/media';
import { lobbyLand, lobbyFraktion } from '../core/systems/bundesrat';
import { verbandGespraech, verbandTradeoff, verbandLobbyAbstimmung } from '../core/systems/verbaende';
import { applyAusrichtung, type Ausrichtung } from '../core/systems/ausrichtung';
import type { LobbyTradeoffOptions } from '../core/types';
import { getContentBundle } from '../stores/contentStore';
import { DEFAULT_CONTENT } from '../data/defaults/scenarios';
import { SPIELBARE_PARTEIEN } from '../data/defaults/parteien';
import { saveGame, type SaveFile } from '../services/localStorageSave';
import { migrateGameState, validateGameState } from '../core/state';
import {
  setHaushaltsdebattePrioritaeten,
  advanceHaushaltsdebattePhase,
  schliessenHaushaltsdebatte,
  applySteuerquoteChange,
} from '../core/systems/haushalt';
import {
  startKommunalPilot,
  startLaenderPilot,
  startEUInitiativeAlsVorstufe,
  abbrechenVorstufe,
} from '../core/systems/gesetzLebenszyklus';
import {
  staedtebuendnis,
  kommunalKonferenz,
  laenderGipfel,
  pilotBeschleunigen,
} from '../core/systems/ebeneActions';
import {
  wahlkampfRede,
  wahlkampfKoalition,
  wahlkampfMedienoffensive,
} from '../core/systems/wahlkampf';
import { pressemitteilung } from '../core/systems/medienklima';
import { kabinettsgespraech } from '../core/systems/characters';
import { entlasseMinister } from '../core/systems/kabinett';

export type GamePhase = 'onboarding' | 'playing';

const DEFAULT_AUSRICHTUNG: Ausrichtung = { wirtschaft: 0, gesellschaft: 0, staat: 0 };

interface GameStore {
  state: GameState;
  content: ContentBundle;
  phase: GamePhase;
  playerName: string;
  /** SMA-327: Kanzler-Geschlecht (sie/er/they) für Pronomen/Anrede */
  kanzlerGeschlecht: 'sie' | 'er' | 'they';
  complexity: number;
  ausrichtung: Ausrichtung;
  ausrichtungApplied: boolean;
  /** SMA-289: Gewählte Partei (Stufe 1: SDP default) */
  spielerPartei: SpielerParteiState | null;

  init: (content?: ContentBundle) => void;
  startGame: () => void;
  setPlayerName: (name: string) => void;
  setKanzlerGeschlecht: (g: 'sie' | 'er' | 'they') => void;
  setComplexity: (c: number) => void;
  setAusrichtung: (a: Ausrichtung) => void;
  setSpielerPartei: (partei: SpielerParteiState | null) => void;
  gameTick: () => void;
  setSpeed: (speed: SpeedLevel) => void;
  /** SMA-295: Pause/Play umschalten — bei Pause wird vorheriger Speed wiederhergestellt */
  togglePause: () => void;
  setView: (view: ViewName) => void;

  doEinbringen: (lawId: string) => void;
  doLobbying: (lawId: string) => void;
  doAbstimmen: (lawId: string) => void;
  doStartRoute: (lawId: string, route: RouteType) => void;
  doStartEURoute: (lawId: string, option: 'direkt' | 'verband' | 'bilateral') => void;
  doEULobbyingRunde: (gesetzId: string) => void;
  doEUKompromissAnbieten: (gesetzId: string) => void;
  doSetRatsvorsitzPrioritaeten: (feldIds: string[]) => void;
  doResolveEvent: (event: GameEvent, choice: EventChoice) => void;
  doMedienkampagne: (milieu: MilieuKey) => void;
  doLobbyLand: (landId: string) => void;
  doLobbyFraktion: (fraktionId: string, gesetzeId: string, schicht: 1 | 2 | 'beziehungspflege' | 'reparatur', tradeoffOptions?: LobbyTradeoffOptions) => void;
  doKoalitionsrunde: () => void;
  doPrioritaetsgespraech: (gesetzId: string) => void;
  doKoalitionsZugestaendnis: (forderungId: string) => void;
  doVerbandGespraech: (verbandId: string) => void;
  doVerbandTradeoff: (verbandId: string, tradeoffKey: string) => void;
  doVerbandLobbyAbstimmung: (verbandId: string, gesetzId: string) => number;
  toggleAgenda: (lawId: string) => void;
  doHaushaltsdebattePrioritaeten: (feldIds: string[]) => void;
  doHaushaltsdebatteNext: () => void;
  doHaushaltsdebatteSchliessen: () => void;
  doSteuerquoteChange: (deltaMrd: number) => void;
  doStartKommunalPilot: (gesetzId: string, stadttyp: 'progressiv' | 'konservativ' | 'industrie', stadtname?: string) => void;
  doStartLaenderPilot: (gesetzId: string, fraktionId: string) => void;
  doStartEUInitiativeAlsVorstufe: (gesetzId: string) => void;
  doAbbrechenVorstufe: (gesetzId: string, typ: 'kommunal' | 'laender' | 'eu') => void;
  doStaedtebuendnis: () => void;
  doKommunalKonferenz: () => void;
  doLaenderGipfel: () => void;
  doPilotBeschleunigen: (gesetzId: string, typ: 'kommunal' | 'laender') => void;
  doWahlkampfRede: (milieuId: string) => void;
  doWahlkampfKoalition: () => void;
  doWahlkampfMedienoffensive: () => void;
  doPressemitteilung: (thema: 'haushalt' | 'koalition' | 'politikfeld' | 'opposition') => void;
  doSetWahlkampfBotschaften: (botschaften: string[]) => void;
  doEinbringenMitFraming: (lawId: string, framingKey: string | null) => void;
  doKabinettsgespraech: (charId: string) => void;
  doEntlasseMinister: (charId: string) => void;
  loadSave: (savedState: GameState) => void;
  loadSaveFromFile: (save: SaveFile) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  state: createInitialState(DEFAULT_CONTENT),
  content: DEFAULT_CONTENT,

  phase: 'onboarding',
  playerName: '',
  kanzlerGeschlecht: 'sie',
  complexity: 2,
  ausrichtung: DEFAULT_AUSRICHTUNG,
  ausrichtungApplied: false,
  spielerPartei: null,

  init: (content?: ContentBundle) => {
    const { ausrichtung, ausrichtungApplied, complexity, spielerPartei, playerName, kanzlerGeschlecht } = get();
    const c = content ?? getContentBundle();
    const spielerParteiState =
      spielerPartei ??
      (() => {
        const p = SPIELBARE_PARTEIEN.find((x) => x.id === 'sdp');
        return p ? { id: p.id, kuerzel: p.kuerzel, farbe: p.farbe, name: p.name } : undefined;
      })();
    const kanzlerName = playerName.trim() || undefined;
    let initial = createInitialState(c, complexity, ausrichtung, spielerParteiState ?? undefined, kanzlerName, kanzlerGeschlecht);
    if (!ausrichtungApplied && (ausrichtung.wirtschaft !== 0 || ausrichtung.gesellschaft !== 0 || ausrichtung.staat !== 0)) {
      initial = applyAusrichtung(initial, ausrichtung);
      set({ ausrichtungApplied: true });
    }
    /** SMA-321: Kein "50 Gesetzentwürfe in Vorbereitung" beim Start — nur bei aktiv eingebrachten Gesetzen */
    const withLogs = addLog(
      addLog(initial, 'game:logs.legislaturBegonnen', 'hi'),
      'game:logs.koalitionsvertrag', 'g',
    );
    const ELECTION_THRESHOLDS: Record<number, number> = { 1: 35, 2: 38, 3: 40, 4: 42 };
    const electionThreshold = ELECTION_THRESHOLDS[get().complexity] ?? 40;
    const ersterMonatTicker = i18n.exists('game:onboarding.erster_monat')
      ? i18n.t('game:onboarding.erster_monat')
      : 'Neue Legislaturperiode. Koalitionsvertrag unterzeichnet.';
    const withExpanded = {
      ...withLogs,
      gesetze: withLogs.gesetze.map((g, i) => i === 0 ? { ...g, expanded: true } : g),
      electionThreshold,
      ticker: ersterMonatTicker,
      ...(kanzlerName && { kanzlerName }),
      kanzlerGeschlecht,
    };
    set({ state: withExpanded, content: c });
  },

  startGame: () => set({ phase: 'playing' }),

  setPlayerName: (playerName) => set({ playerName }),

  setKanzlerGeschlecht: (kanzlerGeschlecht) => set({ kanzlerGeschlecht }),

  setComplexity: (complexity) => set({ complexity }),

  setAusrichtung: (ausrichtung) => set({ ausrichtung, ausrichtungApplied: false }),
  setSpielerPartei: (spielerPartei) => set({ spielerPartei }),

  gameTick: () => {
    const { state: s, content, phase, playerName, complexity, ausrichtung } = get();
    if (s.gameOver || s.speed === 0) return;
    const nextState = tick(s, content, complexity, ausrichtung);
    set({ state: nextState });
    if (phase === 'playing' && !nextState.gameOver) {
      saveGame({
        gameState: nextState,
        playerName: nextState.kanzlerName ?? playerName,
        complexity,
        ausrichtung,
        spielerPartei: nextState.spielerPartei,
        kanzlerGeschlecht: nextState.kanzlerGeschlecht ?? get().kanzlerGeschlecht ?? 'sie',
      });
    }
  },

  setSpeed: (speed) => set(prev => ({ state: { ...prev.state, speed } })),
  togglePause: () =>
    set(prev => {
      const { speed, speedBeforePause } = prev.state;
      if (speed === 0) {
        const resume = (speedBeforePause ?? 1) as SpeedLevel;
        return { state: { ...prev.state, speed: resume, speedBeforePause: undefined } };
      }
      return { state: { ...prev.state, speed: 0, speedBeforePause: speed } };
    }),
  setView: (view) => set(prev => ({ state: { ...prev.state, view } })),

  doEinbringen: (lawId) =>
    set((prev) => {
      const ctx: EinbringenContext = {
        ausrichtung: prev.ausrichtung,
        complexity: prev.complexity,
        gesetzRelationen: prev.content.gesetzRelationen,
      };
      return { state: einbringen(prev.state, lawId, ctx) };
    }),
  doEinbringenMitFraming: (lawId, framingKey) =>
    set((prev) => {
      const ctx: EinbringenContext = {
        ausrichtung: prev.ausrichtung,
        complexity: prev.complexity,
        framingKey: framingKey ?? undefined,
        gesetzRelationen: prev.content.gesetzRelationen,
      };
      return { state: einbringen(prev.state, lawId, ctx) };
    }),
  doLobbying: (lawId) => set(prev => ({ state: lobbying(prev.state, lawId) })),
  doAbstimmen: (lawId) =>
    set((prev) => {
      const ctx: GesetzBeschlussContext | undefined = prev.content.milieus
        ? {
            milieus: prev.content.milieus,
            complexity: prev.complexity,
            gesetzRelationen: prev.content.gesetzRelationen,
          }
        : undefined;
      let state = abstimmen(prev.state, lawId, ctx);
      const newLaw = state.gesetze.find(g => g.id === lawId);
      if (newLaw?.status === 'beschlossen') {
        state = updateKoalitionsvertragScore(state, lawId, prev.content, prev.complexity);
      }
      return { state };
    }),
  doStartRoute: (lawId, route) =>
    set((prev) => {
      if (route === 'eu') {
        return { state: startEURoute(prev.state, lawId, 'direkt', prev.content, prev.complexity) };
      }
      return { state: startRoute(prev.state, lawId, route) };
    }),
  doStartEURoute: (lawId, option) =>
    set((prev) => ({
      state: startEURoute(prev.state, lawId, option, prev.content, prev.complexity),
    })),
  doEULobbyingRunde: (gesetzId) =>
    set((prev) => ({
      state: euLobbyingRunde(prev.state, gesetzId, prev.complexity),
    })),
  doEUKompromissAnbieten: (gesetzId) =>
    set((prev) => ({
      state: euKompromissAnbieten(prev.state, gesetzId, prev.complexity),
    })),
  doSetRatsvorsitzPrioritaeten: (feldIds) =>
    set((prev) => ({
      state: setRatsvorsitzPrioritaeten(prev.state, feldIds, prev.content, prev.complexity),
    })),

  doResolveEvent: (event, choice) =>
    set(prev => {
      let next = resolveEvent(prev.state, event, choice, { complexity: prev.complexity, content: prev.content });
      // SMA-295: Auto-Resume nach Event-Auflösung
      if (next.speed === 0 && next.speedBeforePause != null) {
        next = { ...next, speed: next.speedBeforePause, speedBeforePause: undefined };
      }
      // Freigeschaltete Gesetze in state.gesetze einfügen
      if (choice.unlocks_laws?.length && prev.content.laws) {
        for (const lawId of choice.unlocks_laws) {
          if (!next.gesetze.some(g => g.id === lawId)) {
            const lawDef = prev.content.laws.find(l => l.id === lawId);
            if (lawDef) {
              next = {
                ...next,
                gesetze: [...next.gesetze, {
                  ...lawDef,
                  status: 'entwurf' as const,
                  expanded: false,
                  route: null,
                  rprog: 0,
                  rdur: 0,
                  blockiert: null,
                }],
              };
            }
          }
        }
      }
      return { state: next };
    }),

  doMedienkampagne: (milieu) => set(prev => ({ state: medienkampagne(prev.state, milieu) })),
  doLobbyLand: (landId) => set(prev => ({ state: lobbyLand(prev.state, landId) })),
  doLobbyFraktion: (fraktionId, gesetzeId, schicht, tradeoffOptions) =>
    set(prev => ({ state: lobbyFraktion(prev.state, fraktionId, gesetzeId, schicht, tradeoffOptions) })),

  doKoalitionsrunde: () =>
    set(prev => ({ state: koalitionsrunde(prev.state, prev.content, prev.complexity) })),
  doPrioritaetsgespraech: (gesetzId: string) =>
    set(prev => ({ state: prioritaetsgespraech(prev.state, gesetzId, prev.complexity) })),
  doKoalitionsZugestaendnis: (forderungId: string) =>
    set(prev => ({ state: koalitionsZugestaendnis(prev.state, forderungId, prev.content, prev.complexity) })),
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

  doHaushaltsdebattePrioritaeten: (feldIds) =>
    set(prev => ({
      state: setHaushaltsdebattePrioritaeten(prev.state, feldIds),
    })),
  doHaushaltsdebatteNext: () =>
    set(prev => ({
      state: advanceHaushaltsdebattePhase(prev.state),
    })),
  doHaushaltsdebatteSchliessen: () =>
    set(prev => ({
      state: schliessenHaushaltsdebatte(prev.state),
    })),

  doSteuerquoteChange: (deltaMrd) =>
    set(prev => ({
      state: applySteuerquoteChange(prev.state, deltaMrd, prev.complexity),
    })),

  doStartKommunalPilot: (gesetzId, stadttyp, stadtname) =>
    set(prev => ({
      state: startKommunalPilot(prev.state, gesetzId, stadttyp, stadtname, prev.complexity),
    })),
  doStartLaenderPilot: (gesetzId, fraktionId) =>
    set(prev => ({
      state: startLaenderPilot(prev.state, gesetzId, fraktionId, prev.complexity),
    })),
  doStartEUInitiativeAlsVorstufe: (gesetzId) =>
    set(prev => ({
      state: startEUInitiativeAlsVorstufe(prev.state, gesetzId, prev.content, prev.complexity),
    })),
  doAbbrechenVorstufe: (gesetzId, typ) =>
    set(prev => ({
      state: abbrechenVorstufe(prev.state, gesetzId, typ),
    })),

  doStaedtebuendnis: () =>
    set(prev => {
      const next = staedtebuendnis(prev.state, prev.complexity);
      return next !== prev.state ? { state: next } : {};
    }),
  doKommunalKonferenz: () =>
    set(prev => {
      const next = kommunalKonferenz(prev.state, prev.complexity);
      return next !== prev.state ? { state: next } : {};
    }),
  doLaenderGipfel: () =>
    set(prev => {
      const next = laenderGipfel(prev.state, prev.complexity);
      return next !== prev.state ? { state: next } : {};
    }),
  doPilotBeschleunigen: (gesetzId, typ) =>
    set(prev => {
      const next = pilotBeschleunigen(prev.state, gesetzId, typ, prev.complexity);
      return next !== prev.state ? { state: next } : {};
    }),

  doWahlkampfRede: (milieuId) =>
    set(prev => ({
      state: wahlkampfRede(
        prev.state,
        milieuId,
        prev.content,
        prev.ausrichtung,
        prev.complexity,
      ),
    })),
  doWahlkampfKoalition: () =>
    set(prev => ({
      state: wahlkampfKoalition(prev.state, prev.content, prev.complexity),
    })),
  doWahlkampfMedienoffensive: () =>
    set(prev => ({
      state: wahlkampfMedienoffensive(prev.state, prev.content, prev.complexity),
    })),
  doPressemitteilung: (thema) =>
    set(prev => {
      const next = pressemitteilung(prev.state, thema, prev.complexity);
      return next ? { state: next } : {};
    }),
  doKabinettsgespraech: (charId) =>
    set(prev => ({ state: kabinettsgespraech(prev.state, charId) })),

  doEntlasseMinister: (charId) =>
    set(prev => {
      const contentChars = prev.content.characters;
      const next = entlasseMinister(prev.state, charId, prev.complexity, contentChars);
      return next !== prev.state ? { state: next } : {};
    }),

  doSetWahlkampfBotschaften: (botschaften) =>
    set(prev => ({
      state: { ...prev.state, wahlkampfBotschaften: botschaften },
    })),

  loadSave: (savedState) => {
    try {
      const validated = validateGameState(savedState);
      const initial = createInitialState(getContentBundle(), get().complexity);
      const state = migrateGameState({
        ...validated,
        bundesratFraktionen: validated.bundesratFraktionen ?? initial.bundesratFraktionen,
        firedBundesratEvents: validated.firedBundesratEvents ?? [],
        electionThreshold: validated.electionThreshold ?? 40,
      });
      set({ state, content: getContentBundle() });
    } catch {
      console.warn('[politikpraxis] Ungültiger Spielstand – Laden abgebrochen');
    }
  },

  loadSaveFromFile: (save) => {
    try {
      const validated = validateGameState(save.gameState);
      const complexity = Math.max(1, Math.min(4, Number(save.complexity) || 4));
      const initial = createInitialState(getContentBundle(), complexity);
      const state = migrateGameState({
        ...validated,
        bundesratFraktionen: validated.bundesratFraktionen ?? initial.bundesratFraktionen,
        firedBundesratEvents: validated.firedBundesratEvents ?? [],
        electionThreshold: validated.electionThreshold ?? 40,
      });
      const spielerPartei = save.spielerPartei ?? state.spielerPartei ?? null;
      const kanzlerGeschlecht = save.kanzlerGeschlecht ?? state.kanzlerGeschlecht ?? 'sie';
      set({
        state: { ...state, kanzlerGeschlecht },
        content: getContentBundle(),
        playerName: String(save.playerName ?? state.kanzlerName ?? '').slice(0, 100),
        complexity,
        ausrichtung: save.ausrichtung ?? { wirtschaft: 0, gesellschaft: 0, staat: 0 },
        ausrichtungApplied: true,
        spielerPartei,
        kanzlerGeschlecht,
        phase: 'playing',
      });
    } catch {
      console.warn('[politikpraxis] Ungültiger Spielstand – Laden abgebrochen');
    }
  },
}));
