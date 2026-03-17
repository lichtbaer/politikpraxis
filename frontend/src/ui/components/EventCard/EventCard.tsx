import { useTranslation } from 'react-i18next';
import type { GameEvent, EventChoice } from '../../../core/types';
import styles from './EventCard.module.css';

interface EventCardProps {
  event: GameEvent;
  onChoice: (event: GameEvent, choice: EventChoice) => void;
}

const TYPE_CLASS: Record<GameEvent['type'], string> = {
  danger: styles.headerDanger,
  warn: styles.headerWarn,
  good: styles.headerGood,
  info: styles.headerInfo,
};

const CHOICE_CLASS: Record<EventChoice['type'], string> = {
  primary: styles.choicePrimary,
  danger: styles.choiceDanger,
  safe: styles.choiceSafe,
};

function getEventNs(event: GameEvent): 'events' | 'charEvents' | 'bundesratEvents' {
  const BR_IDS = new Set(['laenderfinanzausgleich', 'landtagswahl', 'kohl_eskaliert', 'sprecher_wechsel', 'bundesrat_initiative', 'foederalismusgipfel']);
  const CHAR_IDS = new Set(['fm_ultimatum', 'braun_ultimatum', 'wolf_ultimatum', 'kern_ultimatum', 'kanzler_ultimatum', 'kohl_bundesrat_sabotage', 'wm_ultimatum', 'am_ultimatum', 'gm_ultimatum', 'bm_ultimatum', 'koalitionsbruch', 'koalitionskrise_ultimatum']);
  return event.charId || CHAR_IDS.has(event.id) ? 'charEvents' : BR_IDS.has(event.id) ? 'bundesratEvents' : 'events';
}

export function EventCard({ event, onChoice }: EventCardProps) {
  const { t } = useTranslation('game');
  const headerClass = `${styles.header} ${TYPE_CLASS[event.type]}`;
  const ns = getEventNs(event);

  return (
    <article className={styles.card}>
      <header className={headerClass}>
        <span className={styles.icon}>{event.icon}</span>
        <div className={styles.headerText}>
          <span className={styles.typeLabel}>{t(`game:${ns}.${event.id}.typeLabel`).toUpperCase()}</span>
          <h2 className={styles.title}>{t(`game:${ns}.${event.id}.title`)}</h2>
        </div>
      </header>
      <div className={styles.body}>
        {event.quote && (
          <blockquote className={styles.quote}>{t(`game:${ns}.${event.id}.quote`)}</blockquote>
        )}
        <p className={styles.context}>{t(`game:${ns}.${event.id}.context`)}</p>
        <div className={styles.choices}>
          {event.choices.map((choice, i) => (
            <button
              key={i}
              type="button"
              className={`${styles.choice} ${CHOICE_CLASS[choice.type]}`}
              onClick={() => onChoice(event, choice)}
            >
              <div className={styles.choiceMain}>
                <span className={styles.choiceLabel}>{t(`game:${ns}.${event.id}.choices.${i}.label`)}</span>
                <span className={styles.choiceCost}>
                  {choice.cost > 0 ? `${choice.cost} PK` : t('game.gratis', { ns: 'common' })}
                </span>
              </div>
              {choice.desc && (
                <span className={styles.choiceDesc}>{t(`game:${ns}.${event.id}.choices.${i}.desc`)}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </article>
  );
}
