import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../../store/gameStore';
import { useGameActions } from '../../hooks/useGameActions';
import { featureActive } from '../../../core/systems/features';
import { getKoalitionspartner } from '../../../core/systems/koalition';
import styles from './KoalitionspartnerPanel.module.css';

/** SMA-321: Beziehung 55 = Stabil (nicht Angespannt). Schwellen: 70/50/30/15 */
function getBeziehungsFarbe(beziehung: number): string {
  if (beziehung >= 70) return 'var(--green)';
  if (beziehung >= 50) return 'var(--green)';
  if (beziehung >= 30) return 'var(--warn)';
  return 'var(--red)';
}

function getBeziehungsLabelKey(beziehung: number): string {
  if (beziehung >= 70) return 'koalitionPanel.beziehung.sehrGut';
  if (beziehung >= 50) return 'koalitionPanel.beziehung.stabil';
  if (beziehung >= 30) return 'koalitionPanel.beziehung.angespannt';
  if (beziehung >= 15) return 'koalitionPanel.beziehung.kritisch';
  return 'koalitionPanel.beziehung.kurzVorBruch';
}

function getKvScoreLabelKey(score: number): string {
  if (score >= 70) return 'koalitionPanel.kvScore.eskalation';
  if (score >= 40) return 'koalitionPanel.kvScore.unterDruck';
  return 'koalitionPanel.kvScore.imRahmen';
}

export function KoalitionspartnerPanel() {
  const { t } = useTranslation('game');
  const { state, content, complexity } = useGameStore();
  const { doKoalitionsrunde, doKoalitionsZugestaendnis } = useGameActions();

  if (!featureActive(complexity, 'koalitionspartner')) return null;

  const partnerContent = getKoalitionspartner(content, state);
  const partnerState = state.koalitionspartner;
  if (!partnerState) return null;

  const kanzler = state.chars.find((c) => c.id === 'kanzler') ?? state.chars[0];
  const kanzlerPartei = state.spielerPartei?.kuerzel ?? kanzler?.partei_kuerzel ?? 'SDP';
  const partnerPartei = partnerContent.partei_kuerzel ?? 'GP';
  const koalitionTitle = `${kanzlerPartei} + ${partnerPartei} ${t('game:koalition.koalition')}`;

  const beziehung = partnerState.beziehung;
  const pk = state.pk;
  const canKoalitionsrunde = pk >= 15;
  const forderungen = partnerContent.forderungen ?? [];
  const ersteForderung = forderungen[0];

  const partnerFarbe = partnerContent.partei_farbe ?? '#5a9870';

  // Partner priority demand
  const prioGesetz = state.partnerPrioGesetz;
  const prioGesetzName = prioGesetz
    ? state.gesetze.find((g) => g.id === prioGesetz.gesetzId)?.kurz ?? prioGesetz.gesetzId
    : null;
  const prioMonateVerbleibend = prioGesetz
    ? Math.max(0, prioGesetz.bisMonat - state.month)
    : 0;

  // KV score
  const showKvScore = featureActive(complexity, 'koalitionsvertrag_score');
  const kvScore = partnerState.koalitionsvertragScore;

  return (
    <div className={styles.panel}>
      <h3 className={styles.title}>{koalitionTitle}</h3>
      <div className={styles.content}>
        <div
          className={styles.avatar}
          style={{ backgroundColor: `${partnerFarbe}33`, borderColor: partnerFarbe }}
        >
          {partnerPartei}
        </div>
        <div className={styles.meta}>
          <div className={styles.partnerName}>
            {partnerContent.name}
            <span className={styles.partnerRole}>
              ({partnerContent.sprecher})
            </span>
          </div>

          {/* Relationship bar */}
          <div className={styles.beziehungsBalken}>
            <div className={styles.balkenTrack}>
              <div
                className={styles.balkenFill}
                style={{
                  width: `${beziehung}%`,
                  backgroundColor: getBeziehungsFarbe(beziehung),
                }}
              />
            </div>
            <span className={styles.beziehungValue}>{beziehung}</span>
          </div>
          <span
            className={styles.beziehungLabel}
            style={{ color: getBeziehungsFarbe(beziehung) }}
          >
            {t(getBeziehungsLabelKey(beziehung))}
          </span>

          {/* Low relationship warning — escalating urgency */}
          {beziehung < 30 && (
            <div className={beziehung < 15 ? styles.warningCritical : styles.warning}>
              {beziehung < 15
                ? t('koalitionPanel.koalitionsbruchDroht', { defaultValue: 'Koalitionsbruch droht! Sofort handeln — Koalitionsrunde oder Zugeständnis!' })
                : t('koalitionPanel.beziehungKritischHint')}
            </div>
          )}

          {/* Coalition health summary — visible when relationship is weakening */}
          {beziehung < 50 && beziehung >= 30 && (
            <div className={styles.healthHint}>
              {t('koalitionPanel.beziehungAngespannt', { defaultValue: 'Beziehung angespannt — regelmäßige Koalitionsrunden stabilisieren die Partnerschaft.' })}
            </div>
          )}

          {/* Koalitionsvertrag-Score (complexity 4) */}
          {showKvScore && (
            <div className={styles.kvScoreRow}>
              <span className={styles.kvLabel}>KV-Abweichung</span>
              <div className={styles.kvBarTrack}>
                <div
                  className={styles.kvBarFill}
                  style={{
                    width: `${kvScore}%`,
                    backgroundColor: kvScore >= 70 ? 'var(--red)' : kvScore >= 40 ? 'var(--warn)' : 'var(--green)',
                  }}
                />
              </div>
              <span className={styles.kvValue}>{kvScore}</span>
              <span
                className={styles.kvStatus}
                style={{ color: kvScore >= 70 ? 'var(--red)' : kvScore >= 40 ? 'var(--warn)' : 'var(--text2)' }}
              >
                {t(getKvScoreLabelKey(kvScore))}
              </span>
            </div>
          )}

          {/* Current partner demand */}
          {prioGesetzName && prioMonateVerbleibend > 0 && (
            <div className={styles.demand}>
              <span className={styles.demandLabel}>{t('koalitionPanel.partnerforderung')}</span>
              <span className={styles.demandGesetz}>{prioGesetzName}</span>
              <span className={styles.demandDeadline}>
                {t('koalitionPanel.monateVerbleibend', { count: prioMonateVerbleibend })}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.btn}
              disabled={!canKoalitionsrunde}
              onClick={() => doKoalitionsrunde()}
            >
              {t('game:koalition.koalitionsrunde')} (15 PK)
            </button>
            {ersteForderung && (
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => doKoalitionsZugestaendnis(ersteForderung.id)}
              >
                {t('game:koalition.zugestaendnis')}: {ersteForderung.label}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
