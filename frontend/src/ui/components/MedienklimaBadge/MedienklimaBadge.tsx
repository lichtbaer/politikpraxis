/**
 * SMA-279: Medienklima-Badge in der Sidebar unter Wahlprognose (ab Stufe 2)
 */
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../../store/gameStore';
import { featureActive } from '../../../core/systems/features';
import { Zap, Circle } from '../../icons';
import { Erklaerung } from '../Erklaerung/Erklaerung';
import { formatMedienklimaDisplay } from '../../../utils/format';
import styles from './MedienklimaBadge.module.css';

export function MedienklimaBadge() {
  const { t } = useTranslation('game');
  const complexity = useGameStore((s) => s.complexity);
  const state = useGameStore((s) => s.state);

  if (!featureActive(complexity, 'medienklima')) return null;

  const medienKlima = state.medienKlima ?? 55;
  const mkRounded = Math.round(medienKlima);
  const klimaClass =
    mkRounded > 65 ? styles.positiv : mkRounded > 35 ? styles.neutral : styles.negativ;

  const oppositionStaerke = state.opposition?.staerke ?? 0;
  const oppositionLabel =
    oppositionStaerke > 70 ? 'stark' : oppositionStaerke > 40 ? 'aktiv' : 'schwach';

  return (
    <div className={styles.badge}>
      <span className={styles.label}><Erklaerung begriff="medienklima" kinder={t('game:medienklima.label')} /></span>
      <div className={`${styles.klimaBar} ${klimaClass}`}>
        <div className={styles.klimaFill} style={{ width: `${mkRounded}%` }} />
      </div>
      <span className={styles.wert}>{formatMedienklimaDisplay(medienKlima)}/100</span>
      {featureActive(complexity, 'opposition') && (
        <span className={styles.oppositionStaerke}>
          {t('game:medienklima.opposition')}:{' '}
          {oppositionLabel === 'stark' && <><Zap size={12} /> Stark</>}
          {oppositionLabel === 'aktiv' && <><Circle size={8} /> Aktiv</>}
          {oppositionLabel === 'schwach' && <>— Schwach</>}
        </span>
      )}
    </div>
  );
}
