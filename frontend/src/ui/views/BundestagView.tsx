/**
 * SMA-320: BundestagView — Sitzverteilung, laufende Abstimmungen, Historie
 * Stufe 1: Koalition vs. Opposition als zwei Balken
 * Stufe 2+: Fraktionsstärken, laufende Abstimmungen, Abstimmungs-Historie
 */
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { featureActive } from '../../core/systems/features';
import { MilieuBar } from '../components/MilieuBar/MilieuBar';
import styles from './BundestagView.module.css';

function getBarColor(value: number): string {
  if (value >= 55) return 'var(--green)';
  if (value >= 35) return 'var(--warn)';
  return 'var(--red)';
}

function formatMonth(month: number): string {
  const m = ((month - 1) % 12) + 1;
  const y = 2025 + Math.floor((month - 1) / 12);
  return `${String(m).padStart(2, '0')}/${y}`;
}

export function BundestagView() {
  const { t } = useTranslation('game');
  const { state, complexity } = useGameStore();

  // Koalition vs. Opposition — Stufe 1: zwei Balken
  const coalitionShare = Math.min(95, Math.max(5, state.coalition));
  const oppositionShare = 100 - coalitionShare;

  const eingebrachteGesetze = state.eingebrachteGesetze ?? [];
  const laufendeAbstimmungen = eingebrachteGesetze
    .map((eg) => {
      const law = state.gesetze.find((g) => g.id === eg.gesetzId);
      if (!law || law.status !== 'eingebracht') return null;
      const monateBisAbstimmung = eg.abstimmungMonat - state.month;
      return { ...eg, law, monateBisAbstimmung };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .slice(0, 5);

  // Letzte Abstimmungsergebnisse aus Log (beschlossen/blockiert)
  const abstimmungsLog = state.log
    .filter((e) => e.msg.includes('beschlossen') || e.msg.includes('verfehlt') || e.msg.includes('Blockiert'))
    .slice(-5)
    .reverse();

  const showOpposition = featureActive(complexity, 'opposition');
  const oppositionAktiv = state.opposition?.aktivesThema && showOpposition;

  return (
    <div className={styles.root}>
      <h1 className={styles.title}>{t('game:bundestag.title', 'Bundestag')}</h1>
      <p className={styles.desc}>
        {t('game:bundestag.desc', 'Sitzverteilung und laufende Abstimmungen im Parlament.')}
      </p>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          {complexity >= 2
            ? t('game:bundestag.sitzverteilung', 'Sitzverteilung')
            : t('game:bundestag.koalitionOpposition', 'Koalition vs. Opposition')}
        </h2>
        <div className={styles.balkenContainer}>
          <div className={styles.balkenRow}>
            <span className={styles.balkenLabel}>
              {t('game:bundestag.koalition', 'Koalition')}
            </span>
            <div className={styles.balkenTrack}>
              <div
                className={styles.balkenFill}
                style={{
                  width: `${coalitionShare}%`,
                  backgroundColor: getBarColor(coalitionShare),
                }}
              />
            </div>
            <span className={styles.balkenValue}>{Math.round(coalitionShare)}%</span>
          </div>
          <div className={styles.balkenRow}>
            <span className={styles.balkenLabel}>
              {t('game:bundestag.opposition', 'Opposition')}
            </span>
            <div className={styles.balkenTrack}>
              <div
                className={styles.balkenFill}
                style={{
                  width: `${oppositionShare}%`,
                  backgroundColor: 'var(--text3)',
                }}
              />
            </div>
            <span className={styles.balkenValue}>{Math.round(oppositionShare)}%</span>
          </div>
        </div>
      </section>

      {laufendeAbstimmungen.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            {t('game:bundestag.laufendeAbstimmungen', 'Laufende Abstimmungen')}
          </h2>
          <div className={styles.abstimmungsListe}>
            {laufendeAbstimmungen.map(({ gesetzId, law, abstimmungMonat, monateBisAbstimmung }) => (
              <div key={gesetzId} className={styles.abstimmungsItem}>
                <span className={styles.gesetzKurz}>{law.kurz}</span>
                <span className={styles.countdown}>
                  {monateBisAbstimmung <= 0
                    ? t('game:bundestag.abstimmungDieserMonat', 'Abstimmung diesen Monat')
                    : t('game:bundestag.abstimmungIn', {
                        count: monateBisAbstimmung,
                        month: formatMonth(abstimmungMonat),
                        defaultValue: 'Abstimmung in {{count}} Mo. ({{month}})',
                      })}
                </span>
                <MilieuBar
                  name=""
                  value={law.ja}
                  color={law.ja > 50 ? 'var(--green)' : 'var(--red)'}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {abstimmungsLog.length > 0 && complexity >= 2 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            {t('game:bundestag.letzteAbstimmungen', 'Letzte Abstimmungsergebnisse')}
          </h2>
          <div className={styles.logListe}>
            {abstimmungsLog.map((entry, i) => (
              <div key={`${entry.time}-${i}`} className={styles.logEntry}>
                <span className={styles.logTime}>{entry.time}</span>
                <span className={styles.logMsg}>
                  {entry.msg.startsWith('game:') ? t(entry.msg, entry.params) : entry.msg}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {oppositionAktiv && showOpposition && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            {t('game:bundestag.oppositionsAktivitaet', 'Oppositions-Aktivität')}
          </h2>
          <div className={styles.oppositionBadge}>
            <span>
              {t('game:opposition.angriff', {
                thema: t(`game:opposition.thema.${state.opposition!.aktivesThema}`),
              })}
            </span>
          </div>
        </section>
      )}
    </div>
  );
}
