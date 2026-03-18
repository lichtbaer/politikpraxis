import { useTranslation } from 'react-i18next';
import type { GameEvent, EventChoice } from '../../../core/types';
import { getEventNamespace } from '../../../core/eventNamespaces';
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
  /** Aktuelles PK-Budget — wenn angegeben, werden unbezahlbare Choices deaktiviert */
  currentPk?: number;
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

const KPI_LABELS: Record<string, string> = { al: 'AL', hh: 'HH', gi: 'GI', zf: 'ZF' };
/** KPIs wo niedrig = besser (invertiert) */
const KPI_INVERTED = new Set(['al', 'gi']);

const SKANDAL_IDS = new Set([
  'medien_skandal_spesen', 'medien_skandal_datenpanne', 'medien_skandal_koalitionsleck',
  'medien_skandal_lobbying', 'medien_skandal_haushaltsloch', 'medien_skandal_persoenlich',
]);

const KOALITION_EVENT_IDS = new Set(['koalitionsbruch', 'koalitionskrise_ultimatum']);

export function EventCard({ event, onChoice, headerClass: headerClassOverride, headerColor, icon: iconOverride, showMedienklimaDelta, currentPk }: EventCardProps) {
  const { t } = useTranslation('game');
  const isSkandal = SKANDAL_IDS.has(event.id);
  const isKoalition = KOALITION_EVENT_IDS.has(event.id);
  const headerClass = headerClassOverride ?? (isSkandal ? `${styles.header} ${styles.headerSkandal}` : isKoalition && headerColor ? `${styles.header}` : `${styles.header} ${TYPE_CLASS[event.type]}`);
  const icon = iconOverride ?? (isSkandal ? '📰' : event.icon);
  const showDelta = showMedienklimaDelta ?? isSkandal;
  const ns = getEventNamespace(event);

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
            const canAfford = currentPk == null || choice.cost <= 0 || choice.cost <= currentPk;
            return (
              <button
                key={i}
                type="button"
                className={`${styles.choice} ${CHOICE_CLASS[choice.type]} ${!canAfford ? styles.choiceDisabled : ''}`}
                onClick={() => canAfford && onChoice(event, choice)}
                disabled={!canAfford}
                title={!canAfford ? `Nicht genug PK (${currentPk}/${choice.cost})` : undefined}
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
                {(choice.effect || choice.charMood) && (
                  <div className={styles.effectTags}>
                    {choice.effect && Object.entries(choice.effect).map(([k, v]) => {
                      if (!v || v === 0) return null;
                      const isGood = KPI_INVERTED.has(k) ? v < 0 : v > 0;
                      return (
                        <span key={k} className={`${styles.effectTag} ${isGood ? styles.effectPos : styles.effectNeg}`}>
                          {KPI_LABELS[k] ?? k} {v > 0 ? '+' : ''}{v}
                        </span>
                      );
                    })}
                    {choice.charMood && Object.entries(choice.charMood).map(([charId, delta]) => {
                      if (!delta || delta === 0) return null;
                      return (
                        <span key={charId} className={`${styles.effectTag} ${delta > 0 ? styles.effectPos : styles.effectNeg}`}>
                          {charId.toUpperCase()} {delta > 0 ? '+' : ''}{delta}
                        </span>
                      );
                    })}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </article>
  );
}
