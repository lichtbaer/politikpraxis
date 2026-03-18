import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../../store/gameStore';
import { featureActive } from '../../../core/systems/features';
import { checkSchuldenbremse } from '../../../core/systems/haushalt';
import { formatMrdSaldo, normalizeZero } from '../../../utils/format';
import type { SchuldenbremsenStatus } from '../../../core/types';
import { Check, AlertTriangle } from '../../icons';
import styles from './HaushaltsPanel.module.css';

function SchuldenbremsenBadge({ status }: { status: SchuldenbremsenStatus }) {
  const { t } = useTranslation('game');
  if (status === 'inaktiv') return null;

  const config: Record<Exclude<SchuldenbremsenStatus, 'inaktiv'>, { label: string; className: string }> = {
    ausgeglichen: { label: t('haushalt.schuldenbremseAusgeglichen'), className: styles.sbAusgeglichen },
    grenzwertig: { label: t('haushalt.schuldenbremseGrenzwertig'), className: styles.sbGrenzwertig },
    verletzt_mild: { label: t('haushalt.schuldenbremseVerletzt'), className: styles.sbVerletzt },
    verletzt_stark: { label: t('haushalt.schuldenbremseKritisch'), className: styles.sbKritisch },
  };
  const { label, className } = config[status];

  return (
    <div className={`${styles.schuldenbremsenBadge} ${className}`}>
      <span className={styles.sbIcon}>{status === 'ausgeglichen' ? <Check size={14} /> : <AlertTriangle size={14} />}</span>
      <span>{label}</span>
    </div>
  );
}

/** SMA-310: Haushalt-Ampel — saldo > 0 grün, -1 bis -15 gelb, -16 bis -30 rot, < -30 lila (Krise) */
function getSaldoKlasse(saldo: number): string {
  if (saldo > 0) return 'saldoAusgeglichen';
  if (saldo >= -15) return 'saldoDefizit';
  if (saldo >= -30) return 'saldoKritisch';
  return 'saldoKrise';
}

function KonjunkturIndikator({ value }: { value: number }) {
  const { t } = useTranslation('game');
  const pct = ((value + 3) / 6) * 100;
  const color =
    value > 1 ? 'var(--green)' : value > -1 ? 'var(--warn)' : 'var(--red)';

  return (
    <div className={styles.konjunkturIndikator} title={t('haushalt.konjunkturTooltip')}>
      <span className={styles.konjunkturLabel}>{t('haushalt.konjunktur')}</span>
      <div className={styles.konjunkturBar}>
        <div
          className={styles.konjunkturFill}
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className={styles.konjunkturValue}>{normalizeZero(value) > 0 ? '+' : ''}{normalizeZero(value).toFixed(1)}</span>
    </div>
  );
}

export function HaushaltsPanel() {
  const { t } = useTranslation('game');
  const { state, complexity } = useGameStore();
  const haushalt = state.haushalt;

  if (!haushalt || complexity < 2) return null;

  const schuldenbremsenStatus = checkSchuldenbremse(state, complexity);

  return (
    <div className={styles.panel}>
      <h3 className={styles.sectionTitle}>{t('haushalt.title')}</h3>
      <div className={styles.rows}>
        <div className={styles.row}>
          <span>{t('haushalt.einnahmen')}</span>
          <span className={styles.positive}>+{haushalt.einnahmen} Mrd.</span>
        </div>
        <div className={styles.row}>
          <span>{t('haushalt.pflichtausgaben')}</span>
          <span className={styles.negative}>-{haushalt.pflichtausgaben} Mrd.</span>
        </div>
        <div className={styles.row}>
          <span>{t('haushalt.laufendeAusgaben')}</span>
          <span className={styles.negative}>
            -{normalizeZero(haushalt.laufendeAusgaben).toFixed(1)} Mrd.
          </span>
        </div>
        <div className={`${styles.saldo} ${styles[getSaldoKlasse(haushalt.saldo)]}`}>
          <span>{t('haushalt.saldo')}</span>
          <span
            className={
              haushalt.saldo >= 0 ? styles.positive : styles.negative
            }
          >
            {formatMrdSaldo(haushalt.saldo)}
          </span>
        </div>
      </div>

      {featureActive(complexity, 'schuldenbremse') && (
        <SchuldenbremsenBadge status={schuldenbremsenStatus} />
      )}

      {featureActive(complexity, 'konjunkturindex') && (
        <KonjunkturIndikator value={haushalt.konjunkturIndex} />
      )}
    </div>
  );
}
