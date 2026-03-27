/**
 * SMA-320: BundestagView — Sitzverteilung, laufende Abstimmungen, Historie
 * SMA-322: Sitzanteil ~53%, voller Gesetz-Titel, Datum Apr 2025, Lobbying-Button
 * SMA-344: 600 Sitze, Halbkreis, passive NF-Fraktion, Einmal-Hinweis
 */
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { useGameActions } from '../hooks/useGameActions';
import { featureActive } from '../../core/systems/features';
import { KOALITION_SITZANTEIL } from '../../core/constants';
import { SPIELBARE_PARTEIEN } from '../../data/defaults/parteien';
import { berechneSitzverteilung } from '../../constants/bundestag';
import { BundestagHalbkreis } from '../components/BundestagHalbkreis/BundestagHalbkreis';
import { MilieuBar } from '../components/MilieuBar/MilieuBar';
import styles from './BundestagView.module.css';

/** SMA-322: Einheitliches Datum-Format "Apr 2025" statt "04/2025" */
function formatMonatJahr(monat: number): string {
  const m = ((monat - 1) % 12) + 1;
  const jahr = 2025 + Math.floor((monat - 1) / 12);
  const monate = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  return `${monate[m - 1]} ${jahr}`;
}

export function BundestagView() {
  const { t } = useTranslation('game');
  const state = useGameStore((s) => s.state);
  const complexity = useGameStore((s) => s.complexity);
  const acknowledgeBundestagHinweis = useGameStore((s) => s.acknowledgeBundestagHinweis);
  const actions = useGameActions();

  const koalitionsAnteil = KOALITION_SITZANTEIL / 100;
  const spielerKuerzel = state.spielerPartei?.kuerzel ?? 'SDP';
  const spielerParteiId = state.spielerPartei?.id ?? 'sdp';
  const partnerKuerzel = state.koalitionspartner
    ? SPIELBARE_PARTEIEN.find((p) => p.id === state.koalitionspartner!.id)?.kuerzel ?? null
    : null;

  const sitzverteilung = berechneSitzverteilung(
    spielerKuerzel,
    partnerKuerzel,
    koalitionsAnteil,
    spielerParteiId,
  );
  const nfFraktion = sitzverteilung.find((f) => f.id === 'nf');

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

  const abstimmungsLog = state.log
    .filter((e) => e.msg.includes('beschlossen') || e.msg.includes('verfehlt') || e.msg.includes('Blockiert'))
    .slice(-5)
    .reverse();

  const showOpposition = featureActive(complexity, 'opposition');
  const oppositionAktiv = state.opposition?.aktivesThema && showOpposition;
  const showFraktionenTabelle = featureActive(complexity, 'bundestag_detail');
  const showBundestagHinweis = !state.bundestagTabHinweisGezeigt;

  return (
    <div className={styles.root}>
      <h1 className={styles.title}>{t('game:bundestag.title', 'Bundestag')}</h1>
      <p className={styles.desc}>
        {t('game:bundestag.desc', 'Sitzverteilung und laufende Abstimmungen im Parlament.')}
      </p>

      {showBundestagHinweis && (
        <div className={styles.onboardingHint} role="status">
          <p className={styles.onboardingHintText}>{t('game:bundestag.ersterTabHinweis')}</p>
          <button type="button" className={styles.onboardingHintBtn} onClick={() => acknowledgeBundestagHinweis()}>
            {t('game:bundestag.hinweisVerstanden')}
          </button>
        </div>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          {complexity >= 2
            ? t('game:bundestag.sitzverteilung', 'Sitzverteilung')
            : t('game:bundestag.koalitionOpposition', 'Koalition vs. Opposition')}
        </h2>
        <BundestagHalbkreis fraktionen={sitzverteilung} />
      </section>

      {nfFraktion && (
        <section className={styles.nfCard} aria-labelledby="nf-heading">
          <h3 id="nf-heading" className={styles.nfTitle}>
            {t('game:bundestag.nfTitel')}
          </h3>
          <p className={styles.nfMeta}>
            {t('game:bundestag.nfSitzeAnteil', { sitze: nfFraktion.sitze, prozent: nfFraktion.prozent.toFixed(0) })}
          </p>
          <div className={styles.nfDisclaimer}>{t('game:bundestag.nfDisclaimer')}</div>
        </section>
      )}

      {showFraktionenTabelle && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('game:bundestag.fraktionenTabelle')}</h2>
          <div className={styles.fraktionenTabelle}>
            {sitzverteilung.map((f) => (
              <div key={f.id} className={styles.fraktionsZeile}>
                <span className={styles.fraktionsName} style={{ color: f.passiv ? undefined : f.farbe }}>
                  {f.name}
                </span>
                <span className={styles.fraktionsZahlen}>
                  {t('game:bundestag.tabelleSitzeProzent', {
                    sitze: f.sitze,
                    prozent: f.prozent.toFixed(1),
                  })}
                </span>
                {f.passiv && (
                  <span className={styles.passivBadge}>{t('game:bundestag.nfKeineKooperation')}</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

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
                      : t('game:bundestag.abstimmungCountdown', {
                          count: monateBisAbstimmung,
                          month: formatMonatJahr(abstimmungMonat),
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
