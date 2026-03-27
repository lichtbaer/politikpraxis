import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { getKoalitionspartner } from '../../core/systems/koalition';
import { featureActive } from '../../core/systems/features';
import { EventCard } from '../components/EventCard/EventCard';
import { GegenfinanzierungsModal } from '../components/GegenfinanzierungsModal/GegenfinanzierungsModal';
import { PartnerWiderstandModal } from '../components/PartnerWiderstandModal/PartnerWiderstandModal';
import type { GegenfinanzierungsOption } from '../../core/systems/gegenfinanzierung';
import { GesetzAgendaView } from '../views/GesetzAgendaView';
import { BundestagView } from '../views/BundestagView';
import { KabinettView } from '../views/KabinettView';
import { HaushaltView } from '../views/HaushaltView';
import { EbeneView } from '../views/EbeneView';
import { MediaView } from '../views/MediaView';
import { BundesratView } from '../views/BundesratView';
import { VerbaendeView } from '../views/VerbaendeView';
import { WahlkampfScreen } from '../screens/WahlkampfScreen';
import { useGameActions } from '../hooks/useGameActions';
import type { GameEvent, EventChoice } from '../../core/types';
import styles from './CenterPanel.module.css';

export function CenterPanel() {
  const { t } = useTranslation('game');
  const { state, content, setView, complexity } = useGameStore();
  const {
    resolveEvent,
    gegenfinanzierungAuswaehlen,
    gegenfinanzierungAbbrechen,
    partnerWiderstandAbbrechen,
    partnerWiderstandTrotzdem,
    partnerWiderstandKoalitionsverhandlung,
    partnerWiderstandAnpassen,
  } = useGameActions();

  const partnerContent = getKoalitionspartner(content, state);
  const isKoalitionEvent = state.activeEvent && ['koalitionsbruch', 'koalitionskrise_ultimatum'].includes(state.activeEvent.id);
  const isAgendaEvent = state.activeEvent?.id?.startsWith('agenda_');
  const agendaChar = isAgendaEvent && state.activeEvent?.charId
    ? state.chars.find(c => c.id === state.activeEvent!.charId)
    : null;
  const headerColor = isKoalitionEvent && partnerContent?.partei_farbe
    ? partnerContent.partei_farbe
    : isAgendaEvent && agendaChar?.color
      ? agendaChar.color
      : undefined;

  useEffect(() => {
    if (state.view === 'bundesrat' && !featureActive(complexity, 'bundesrat_sichtbar')) {
      setView('agenda');
    }
    if (state.view === 'verbaende' && !featureActive(complexity, 'verbands_lobbying')) {
      setView('agenda');
    }
    if (state.view === 'haushalt' && complexity < 2) {
      setView('agenda');
    }
    if ((state.view === 'laender' || state.view === 'kommunen') && complexity < 3) {
      setView('agenda');
    }
    if (state.view === 'eu' && !featureActive(complexity, 'eu_route')) {
      setView('agenda');
    }
  }, [state.view, complexity, setView]);

  const handleChoice = (event: GameEvent, choice: EventChoice) => {
    resolveEvent(event, choice);
  };

  return (
    <div className={styles.panel}>
      <div className={styles.ticker}>
        <span className={styles.tickerLabel}>{t('game:ticker.label')}</span>
        <span className={styles.tickerMessage}>{state.ticker || '—'}</span>
      </div>
      <div className={styles.content}>
        {state.pendingPartnerWiderstand ? (
          <PartnerWiderstandModal
            partnerName={partnerContent.name}
            partnerKuerzel={partnerContent.partei_kuerzel}
            partnerId={state.pendingPartnerWiderstand.partnerId}
            intensitaet={state.pendingPartnerWiderstand.intensitaet}
            koalitionsMalus={state.pendingPartnerWiderstand.koalitionsMalus}
            currentPk={state.pk}
            onAbbrechen={partnerWiderstandAbbrechen}
            onTrotzdem={partnerWiderstandTrotzdem}
            onKoalitionsverhandlung={partnerWiderstandKoalitionsverhandlung}
            onAnpassen={partnerWiderstandAnpassen}
          />
        ) : state.pendingGegenfinanzierung ? (
          <GegenfinanzierungsModal
            gesetzTitel={
              state.gesetze.find((g) => g.id === state.pendingGegenfinanzierung!.gesetzId)?.titel ??
              state.pendingGegenfinanzierung.gesetzId
            }
            optionen={state.pendingGegenfinanzierung.optionen as GegenfinanzierungsOption[]}
            kosten={state.pendingGegenfinanzierung.kosten}
            pkKosten={state.pendingGegenfinanzierung.pkKosten}
            getGesetzTitel={(id) => state.gesetze.find((g) => g.id === id)?.titel ?? id}
            onConfirm={(opt, sub) =>
              gegenfinanzierungAuswaehlen(state.pendingGegenfinanzierung!.gesetzId, opt, sub)
            }
            onClose={gegenfinanzierungAbbrechen}
          />
        ) : state.activeEvent ? (
          <EventCard event={state.activeEvent} onChoice={handleChoice} headerColor={headerColor} currentPk={state.pk} />
        ) : (
          <>
            {state.view === 'agenda' && <GesetzAgendaView />}
            {state.view === 'bundestag' && <BundestagView />}
            {state.view === 'kabinett' && <KabinettView />}
            {state.view === 'haushalt' && <HaushaltView />}
            {(state.view === 'eu' || state.view === 'laender' || state.view === 'kommunen') && (
              <EbeneView type={state.view === 'laender' ? 'land' : state.view === 'kommunen' ? 'kommune' : 'eu'} />
            )}
            {state.view === 'medien' && <MediaView />}
            {state.view === 'bundesrat' && <BundesratView />}
            {state.view === 'verbaende' && <VerbaendeView />}
            {state.view === 'wahlkampf' && <WahlkampfScreen />}
          </>
        )}
      </div>
    </div>
  );
}
