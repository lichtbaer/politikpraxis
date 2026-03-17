/**
 * SMA-274: VorstufeBadge — Status einer Vorstufe (Kommunal, Länder, EU).
 * ○ Nicht gestartet | 🔄 In Bearbeitung | ✅ Erfolgreich | ✗ Gescheitert | ⚠ Abgebrochen
 */
import { useTranslation } from 'react-i18next';
import type { GesetzProjekt } from '../../../core/types';
import styles from './VorstufeBadge.module.css';

export type VorstufTyp = 'kommunal' | 'laender' | 'eu';

const VORSTUFE_LABELS: Record<VorstufTyp, string> = {
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
        ○ {t(`game:vorstufen.${typ}`) ?? VORSTUFE_LABELS[typ]}
      </span>
    );
  }

  if (!vorstufe.abgeschlossen) {
    const elapsed = month - vorstufe.startMonat;
    const restMonate = Math.max(0, Math.ceil(vorstufe.dauerMonate - elapsed));
    return (
      <div className={styles.aktiv}>
        <span className={styles.label}>
          🔄 {vorstufe.stadtname ?? vorstufe.stadttyp ?? t(`game:vorstufen.${typ}`) ?? VORSTUFE_LABELS[typ]}
          {restMonate > 0 && ` (noch ${restMonate} Mo)`}
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
            ✕
          </button>
        )}
      </div>
    );
  }

  if (vorstufe.ergebnis === 'erfolg') {
    return (
      <span className={styles.erfolg}>
        ✅ {vorstufe.stadtname ?? vorstufe.stadttyp ?? t(`game:vorstufen.${typ}`) ?? VORSTUFE_LABELS[typ]}
      </span>
    );
  }

  return (
    <span className={styles.gescheitert}>
      ✗ {t(`game:vorstufen.${typ}`) ?? VORSTUFE_LABELS[typ]}
    </span>
  );
}
