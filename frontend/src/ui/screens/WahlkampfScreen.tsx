/**
 * SMA-279: Wahlkampf-Aktions-Screen (Monat 43–48)
 */
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { useGameActions } from '../hooks/useGameActions';
import { useContentStore } from '../../stores/contentStore';
import { featureActive } from '../../core/systems/features';
import { Tv, Check, Circle } from '../icons';
import styles from './WahlkampfScreen.module.css';

function AktionsSlots({ genutzt, max }: { genutzt: number; max: number }) {
  const slots = Array.from({ length: max }, (_, i) => i < genutzt);
  return (
    <span className={styles.slots}>
      {slots.map((used, i) => (
        <span key={i} className={used ? styles.slotUsed : styles.slotFree}>
          <Circle size={8} fill={used ? 'currentColor' : 'none'} />
        </span>
      ))}
    </span>
  );
}

export function WahlkampfScreen() {
  const { t } = useTranslation('game');
  const { state, complexity } = useGameStore();
  const { doWahlkampfRede, doWahlkampfKoalition, doWahlkampfMedienoffensive } = useGameActions();
  const milieus = useContentStore((s) => s.milieus) ?? [];

  const wahlkampfAktiv = state.wahlkampfAktiv ?? false;
  const genutzt = state.wahlkampfAktionenGenutzt ?? 0;
  const maxSlots = 2;
  const slotsFrei = maxSlots - genutzt;

  const canRede = slotsFrei > 0 && state.pk >= 8;
  const canKoalition = slotsFrei > 0 && state.pk >= 12 && state.koalitionspartner && state.koalitionspartner.beziehung >= 50;
  const canMedienoffensive = slotsFrei > 0 && state.pk >= 15 && !state.medienoffensiveGenutzt;

  const showTVDuell =
    featureActive(complexity, 'tv_duell') &&
    (state.month === 45 || state.month === 46) &&
    !state.tvDuellAbgehalten;

  const visibleMilieus = milieus.filter((m) => m.min_complexity <= complexity);

  if (!wahlkampfAktiv) return null;

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t('game:wahlkampf.title')}</h1>
        <div className={styles.meta}>
          <span>{t('game:wahlkampf.monat', { month: state.month })}</span>
          <span className={styles.slotsLabel}>
            {t('game:wahlkampf.aktionen')}: <AktionsSlots genutzt={genutzt} max={maxSlots} />
          </span>
        </div>
      </header>

      {showTVDuell && (
        <div className={styles.tvDuellBanner}>
          <Tv size={16} /> {t('game:wahlkampf.tvDuellBanner')}
        </div>
      )}

      {featureActive(complexity, 'legislatur_bilanz') && state.legislaturBilanz && (
        <section className={styles.bilanz}>
          <h2 className={styles.sectionTitle}>{t('game:wahlkampf.bilanz')}</h2>
          <div className={styles.bilanzGrid}>
            <div className={styles.bilanzItem}>
              <span className={styles.bilanzLabel}>{t('game:wahlkampf.gesetze')}</span>
              <span className={styles.bilanzValue}>{state.legislaturBilanz.gesetzeBeschlossen}</span>
            </div>
            <div className={styles.bilanzItem}>
              <span className={styles.bilanzLabel}>{t('game:wahlkampf.politikfelder')}</span>
              <span className={styles.bilanzValue}>{state.legislaturBilanz.politikfelderAbgedeckt}</span>
            </div>
            <div className={styles.bilanzItem}>
              <span className={styles.bilanzLabel}>{t('game:wahlkampf.reform')}</span>
              <span className={styles.bilanzValue}>{state.legislaturBilanz.reformStaerke}</span>
            </div>
            <div className={styles.bilanzItem}>
              <span className={styles.bilanzLabel}>{t('game:wahlkampf.medien')}</span>
              <span className={styles.bilanzValue}>{state.legislaturBilanz.medienbilanz}</span>
            </div>
          </div>
        </section>
      )}

      <section className={styles.actions}>
        <h2 className={styles.sectionTitle}>{t('game:wahlkampf.aktionen')}</h2>
        <div className={styles.cards}>
          {visibleMilieus.map((m) => (
            <div key={m.id} className={styles.card}>
              <h3 className={styles.cardTitle}>{t(`game:milieu.${m.id}`, m.kurz ?? m.id)}</h3>
              <p className={styles.cardDesc}>{t('game:wahlkampf.redeDesc')}</p>
              <button
                type="button"
                className={styles.btn}
                disabled={!canRede}
                onClick={() => doWahlkampfRede(m.id)}
              >
                {t('game:wahlkampf.rede')} (8 PK)
              </button>
            </div>
          ))}
          {state.koalitionspartner && (
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>{t('game:wahlkampf.koalition')}</h3>
              <p className={styles.cardDesc}>{t('game:wahlkampf.koalitionDesc')}</p>
              <button
                type="button"
                className={styles.btn}
                disabled={!canKoalition}
                onClick={() => doWahlkampfKoalition()}
              >
                {t('game:wahlkampf.koalitionAktion')} (12 PK)
              </button>
            </div>
          )}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>{t('game:wahlkampf.medienoffensive')}</h3>
            <p className={styles.cardDesc}>{t('game:wahlkampf.medienoffensiveDesc')}</p>
            <button
              type="button"
              className={styles.btn}
              disabled={!canMedienoffensive}
              onClick={() => doWahlkampfMedienoffensive()}
            >
              {t('game:wahlkampf.medienoffensiveAktion')} (15 PK){' '}
              {state.medienoffensiveGenutzt && <Check size={14} />}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
