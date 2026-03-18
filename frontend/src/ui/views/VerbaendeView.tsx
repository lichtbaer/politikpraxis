import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { useGameActions } from '../hooks/useGameActions';
import { featureActive } from '../../core/systems/features';
import { VERBAND_KONFLIKT_SCHWELLE } from '../../core/constants';
import type { Verband } from '../../core/types';
import { DotRating } from '../components/DotRating/DotRating';
import styles from './VerbaendeView.module.css';

const KONFLIKTE: Record<string, string[]> = {
  bdi: ['uvb', 'gbd'],
  uvb: ['bdi', 'bvl'],
  bvl: ['uvb'],
  sgd: ['gbd'],
};

function getBeziehungsFarbe(beziehung: number): string {
  if (beziehung >= 60) return 'var(--green)';
  if (beziehung >= 30) return 'var(--warn)';
  return 'var(--red)';
}

function getEinflussStaerke(): number {
  return 3;
}

interface VerbandskarteProps {
  verband: Verband;
  beziehung: number;
  month: number;
  onGespraech: () => void;
  onTradeoff: (key: string) => void;
  pk: number;
}

function Verbandskarte({ verband, beziehung, month, onGespraech, onTradeoff, pk }: VerbandskarteProps) {
  const { t } = useTranslation('game');
  const konfliktPartner = KONFLIKTE[verband.id] ?? [];
  /** SMA-315: Konflikt-Warnung nur wenn Beziehung < 30 UND mind. Monat 2 (keine Konflikte in Monat 1) */
  const showKonfliktWarnung =
    konfliktPartner.length > 0 &&
    beziehung < VERBAND_KONFLIKT_SCHWELLE &&
    month > 1;
  const staerke = getEinflussStaerke();
  const dotsEl = <DotRating value={staerke} max={5} />;
  const canGespraech = pk >= 10;
  const hasTradeoffs = (verband.tradeoffs?.length ?? 0) > 0;

  return (
    <article className={styles.karte}>
      <div className={styles.karteHeader}>
        <div className={styles.avatar}>
          {verband.kurz}
        </div>
        <div className={styles.karteMeta}>
          <span className={styles.verbandName}>{verband.name ?? verband.kurz}</span>
          <span className={styles.politikfeldBadge}>
            {t(`game:politikfeld.${verband.politikfeld_id}`, verband.politikfeld_id)}
          </span>
        </div>
      </div>
      <div className={styles.einfluss}>
        <span className={styles.einflussLabel}>{t('game:verbaende.einfluss')}</span>
        <span className={styles.einflussDots}>{dotsEl}</span>
      </div>
      <div className={styles.beziehungsBalken}>
        <div className={styles.balkenLabel}>
          <span>{t('game:bundesrat.beziehung')}</span>
          <span>{beziehung}</span>
        </div>
        <div className={styles.balkenTrack}>
          <div
            className={styles.balkenFill}
            style={{
              width: `${beziehung}%`,
              backgroundColor: getBeziehungsFarbe(beziehung),
            }}
          />
        </div>
      </div>
      {showKonfliktWarnung && (
        <div className={styles.konfliktWarnung}>
          {t('game:verbaende.konfliktWarnung')}
        </div>
      )}
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.btn}
          disabled={!canGespraech}
          onClick={onGespraech}
        >
          {t('game:verbaende.gespraechSuchen')} (10 PK)
        </button>
        {hasTradeoffs && verband.tradeoffs!.map((t) => {
          const costPk = t.cost_pk ?? 0;
          const canAfford = costPk === 0 || pk >= costPk;
          return (
            <button
              key={t.key}
              type="button"
              className={styles.btnSecondary}
              disabled={!canAfford}
              onClick={() => onTradeoff(t.key)}
            >
              {t.label ?? t.key}
            </button>
          );
        })}
      </div>
    </article>
  );
}

export function VerbaendeView() {
  const { t } = useTranslation('game');
  const { state, content, complexity } = useGameStore();
  const { doVerbandGespraech, doVerbandTradeoff } = useGameActions();

  const verbaende = content.verbaende ?? [];

  if (!featureActive(complexity, 'verbands_lobbying')) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>{t('game:verbaende.title')}</h2>
        <p className={styles.subtitle}>{t('game:verbaende.subtitle')}</p>
      </div>
      <section className={styles.karten}>
        {verbaende.map((v) => (
          <Verbandskarte
            key={v.id}
            verband={v}
            beziehung={state.verbandsBeziehungen?.[v.id] ?? v.beziehung_start}
            month={state.month}
            onGespraech={() => doVerbandGespraech(v.id)}
            onTradeoff={(key) => doVerbandTradeoff(v.id, key)}
            pk={state.pk}
          />
        ))}
      </section>
    </div>
  );
}
