import { create } from 'zustand';
import i18n from '../i18n';
import type { GameState, ContentBundle, GameEvent, EventChoice, SpeedLevel, RouteType, ViewName, SpielerParteiState } from '../core/types';
import { createInitialState } from '../core/state';
import { tick, addLog } from '../core/engine';
import { einbringen, lobbying, abstimmen, fraktionssitzung, type EinbringenContext, type GesetzBeschlussContext } from '../core/systems/parliament';
import {
  brauchtGegenfinanzierung,
  berechneOptionen,
  wendeGegenfinanzierungAn,
  type GegenfinanzierungsOption,
} from '../core/systems/gegenfinanzierung';
import { applyKongruenzEffekte, getEinbringenPkKosten } from '../core/systems/kongruenz';
import { getMedienPkZusatzkosten } from '../core/systems/medienklima';
import { getVorstufenBoni } from '../core/systems/gesetzLebenszyklus';
import { featureActive } from '../core/systems/features';
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
import { lobbyLand, lobbyFraktion, ueberstimmeBReinspruch } from '../core/systems/bundesrat';
import { verbandGespraech, verbandTradeoff, verbandLobbyAbstimmung } from '../core/systems/verbaende';
import { applyAusrichtung, type Ausrichtung } from '../core/systems/ausrichtung';
import type { LobbyTradeoffOptions } from '../core/types';
import { getContentBundle } from './contentStore';
import { DEFAULT_CONTENT } from '../data/defaults/scenarios';
import { SPIELBARE_PARTEIEN } from '../data/defaults/parteien';
import { saveGame, type SaveFile } from '../services/localStorageSave';
import { useAuthStore } from './authStore';
import { checkAutosave } from '../core/autosave';
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
import {
  pressemitteilung,
  doMedienAktion,
  medienAktionCooldownVerbleibend,
  type MedienSpielerAktionKey,
} from '../core/systems/medienklima';
import { kabinettsgespraech } from '../core/systems/characters';
import { entlasseMinister } from '../core/systems/kabinett';
import { vermittlungsausschuss } from '../core/systems/vermittlung';
import { regierungserklaerung, vertrauensfrage } from '../core/systems/regierung';
import { useUIStore } from './uiStore';

export type GamePhase = 'onboarding' | 'playing';

/** Convenience: fire-and-forget toast from game actions */
const toast = (msg: string, type?: 'info' | 'success' | 'warning' | 'danger') =>
  useUIStore.getState().showToast(msg, type);

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
  /** SMA-344: Einmaliger Bundestag-/NF-Hinweis */
  acknowledgeBundestagHinweis: () => void;

  doEinbringen: (lawId: string) => void;
  /** SMA-335: Einbringen mit vorheriger Gegenfinanzierung */
  doGegenfinanzierungAuswaehlen: (gesetzId: string, option: GegenfinanzierungsOption, subOption?: string) => void;
  doGegenfinanzierungAbbrechen: () => void;
  doLobbying: (lawId: string) => void;
  doAbstimmen: (lawId: string) => void;
  /** Fraktionsdisziplin: Fraktionssitzung einberufen (Abweichler-Risiko halbieren) */
  doFraktionssitzung: (gesetzId: string) => void;
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
  doMedienAktion: (aktion: MedienSpielerAktionKey) => void;
  doSetWahlkampfBotschaften: (botschaften: string[]) => void;
  doEinbringenMitFraming: (lawId: string, framingKey: string | null) => void;
  doKabinettsgespraech: (charId: string) => void;
  doEntlasseMinister: (charId: string) => void;
  doVermittlungsausschuss: (lawId: string) => void;
  /** Art. 77 GG: Bundestag überstimmt BR-Einspruch (nur bei Einspruchsgesetzen) */
  doUeberstimmeBReinspruch: (lawId: string) => void;
  doRegierungserklaerung: () => void;
  doVertrauensfrage: () => void;
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
    const { state: s, content, phase, playerName, complexity, ausrichtung, spielerPartei, kanzlerGeschlecht } = get();
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
        kanzlerGeschlecht: nextState.kanzlerGeschlecht ?? kanzlerGeschlecht ?? 'sie',
      });
      checkAutosave(nextState.month, useAuthStore.getState().accessToken, nextState, {
        playerName: nextState.kanzlerName ?? playerName,
        complexity,
        ausrichtung,
        spielerPartei: nextState.spielerPartei ?? spielerPartei,
        kanzlerGeschlecht: nextState.kanzlerGeschlecht ?? kanzlerGeschlecht ?? 'sie',
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

  acknowledgeBundestagHinweis: () =>
    set((prev) => ({
      state: { ...prev.state, bundestagTabHinweisGezeigt: true },
    })),

  doEinbringen: (lawId) =>
    set((prev) => {
      const law = prev.state.gesetze.find(g => g.id === lawId);
      if (
        law &&
        featureActive(prev.complexity, 'gegenfinanzierung') &&
        brauchtGegenfinanzierung(law)
      ) {
        const optionen = berechneOptionen(prev.state, law, prev.content, prev.complexity);
        const kosten = Math.abs(law.kosten_laufend ?? 0) || Math.abs(law.kosten_einmalig ?? 0) / 10;
        const boni = getVorstufenBoni(prev.state, lawId);
        const kongruenzEffekt = applyKongruenzEffekte(prev.state, lawId, prev.ausrichtung, prev.complexity);
        const medienZusatz = featureActive(prev.complexity, 'medienklima')
          ? getMedienPkZusatzkosten(prev.state.medienKlima ?? 55)
          : 0;
        const pkKosten = Math.max(2, getEinbringenPkKosten(kongruenzEffekt.pkModifikator) - boni.pkKostenRabatt + medienZusatz);
        return { state: { ...prev.state, pendingGegenfinanzierung: { gesetzId: lawId, optionen, kosten, pkKosten } } };
      }
      const ctx: EinbringenContext = {
        ausrichtung: prev.ausrichtung,
        complexity: prev.complexity,
        gesetzRelationen: prev.content.gesetzRelationen,
        content: prev.content,
      };
      const nextState = einbringen(prev.state, lawId, ctx);
      const newLaw = nextState.gesetze.find(g => g.id === lawId);
      if (newLaw && newLaw.status !== 'entwurf') {
        const pkUsed = prev.state.pk - nextState.pk;
        toast(`${newLaw.kurz} eingebracht (−${pkUsed} PK)`, 'success');
      }
      return { state: nextState };
    }),
  doGegenfinanzierungAuswaehlen: (gesetzId, option, subOption) =>
    set((prev) => {
      const { pendingGegenfinanzierung } = prev.state;
      if (!pendingGegenfinanzierung || pendingGegenfinanzierung.gesetzId !== gesetzId) return prev;
      const law = prev.state.gesetze.find(g => g.id === gesetzId);
      if (!law) return prev;
      const ctx: EinbringenContext = {
        ausrichtung: prev.ausrichtung,
        complexity: prev.complexity,
        framingKey: pendingGegenfinanzierung.framingKey,
        gesetzRelationen: prev.content.gesetzRelationen,
        content: prev.content,
      };
      let state = wendeGegenfinanzierungAn(prev.state, law, option, subOption, prev.complexity, prev.content);
      state = { ...state, pendingGegenfinanzierung: undefined };
      state = einbringen(state, gesetzId, ctx);
      return { state };
    }),
  doGegenfinanzierungAbbrechen: () =>
    set((prev) => ({
      state: { ...prev.state, pendingGegenfinanzierung: undefined },
    })),
  doEinbringenMitFraming: (lawId, framingKey) =>
    set((prev) => {
      const law = prev.state.gesetze.find(g => g.id === lawId);
      if (
        law &&
        featureActive(prev.complexity, 'gegenfinanzierung') &&
        brauchtGegenfinanzierung(law)
      ) {
        const optionen = berechneOptionen(prev.state, law, prev.content, prev.complexity);
        const kosten = Math.abs(law.kosten_laufend ?? 0) || Math.abs(law.kosten_einmalig ?? 0) / 10;
        const boni = getVorstufenBoni(prev.state, lawId);
        const kongruenzEffekt = applyKongruenzEffekte(prev.state, lawId, prev.ausrichtung, prev.complexity);
        const medienZusatz = featureActive(prev.complexity, 'medienklima')
          ? getMedienPkZusatzkosten(prev.state.medienKlima ?? 55)
          : 0;
        const pkKosten = Math.max(2, getEinbringenPkKosten(kongruenzEffekt.pkModifikator) - boni.pkKostenRabatt + medienZusatz);
        return {
          state: {
            ...prev.state,
            pendingGegenfinanzierung: {
              gesetzId: lawId,
              optionen,
              kosten,
              pkKosten,
              framingKey: framingKey ?? undefined,
            },
          },
        };
      }
      const ctx: EinbringenContext = {
        ausrichtung: prev.ausrichtung,
        complexity: prev.complexity,
        framingKey: framingKey ?? undefined,
        gesetzRelationen: prev.content.gesetzRelationen,
        content: prev.content,
      };
      const nextState = einbringen(prev.state, lawId, ctx);
      const newLaw = nextState.gesetze.find(g => g.id === lawId);
      if (newLaw && newLaw.status !== 'entwurf') {
        const pkUsed = prev.state.pk - nextState.pk;
        toast(`${newLaw.kurz} eingebracht (−${pkUsed} PK)`, 'success');
      }
      return { state: nextState };
    }),
  doLobbying: (lawId) => set(prev => {
    const nextState = lobbying(prev.state, lawId);
    const newLaw = nextState.gesetze.find(g => g.id === lawId);
    const oldLaw = prev.state.gesetze.find(g => g.id === lawId);
    if (newLaw && oldLaw) {
      const gain = newLaw.ja - oldLaw.ja;
      if (gain > 0) toast(`Lobbying: Zustimmung +${gain}%`, 'info');
    }
    return { state: nextState };
  }),
  doFraktionssitzung: (gesetzId) => set(prev => {
    const nextState = fraktionssitzung(prev.state, gesetzId);
    if (nextState.pk < prev.state.pk) {
      toast('Fraktionssitzung einberufen — Abweichler-Risiko halbiert', 'info');
    }
    return { state: nextState };
  }),
  doAbstimmen: (lawId) =>
    set((prev) => {
      const ctx: GesetzBeschlussContext | undefined = prev.content.milieus
        ? {
            milieus: prev.content.milieus,
            complexity: prev.complexity,
            gesetzRelationen: prev.content.gesetzRelationen,
            content: prev.content,
          }
        : undefined;
      let state = abstimmen(prev.state, lawId, ctx);
      const newLaw = state.gesetze.find(g => g.id === lawId);
      if (newLaw?.status === 'beschlossen') {
        state = updateKoalitionsvertragScore(state, lawId, prev.content, prev.complexity);
        toast(`${newLaw.kurz} beschlossen! Wirkung in ${newLaw.lag} Monaten`, 'success');
      } else if (newLaw?.status === 'blockiert') {
        toast(`${newLaw.kurz}: Mehrheit verfehlt (${newLaw.ja}%)`, 'danger');
      } else if (newLaw?.status === 'bt_passed') {
        toast(`${newLaw.kurz} passiert Bundestag — weiter zum Bundesrat`, 'info');
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
      let next = resolveEvent(prev.state, event, choice, {
        complexity: prev.complexity,
        content: prev.content,
        contentBundle: prev.content,
      });
      const pkDelta = next.pk - prev.state.pk;
      if (pkDelta !== 0) {
        const sign = pkDelta > 0 ? '+' : '';
        toast(`${event.title ?? 'Ereignis'}: ${sign}${pkDelta} PK`, pkDelta > 0 ? 'success' : 'warning');
      }
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
      state: verbandTradeoff(prev.state, verbandId, tradeoffKey, prev.content.verbaende ?? [], prev.complexity, prev.content),
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
      const next = pressemitteilung(prev.state, thema, prev.complexity, prev.content);
      return next ? { state: next } : {};
    }),
  doMedienAktion: (aktion) =>
    set(prev => {
      const wrapped = doMedienAktion(prev.state, aktion, prev.complexity, prev.content);
      if (!wrapped) return {};
      const { state: next, outcome } = wrapped;
      if (!outcome.ok) {
        if (outcome.reason === 'cooldown') {
          const cd = medienAktionCooldownVerbleibend(prev.state, aktion);
          const freiAb = prev.state.month + cd;
          const labels: Record<MedienSpielerAktionKey, string> = {
            oeffentlich_talkshow: 'ÖR-Talkshow',
            boulevard_interview: 'Boulevard-Interview',
            social_kampagne: 'Social-Media-Kampagne',
            qualitaet_gespraech: 'Qualitätspresse-Gespräch',
          };
          toast(`${labels[aktion]} wieder verfügbar in Monat ${freiAb}`, 'warning');
        }
        return {};
      }
      if (outcome.backlash) {
        toast(
          '📱 Backlash! Social-Media-Kampagne nach hinten losgegangen — Öffentliche Medien (Social) Stimmung −20',
          'danger',
        );
        return { state: next };
      }
      switch (outcome.aktion) {
        case 'oeffentlich_talkshow':
          toast(
            '📺 ÖR-Talkshow gebucht — Öffentliche Medien +5, sichtbare Milieus je +1 (−10 PK)',
            'success',
          );
          break;
        case 'boulevard_interview':
          toast(
            '🗞️ Boulevard-Interview erscheint nächsten Monat — Boulevard +10 (2 Mon.), Qualitätspresse −3 (−15 PK)',
            'success',
          );
          break;
        case 'social_kampagne':
          toast('📱 Social-Media-Kampagne gestartet — Social +15 (1 Mon.) (−20 PK)', 'success');
          break;
        case 'qualitaet_gespraech':
          toast(
            '💻 Hintergrundgespräch mit Qualitätspresse vereinbart — Qualität +8, Milieu „Etablierte“ +3 (−15 PK)',
            'success',
          );
          break;
      }
      return { state: next };
    }),
  doKabinettsgespraech: (charId) =>
    set(prev => ({ state: kabinettsgespraech(prev.state, charId) })),

  doEntlasseMinister: (charId) =>
    set(prev => {
      const contentChars = prev.content.characters;
      const next = entlasseMinister(prev.state, charId, prev.complexity, contentChars);
      return next !== prev.state ? { state: next } : {};
    }),

  doVermittlungsausschuss: (lawId) =>
    set(prev => {
      const next = vermittlungsausschuss(prev.state, lawId, prev.complexity);
      if (next !== prev.state) {
        toast('Vermittlungsausschuss einberufen — Kompromiss in 2 Monaten', 'info');
      }
      return next !== prev.state ? { state: next } : {};
    }),

  doUeberstimmeBReinspruch: (lawId) =>
    set(prev => {
      const voteContext = prev.content.milieus
        ? { milieus: prev.content.milieus, complexity: prev.complexity, gesetzRelationen: prev.content.gesetzRelationen }
        : undefined;
      const next = ueberstimmeBReinspruch(prev.state, lawId, voteContext);
      if (next !== prev.state) {
        const law = next.gesetze.find(g => g.id === lawId);
        if (law?.status === 'beschlossen') {
          toast('Bundestag überstimmt BR-Einspruch (Art. 77 GG)', 'success');
        } else {
          toast('Absolute Mehrheit im Bundestag nicht erreicht', 'danger');
        }
      }
      return next !== prev.state ? { state: next } : {};
    }),

  doRegierungserklaerung: () =>
    set(prev => {
      const next = regierungserklaerung(prev.state, prev.complexity);
      return next !== prev.state ? { state: next } : {};
    }),

  doVertrauensfrage: () =>
    set(prev => {
      const next = vertrauensfrage(prev.state, prev.complexity);
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
