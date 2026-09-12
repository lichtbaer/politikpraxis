import { useGameStore } from '../../store/gameStore';
import type { GameEvent, EventChoice, RouteType } from '../../core/types';
import type { MilieuKey } from '../../core/systems/medien/media';

/**
 * Bündelt die Store-Aktionen.
 *
 * Bewusst ohne Abonnement: `useGameStore()` ohne Selektor rendert die Komponente
 * bei *jeder* Store-Änderung neu — auch bei Geschwindigkeitswechsel oder
 * Tab-Wechsel. Der Hook steckt unter anderem in jeder AgendaCard, also einmal pro
 * Gesetz. Die Aktionen werden in `create()` einmal angelegt und nie ersetzt,
 * deshalb reicht ein Lesen des aktuellen Zustands ohne Subscription.
 */
export function useGameActions() {
  const store = useGameStore.getState();
  return {
    einbringen: store.doEinbringen,
    einbringenMitFraming: store.doEinbringenMitFraming,
    gegenfinanzierungAuswaehlen: store.doGegenfinanzierungAuswaehlen,
    gegenfinanzierungAbbrechen: store.doGegenfinanzierungAbbrechen,
    doPressemitteilung: store.doPressemitteilung,
    doMedienAktion: store.doMedienAktion,
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
    partnerWiderstandAbbrechen: store.doPartnerWiderstandAbbrechen,
    partnerWiderstandTrotzdem: store.doPartnerWiderstandTrotzdem,
    partnerWiderstandKoalitionsverhandlung: store.doPartnerWiderstandKoalitionsverhandlung,
    partnerWiderstandAnpassen: store.doPartnerWiderstandAnpassen,
    vermittlungsausschuss: store.doVermittlungsausschuss,
    ueberstimmeBReinspruch: store.doUeberstimmeBReinspruch,
  };
}
