/**
 * SMA-274: VorstufeBadge — Status einer Vorstufe (Kommunal, Länder, EU).
 * Circle = Nicht gestartet | RefreshCw = In Bearbeitung | CheckCircle = Erfolgreich | X = Gescheitert
 */
import { useTranslation } from 'react-i18next';
import type { GesetzProjekt } from '../../../core/types';
import { Circle, RefreshCw, CheckCircle, X as XIcon } from '../../icons';
import styles from './VorstufeBadge.module.css';

export type VorstufTyp = 'kommunal' | 'laender' | 'eu';

const VORSTUFE_FALLBACKS: Record<VorstufTyp, string> = {
  kommunal: 'Kommunal',
  laender: 'Länder',
  eu: 'EU',
};

interface VorstufeBadgeProps {
  typ: VorstufTyp;
  projekt?: GesetzProjekt | null;
  month?: number;
  onAbbrechen?: (gesetzId: string, typ: VorstufTyp) => void;
}

export function VorstufeBadge({ typ, projekt, month = 0, onAbbrechen }: VorstufeBadgeProps) {
  const { t } = useTranslation('game');
  const vorstufe = projekt?.aktiveVorstufen?.find((v) => v.typ === typ);

  if (!vorstufe) {
    return (
      <span className={styles.offen}>
        <Circle size={10} /> {t(`game:vorstufen.${typ}`) ?? VORSTUFE_FALLBACKS[typ]}
      </span>
    );
  }

  if (!vorstufe.abgeschlossen) {
    const elapsed = month - vorstufe.startMonat;
    const restMonate = Math.max(0, Math.ceil(vorstufe.dauerMonate - elapsed));
    return (
      <div className={styles.aktiv}>
        <span className={styles.label}>
          <RefreshCw size={12} /> {vorstufe.stadtname ?? vorstufe.stadttyp ?? t(`game:vorstufen.${typ}`) ?? VORSTUFE_FALLBACKS[typ]}
          {restMonate > 0 && ` ${t('game:vorstufeBadge.restMonate', { count: restMonate })}`}
        </span>
        <progress
          className={styles.progress}
          value={vorstufe.fortschritt}
          max={100}
        />
        {onAbbrechen && projekt && (
          <button
            type="button"
            className={styles.abbrechen}
            onClick={() => onAbbrechen(projekt.gesetzId, typ)}
            title={t('game:vorstufen.abbrechen')}
            aria-label={t('game:vorstufen.abbrechen')}
          >
            <XIcon size={10} />
          </button>
        )}
      </div>
    );
  }

  if (vorstufe.ergebnis === 'erfolg') {
    return (
      <span className={styles.erfolg}>
        <CheckCircle size={12} /> {vorstufe.stadtname ?? vorstufe.stadttyp ?? t(`game:vorstufen.${typ}`) ?? VORSTUFE_FALLBACKS[typ]}
      </span>
    );
  }

  return (
    <span className={styles.gescheitert}>
      <XIcon size={12} /> {t(`game:vorstufen.${typ}`) ?? VORSTUFE_FALLBACKS[typ]}
    </span>
  );
}
