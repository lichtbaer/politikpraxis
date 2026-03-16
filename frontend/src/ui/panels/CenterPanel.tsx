import { useGameStore } from '../../store/gameStore';
import { EventCard } from '../components/EventCard/EventCard';
import { AgendaView } from '../views/AgendaView';
import { EbeneView } from '../views/EbeneView';
import { MediaView } from '../views/MediaView';
import { BundesratView } from '../views/BundesratView';
import { useGameActions } from '../hooks/useGameActions';
import type { GameEvent, EventChoice } from '../../core/types';
import styles from './CenterPanel.module.css';

export function CenterPanel() {
  const { state } = useGameStore();
  const { resolveEvent } = useGameActions();

  const handleChoice = (event: GameEvent, choice: EventChoice) => {
    resolveEvent(event, choice);
  };

  return (
    <div className={styles.panel}>
      <div className={styles.ticker}>
        <span className={styles.tickerLabel}>NACHRICHTEN</span>
        <span className={styles.tickerMessage}>{state.ticker || '—'}</span>
      </div>
      <div className={styles.content}>
        {state.activeEvent ? (
          <EventCard event={state.activeEvent} onChoice={handleChoice} />
        ) : (
          <>
            {state.view === 'agenda' && <AgendaView />}
            {(state.view === 'eu' || state.view === 'land' || state.view === 'kommune') && (
              <EbeneView type={state.view} />
            )}
            {state.view === 'medien' && <MediaView />}
            {state.view === 'bundesrat' && <BundesratView />}
          </>
        )}
      </div>
    </div>
  );
}
