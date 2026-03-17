/**
 * SMA-279: Medienklima-Badge in der Sidebar unter Wahlprognose (ab Stufe 2)
 */
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../../store/gameStore';
import { featureActive } from '../../../core/systems/features';
import styles from './MedienklimaBadge.module.css';

export function MedienklimaBadge() {
  const { t } = useTranslation('game');
  const complexity = useGameStore((s) => s.complexity);
  const state = useGameStore((s) => s.state);

  if (!featureActive(complexity, 'medienklima')) return null;

  const medienKlima = state.medienKlima ?? 55;
  const klimaClass =
    medienKlima > 65 ? styles.positiv : medienKlima > 35 ? styles.neutral : styles.negativ;

  const oppositionStaerke = state.opposition?.staerke ?? 0;
  const oppositionLabel =
    oppositionStaerke > 70 ? '⚡ Stark' : oppositionStaerke > 40 ? '○ Aktiv' : '— Schwach';

  return (
    <div className={styles.badge}>
      <span className={styles.label}>{t('game:medienklima.label')}</span>
      <div className={`${styles.klimaBar} ${klimaClass}`}>
        <div className={styles.klimaFill} style={{ width: `${medienKlima}%` }} />
      </div>
      <span className={styles.wert}>{medienKlima}/100</span>
      {featureActive(complexity, 'opposition') && (
        <span className={styles.oppositionStaerke}>
          {t('game:medienklima.opposition')}: {oppositionLabel}
        </span>
      )}
    </div>
  );
}
