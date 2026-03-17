import { useGameStore } from '../../store/gameStore';
import type { GameEvent, EventChoice, RouteType } from '../../core/types';
import type { MilieuKey } from '../../core/systems/media';

export function useGameActions() {
  const store = useGameStore();
  return {
    einbringen: store.doEinbringen,
    lobbying: store.doLobbying,
    abstimmen: store.doAbstimmen,
    startRoute: (lawId: string, route: RouteType) => store.doStartRoute(lawId, route),
    resolveEvent: (event: GameEvent, choice: EventChoice) => store.doResolveEvent(event, choice),
    medienkampagne: (milieu: MilieuKey) => store.doMedienkampagne(milieu),
    lobbyLand: store.doLobbyLand,
    lobbyFraktion: store.doLobbyFraktion,
    koalitionsrunde: store.doKoalitionsrunde,
    prioritaetsgespraech: store.doPrioritaetsgespraech,
    koalitionsZugestaendnis: store.doKoalitionsZugestaendnis,
    toggleAgenda: store.toggleAgenda,
    setSpeed: store.setSpeed,
    setView: store.setView,
  };
}
