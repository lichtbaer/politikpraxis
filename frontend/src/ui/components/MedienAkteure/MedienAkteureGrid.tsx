import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../../store/gameStore';
import { featureActive } from '../../../core/systems/features';
import { activeMedienAkteurIds } from '../../../core/systems/medienklima';
import { DEFAULT_MEDIEN_AKTEURE } from '../../../data/defaults/medienAkteure';
import { MedienAkteurKarte } from './MedienAkteurKarte';
import styles from './MedienAkteureGrid.module.css';

export function MedienAkteureGrid() {
  const { t } = useTranslation('game');
  const { state, content, complexity } = useGameStore();

  if (!featureActive(complexity, 'medien_akteure_2')) return null;
  const defs = content.medienAkteureContent?.length ? content.medienAkteureContent : DEFAULT_MEDIEN_AKTEURE;
  const ids = activeMedienAkteurIds(complexity, defs);
  const ma = state.medienAkteure;

  if (!ma || ids.length === 0) return null;

  return (
    <section className={styles.section} aria-labelledby="medien-akteure-heading">
      <h2 id="medien-akteure-heading" className={styles.title}>
        {t('media.akteureTitle')}
      </h2>
      <p className={styles.sub}>{t('media.akteureSub')}</p>
      <div className={styles.grid}>
        {ids.map((id) => {
          const def = defs.find((d) => d.id === id);
          const row = ma[id];
          if (!def || !row) return null;
          return <MedienAkteurKarte key={id} def={def} stateRow={row} game={state} />;
        })}
      </div>
    </section>
  );
}
