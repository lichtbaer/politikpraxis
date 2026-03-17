import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../../store/gameStore';
import { useGameActions } from '../../hooks/useGameActions';
import { featureActive } from '../../../core/systems/features';
import { getKoalitionspartner } from '../../../core/systems/koalition';
import styles from './KoalitionspartnerPanel.module.css';

function getBeziehungsFarbe(beziehung: number): string {
  if (beziehung >= 60) return 'var(--green)';
  if (beziehung >= 30) return 'var(--warn)';
  return 'var(--red)';
}

export function KoalitionspartnerPanel() {
  const { t } = useTranslation('game');
  const { state, content, complexity } = useGameStore();
  const { doKoalitionsrunde, doKoalitionsZugestaendnis } = useGameActions();

  if (!featureActive(complexity, 'koalitionspartner')) return null;

  const partnerContent = getKoalitionspartner(content);
  const partnerState = state.koalitionspartner;
  if (!partnerState || partnerState.id !== partnerContent.id) return null;

  const kanzler = state.chars.find((c) => c.id === 'kanzler') ?? state.chars[0];
  const kanzlerPartei = kanzler?.partei_kuerzel ?? 'SDP';
  const partnerPartei = partnerContent.partei_kuerzel ?? 'GP';
  const koalitionTitle = `${kanzlerPartei} + ${partnerPartei} ${t('game:koalition.koalition')}`;

  const beziehung = partnerState.beziehung;
  const pk = state.pk;
  const canKoalitionsrunde = pk >= 15;
  const forderungen = partnerContent.forderungen ?? [];
  const ersteForderung = forderungen[0];

  return (
    <div className={styles.panel}>
      <h3 className={styles.title}>{koalitionTitle}</h3>
      <div className={styles.content}>
        <div
          className={styles.avatar}
          style={{ backgroundColor: '#5a987033', borderColor: '#5a9870' }}
        >
          KP
        </div>
        <div className={styles.meta}>
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
          {featureActive(complexity, 'koalitionsvertrag_score') && (
            <div className={styles.kvScore}>
              KV-Score: {partnerState.koalitionsvertragScore}
            </div>
          )}
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
                {t('game:koalition.zugestaendnis')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
