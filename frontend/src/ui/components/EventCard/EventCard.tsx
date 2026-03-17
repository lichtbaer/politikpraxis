import { useTranslation } from 'react-i18next';
import type { GameEvent, EventChoice } from '../../../core/types';
import styles from './EventCard.module.css';

interface EventCardProps {
  event: GameEvent;
  onChoice: (event: GameEvent, choice: EventChoice) => void;
  /** SMA-279: Skandal-Events mit rotem Banner, Zeitungs-Icon, Medienklima-Delta in Choices */
  headerClass?: string;
  /** SMA-302: Custom header background (z.B. Koalitionspartner-Farbe) */
  headerColor?: string;
  icon?: string;
  showMedienklimaDelta?: boolean;
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

function getEventNs(event: GameEvent): 'events' | 'charEvents' | 'bundesratEvents' | 'kommunalEvents' | 'vorstufenEvents' {
  const BR_IDS = new Set(['laenderfinanzausgleich', 'landtagswahl', 'kohl_eskaliert', 'sprecher_wechsel', 'bundesrat_initiative', 'foederalismusgipfel']);
  const KOMMUNAL_IDS = new Set(['kommunal_klima_initiative', 'kommunal_sozial_initiative', 'kommunal_sicherheit_initiative']);
  const VORSTUFEN_IDS = new Set(['vorstufe_kommunal_erfolg', 'vorstufe_laender_erfolg']);
  const CHAR_IDS = new Set(['fm_ultimatum', 'braun_ultimatum', 'wolf_ultimatum', 'kern_ultimatum', 'kanzler_ultimatum', 'kohl_bundesrat_sabotage', 'wm_ultimatum', 'am_ultimatum', 'gm_ultimatum', 'bm_ultimatum', 'koalitionsbruch', 'koalitionskrise_ultimatum']);
  if (event.charId || CHAR_IDS.has(event.id)) return 'charEvents';
  if (BR_IDS.has(event.id)) return 'bundesratEvents';
  if (KOMMUNAL_IDS.has(event.id)) return 'kommunalEvents';
  if (VORSTUFEN_IDS.has(event.id)) return 'vorstufenEvents';
  return 'events';
}

const SKANDAL_IDS = new Set([
  'medien_skandal_spesen', 'medien_skandal_datenpanne', 'medien_skandal_koalitionsleck',
  'medien_skandal_lobbying', 'medien_skandal_haushaltsloch', 'medien_skandal_persoenlich',
]);

const KOALITION_EVENT_IDS = new Set(['koalitionsbruch', 'koalitionskrise_ultimatum']);

export function EventCard({ event, onChoice, headerClass: headerClassOverride, headerColor, icon: iconOverride, showMedienklimaDelta }: EventCardProps) {
  const { t } = useTranslation('game');
  const isSkandal = SKANDAL_IDS.has(event.id);
  const isKoalition = KOALITION_EVENT_IDS.has(event.id);
  const headerClass = headerClassOverride ?? (isSkandal ? `${styles.header} ${styles.headerSkandal}` : isKoalition && headerColor ? `${styles.header}` : `${styles.header} ${TYPE_CLASS[event.type]}`);
  const icon = iconOverride ?? (isSkandal ? '📰' : event.icon);
  const showDelta = showMedienklimaDelta ?? isSkandal;
  const ns = getEventNs(event);

  const typeLabel = event.typeLabel || t(`game:${ns}.${event.id}.typeLabel`);
  const title = event.title || t(`game:${ns}.${event.id}.title`);
  const quote = event.quote || t(`game:${ns}.${event.id}.quote`);
  const context = event.context || t(`game:${ns}.${event.id}.context`);

  return (
    <article className={styles.card}>
      <header className={headerClass} style={headerColor ? { backgroundColor: headerColor, color: '#fff' } : undefined}>
        <span className={styles.icon}>{icon}</span>
        <div className={styles.headerText}>
          <span className={styles.typeLabel}>{typeLabel.toUpperCase()}</span>
          <h2 className={styles.title}>{title}</h2>
        </div>
      </header>
      <div className={styles.body}>
        {event.quote != null && event.quote !== '' && (
          <blockquote className={styles.quote}>{quote}</blockquote>
        )}
        <p className={styles.context}>{context}</p>
        <div className={styles.choices}>
          {event.choices.map((choice, i) => {
            const choiceLabel = choice.label || t(`game:${ns}.${event.id}.choices.${i}.label`);
            const choiceDesc = choice.desc || t(`game:${ns}.${event.id}.choices.${i}.desc`);
            return (
              <button
                key={i}
                type="button"
                className={`${styles.choice} ${CHOICE_CLASS[choice.type]}`}
                onClick={() => onChoice(event, choice)}
              >
                <div className={styles.choiceMain}>
                  <span className={styles.choiceLabel}>{choiceLabel}</span>
                  <span className={styles.choiceCost}>
                    {choice.cost > 0 ? `${choice.cost} PK` : t('game.gratis', { ns: 'common' })}
                    {showDelta && choice.medienklima_delta != null && choice.medienklima_delta !== 0 && (
                      <span className={choice.medienklima_delta > 0 ? styles.medienKlimaPos : styles.medienKlimaNeg}>
                        {' '}Medienklima {choice.medienklima_delta > 0 ? '+' : ''}{choice.medienklima_delta}
                      </span>
                    )}
                  </span>
                </div>
                {choiceDesc && (
                  <span className={styles.choiceDesc}>{choiceDesc}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </article>
  );
}
