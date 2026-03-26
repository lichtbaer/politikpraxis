import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../../store/gameStore';
import { useGameActions } from '../../hooks/useGameActions';
import { featureActive } from '../../../core/systems/features';
import {
  activeMedienAkteurIds,
  kannMedienAktionNutzen,
  medienAktionCooldownVerbleibend,
} from '../../../core/systems/medienklima';
import { DEFAULT_MEDIEN_AKTEURE } from '../../../data/defaults/medienAkteure';
import type { MedienSpielerAktionKey } from '../../../core/systems/medienklima';
import styles from './MedienAktionen.module.css';

export function MedienAktionen() {
  const { t } = useTranslation('game');
  const { state, content, complexity } = useGameStore();
  const { doMedienAktion } = useGameActions();

  if (!featureActive(complexity, 'medien_akteure_3')) return null;

  const defs = content.medienAkteureContent?.length ? content.medienAkteureContent : DEFAULT_MEDIEN_AKTEURE;
  const active = new Set(activeMedienAkteurIds(complexity, defs));
  const saldo = state.haushalt?.saldo ?? 0;
  const pk = state.pk;

  const rows: Array<{
    key: MedienSpielerAktionKey;
    icon: string;
    titleKey: string;
    pkCost: number;
    effektKey: string;
    warnKey?: string;
    riskKey?: string;
    bedingungKey?: string;
    verfuegbar: boolean;
  }> = [
    {
      key: 'oeffentlich_talkshow',
      icon: '📺',
      titleKey: 'media.aktionen.talkshow.title',
      pkCost: 10,
      effektKey: 'media.aktionen.talkshow.effekt',
      verfuegbar: active.has('oeffentlich') && pk >= 10 && kannMedienAktionNutzen(state, 'oeffentlich_talkshow'),
    },
    {
      key: 'boulevard_interview',
      icon: '🗞️',
      titleKey: 'media.aktionen.boulevard.title',
      pkCost: 15,
      effektKey: 'media.aktionen.boulevard.effekt',
      warnKey: 'media.aktionen.boulevard.warnung',
      verfuegbar: active.has('boulevard') && pk >= 15 && kannMedienAktionNutzen(state, 'boulevard_interview'),
    },
    {
      key: 'social_kampagne',
      icon: '📱',
      titleKey: 'media.aktionen.social.title',
      pkCost: 20,
      effektKey: 'media.aktionen.social.effekt',
      riskKey: 'media.aktionen.social.risiko',
      verfuegbar: active.has('social') && pk >= 20 && kannMedienAktionNutzen(state, 'social_kampagne'),
    },
    {
      key: 'qualitaet_gespraech',
      icon: '💻',
      titleKey: 'media.aktionen.qualitaet.title',
      pkCost: 15,
      effektKey: 'media.aktionen.qualitaet.effekt',
      bedingungKey: 'media.aktionen.qualitaet.bedingung',
      verfuegbar:
        active.has('qualitaet') &&
        saldo > -25 &&
        pk >= 15 &&
        kannMedienAktionNutzen(state, 'qualitaet_gespraech'),
    },
  ];

  return (
    <section className={styles.section} aria-labelledby="medien-aktionen-heading">
      <h2 id="medien-aktionen-heading" className={styles.title}>
        {t('media.aktionen.title')}
      </h2>
      <p className={styles.sub}>{t('media.aktionen.sub')}</p>
      <div className={styles.grid}>
        {rows.map((r) => {
          const cd = medienAktionCooldownVerbleibend(state, r.key);
          const disabled = !r.verfuegbar;
          return (
            <button
              key={r.key}
              type="button"
              className={styles.card}
              disabled={disabled}
              onClick={() => doMedienAktion(r.key)}
            >
              <div className={styles.cardHeader}>
                <span className={styles.cardIcon} aria-hidden>
                  {r.icon}
                </span>
                <h3 className={styles.cardTitle}>{t(r.titleKey)}</h3>
                <span className={styles.pk}>{r.pkCost} PK</span>
              </div>
              <p className={styles.effekt}>{t(r.effektKey)}</p>
              {r.warnKey && (
                <p className={`${styles.meta} ${styles.warn}`}>{t(r.warnKey)}</p>
              )}
              {r.riskKey && (
                <p className={`${styles.meta} ${styles.risk}`}>{t(r.riskKey)}</p>
              )}
              {r.bedingungKey && saldo <= -25 && (
                <p className={`${styles.meta} ${styles.warn}`}>{t(r.bedingungKey)}</p>
              )}
              {cd > 0 && (
                <span className={styles.cooldown}>
                  {t('media.aktionen.cooldown', { count: cd })}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
