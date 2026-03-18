import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { getKoalitionspartner } from '../../core/systems/koalition';
import { featureActive } from '../../core/systems/features';
import { EventCard } from '../components/EventCard/EventCard';
import { GesetzAgendaView } from '../views/GesetzAgendaView';
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
  const { resolveEvent } = useGameActions();

  const partnerContent = getKoalitionspartner(content, state);
  const isKoalitionEvent = state.activeEvent && ['koalitionsbruch', 'koalitionskrise_ultimatum'].includes(state.activeEvent.id);
  const headerColor = isKoalitionEvent && partnerContent?.partei_farbe ? partnerContent.partei_farbe : undefined;

  useEffect(() => {
    if (state.view === 'bundesrat' && !featureActive(complexity, 'bundesrat_sichtbar')) {
      setView('agenda');
    }
    if (state.view === 'verbaende' && !featureActive(complexity, 'verbands_lobbying')) {
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
        {state.activeEvent ? (
          <EventCard event={state.activeEvent} onChoice={handleChoice} headerColor={headerColor} currentPk={state.pk} />
        ) : (
          <>
            {state.view === 'agenda' && <GesetzAgendaView />}
            {(state.view === 'eu' || state.view === 'land' || state.view === 'kommune') && (
              <EbeneView type={state.view} />
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
