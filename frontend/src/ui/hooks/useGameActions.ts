import { useGameStore } from '../../store/gameStore';
import type { GameEvent, EventChoice, RouteType } from '../../core/types';
import type { MilieuKey } from '../../core/systems/media';

export function useGameActions() {
  const store = useGameStore();
  return {
    einbringen: store.doEinbringen,
    einbringenMitFraming: store.doEinbringenMitFraming,
    doPressemitteilung: store.doPressemitteilung,
    doSetWahlkampfBotschaften: store.doSetWahlkampfBotschaften,
    doWahlkampfRede: store.doWahlkampfRede,
    doWahlkampfKoalition: store.doWahlkampfKoalition,
    doWahlkampfMedienoffensive: store.doWahlkampfMedienoffensive,
    lobbying: store.doLobbying,
    abstimmen: store.doAbstimmen,
    startRoute: (lawId: string, route: RouteType) => store.doStartRoute(lawId, route),
    resolveEvent: (event: GameEvent, choice: EventChoice) => store.doResolveEvent(event, choice),
    medienkampagne: (milieu: MilieuKey) => store.doMedienkampagne(milieu),
    lobbyLand: store.doLobbyLand,
    lobbyFraktion: store.doLobbyFraktion,
    koalitionsrunde: store.doKoalitionsrunde,
    doKoalitionsrunde: store.doKoalitionsrunde,
    prioritaetsgespraech: store.doPrioritaetsgespraech,
    koalitionsZugestaendnis: store.doKoalitionsZugestaendnis,
    doKoalitionsZugestaendnis: store.doKoalitionsZugestaendnis,
    doVerbandGespraech: store.doVerbandGespraech,
    doVerbandTradeoff: store.doVerbandTradeoff,
    toggleAgenda: store.toggleAgenda,
    setSpeed: store.setSpeed,
    setView: store.setView,
    startKommunalPilot: store.doStartKommunalPilot,
    startLaenderPilot: store.doStartLaenderPilot,
    startEUInitiativeAlsVorstufe: store.doStartEUInitiativeAlsVorstufe,
    abbrechenVorstufe: store.doAbbrechenVorstufe,
    euLobbyingRunde: store.doEULobbyingRunde,
    euKompromissAnbieten: store.doEUKompromissAnbieten,
    staedtebuendnis: store.doStaedtebuendnis,
    kommunalKonferenz: store.doKommunalKonferenz,
    laenderGipfel: store.doLaenderGipfel,
    pilotBeschleunigen: store.doPilotBeschleunigen,
  };
}
