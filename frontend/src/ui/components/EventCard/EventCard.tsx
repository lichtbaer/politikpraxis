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

export function EventCard({ event, onChoice }: EventCardProps) {
  const headerClass = `${styles.header} ${TYPE_CLASS[event.type]}`;

  return (
    <article className={styles.card}>
      <header className={headerClass}>
        <span className={styles.icon}>{event.icon}</span>
        <div className={styles.headerText}>
          <span className={styles.typeLabel}>{event.typeLabel.toUpperCase()}</span>
          <h2 className={styles.title}>{event.title}</h2>
        </div>
      </header>
      <div className={styles.body}>
        {event.quote && (
          <blockquote className={styles.quote}>{event.quote}</blockquote>
        )}
        <p className={styles.context}>{event.context}</p>
        <div className={styles.choices}>
          {event.choices.map((choice, i) => (
            <button
              key={i}
              type="button"
              className={`${styles.choice} ${CHOICE_CLASS[choice.type]}`}
              onClick={() => onChoice(event, choice)}
            >
              <div className={styles.choiceMain}>
                <span className={styles.choiceLabel}>{choice.label}</span>
                <span className={styles.choiceCost}>
                  {choice.cost > 0 ? `${choice.cost} PK` : 'gratis'}
                </span>
              </div>
              {choice.desc && (
                <span className={styles.choiceDesc}>{choice.desc}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </article>
  );
}
