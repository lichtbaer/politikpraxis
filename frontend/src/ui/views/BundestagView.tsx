/**
 * SMA-320: BundestagView — Sitzverteilung, laufende Abstimmungen, Historie
 * SMA-322: Sitzanteil ~53%, voller Gesetz-Titel, Datum Apr 2025, Lobbying-Button
 * Stufe 1: Koalition vs. Opposition als zwei Balken
 * Stufe 2+: Fraktionsstärken, laufende Abstimmungen, Abstimmungs-Historie
 */
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { useGameActions } from '../hooks/useGameActions';
import { featureActive } from '../../core/systems/features';
import { KOALITION_SITZANTEIL, BUNDESTAG_SITZE } from '../../core/constants';
import { SPIELBARE_PARTEIEN } from '../../data/defaults/parteien';
import { MilieuBar } from '../components/MilieuBar/MilieuBar';
import styles from './BundestagView.module.css';

function getBarColor(value: number): string {
  if (value >= 55) return 'var(--green)';
  if (value >= 35) return 'var(--warn)';
  return 'var(--red)';
}

/** SMA-322: Einheitliches Datum-Format "Apr 2025" statt "04/2025" */
function formatMonatJahr(monat: number): string {
  const m = ((monat - 1) % 12) + 1;
  const jahr = 2025 + Math.floor((monat - 1) / 12);
  const monate = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  return `${monate[m - 1]} ${jahr}`;
}

export function BundestagView() {
  const { t } = useTranslation('game');
  const { state, complexity } = useGameStore();
  const actions = useGameActions();

  // SMA-322: Sitzanteil Koalition (~53%), nicht Koalitionsstabilität
  const coalitionShare = KOALITION_SITZANTEIL;
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
        {featureActive(complexity, 'bundesrat_detail') && (
          <div className={styles.fraktionenDetail}>
            <span>
              {[
                state.spielerPartei?.kuerzel,
                state.koalitionspartner
                  ? SPIELBARE_PARTEIEN.find((p) => p.id === state.koalitionspartner!.id)?.kuerzel
                  : null,
              ]
                .filter(Boolean)
                .join(' + ') || t('game:bundestag.koalition', 'Koalition')}
              : {Math.round((coalitionShare / 100) * BUNDESTAG_SITZE)} {t('game:bundestag.sitze', 'Sitze')} ({coalitionShare}%)
            </span>
            <span>
              {t('game:bundestag.opposition', 'Opposition')}: {Math.round((oppositionShare / 100) * BUNDESTAG_SITZE)} {t('game:bundestag.sitze', 'Sitze')} ({oppositionShare}%)
            </span>
          </div>
        )}
      </section>

      {laufendeAbstimmungen.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            {t('game:bundestag.laufendeAbstimmungen', 'Laufende Abstimmungen')}
          </h2>
          <div className={styles.abstimmungsListe}>
            {laufendeAbstimmungen.map(({ gesetzId, law, abstimmungMonat, monateBisAbstimmung }) => {
              const titel = law.titel || t(`game:laws.${law.id}.titel`, law.kurz);
              const descKurz = (law.desc || t(`game:laws.${law.id}.desc`, '')).slice(0, 80);
              const lobbyKosten = law.lobby_pk_kosten ?? 12;
              const canLobby = state.pk >= lobbyKosten;
              return (
                <div key={gesetzId} className={styles.abstimmungsItem}>
                  <h3 className={styles.gesetzTitel}>{titel}</h3>
                  {descKurz && <p className={styles.gesetzDesc}>{descKurz}{descKurz.length >= 80 ? '…' : ''}</p>}
                  <span className={styles.countdown}>
                    {monateBisAbstimmung <= 0
                      ? t('game:bundestag.abstimmungDieserMonat', 'Abstimmung diesen Monat')
                      : t('game:bundestag.abstimmungIn', {
                          count: monateBisAbstimmung,
                          month: formatMonatJahr(abstimmungMonat),
                          defaultValue: 'Abstimmung in {{count}} Mo. ({{month}})',
                        })}
                  </span>
                  <MilieuBar
                    name=""
                    value={law.ja}
                    color={law.ja > 50 ? 'var(--green)' : 'var(--red)'}
                  />
                  <button
                    type="button"
                    className={styles.lobbyBtn}
                    disabled={!canLobby}
                    onClick={() => actions.lobbying(gesetzId)}
                    title={t('game:agenda.lobbying')}
                  >
                    {t('game:agenda.lobbying')} ({lobbyKosten} PK)
                  </button>
                </div>
              );
            })}
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
