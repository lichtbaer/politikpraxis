import type { TickLogEntry, KPI } from '../../../core/types';
import styles from './KPITile.module.css';

interface KPITileProps {
  label: string;
  value: number;
  prevValue: number | null;
  suffix: string;
  inverted: boolean;
  barPercent: number;
  barColor: string;
  /** Erklärung der Änderungen aus dem Tick-Log */
  changeReasons?: TickLogEntry[];
  /** KPI-Schlüssel für Tooltip-Beschreibung */
  kpiKey?: keyof KPI;
}

const KPI_DESCRIPTIONS: Record<keyof KPI, string> = {
  al: 'Niedrig = gut. Beeinflusst durch Konjunktur und Gesetze.',
  hh: 'Positiv = Überschuss, negativ = Defizit.',
  gi: 'Niedrig = weniger Ungleichheit. Beeinflusst durch Sozialpolitik.',
  zf: 'Hoch = zufriedene Bevölkerung. Beeinflusst durch alle KPIs.',
};

function getDeltaClass(
  value: number,
  prevValue: number,
  inverted: boolean
): 'better' | 'worse' | 'same' {
  if (value === prevValue) return 'same';
  const improved = inverted ? value < prevValue : value > prevValue;
  return improved ? 'better' : 'worse';
}

function formatDelta(value: number, prevValue: number): string {
  const diff = value - prevValue;
  if (diff === 0) return '—';
  const sign = diff > 0 ? '+' : '';
  return `${sign}${diff.toFixed(1)}`;
}

function buildTooltip(
  kpiKey: keyof KPI | undefined,
  changeReasons: TickLogEntry[] | undefined,
): string {
  const parts: string[] = [];
  if (kpiKey) {
    parts.push(KPI_DESCRIPTIONS[kpiKey]);
  }
  if (changeReasons && changeReasons.length > 0) {
    parts.push('Änderungen:');
    for (const r of changeReasons) {
      const sign = r.delta > 0 ? '+' : '';
      parts.push(`  ${r.source}: ${sign}${r.delta.toFixed(1)}`);
    }
  }
  return parts.join('\n');
}

export function KPITile({
  label,
  value,
  prevValue,
  suffix,
  inverted,
  barPercent,
  barColor,
  changeReasons,
  kpiKey,
}: KPITileProps) {
  const delta =
    prevValue !== null
      ? { text: formatDelta(value, prevValue), class: getDeltaClass(value, prevValue, inverted) }
      : null;

  /* SMA-302: Flash-Animation wenn Wert sich geändert hat */
  const showFlash = prevValue !== null && value !== prevValue;
  const flashClass =
    showFlash && delta
      ? delta.class === 'better'
        ? styles.valueFlashPos
        : delta.class === 'worse'
          ? styles.valueFlashNeg
          : ''
      : '';

  const tooltip = buildTooltip(kpiKey, changeReasons);

  return (
    <div className={styles.root} title={tooltip || undefined}>
      <span className={styles.label}>{label}</span>
      <div className={styles.valueRow}>
        <span className={`${styles.value} ${flashClass}`}>
          {value.toFixed(1)}
          {suffix}
        </span>
        {delta && (
          <span className={styles[delta.class]}>{delta.text}</span>
        )}
      </div>
      <div className={styles.track}>
        <div
          className={styles.fill}
          style={{
            width: `${Math.max(0, Math.min(100, barPercent))}%`,
            backgroundColor: barColor,
          }}
        />
      </div>
    </div>
  );
}
