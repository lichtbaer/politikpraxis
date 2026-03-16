import styles from './CoalitionMeter.module.css';

interface CoalitionMeterProps {
  value: number;
}

function getLabel(value: number): string {
  if (value >= 60) return 'Koalition stabil';
  if (value >= 35) return 'Spannungen erkennbar';
  if (value >= 15) return 'Koalitionskrise droht';
  return 'Koalition am Limit';
}

function getBarClass(value: number): string {
  if (value >= 60) return styles.green;
  if (value >= 35) return styles.warn;
  return styles.red;
}

export function CoalitionMeter({ value }: CoalitionMeterProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <span className={styles.value}>{Math.round(clamped)}%</span>
        <span className={styles.label}>{getLabel(clamped)}</span>
      </div>
      <div className={styles.track}>
        <div
          className={`${styles.fill} ${getBarClass(clamped)}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
