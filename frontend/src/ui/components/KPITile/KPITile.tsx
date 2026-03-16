import styles from './KPITile.module.css';

interface KPITileProps {
  label: string;
  value: number;
  prevValue: number | null;
  suffix: string;
  inverted: boolean;
  barPercent: number;
  barColor: string;
}

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

export function KPITile({
  label,
  value,
  prevValue,
  suffix,
  inverted,
  barPercent,
  barColor,
}: KPITileProps) {
  const delta =
    prevValue !== null
      ? { text: formatDelta(value, prevValue), class: getDeltaClass(value, prevValue, inverted) }
      : null;

  return (
    <div className={styles.root}>
      <span className={styles.label}>{label}</span>
      <div className={styles.valueRow}>
        <span className={styles.value}>
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
