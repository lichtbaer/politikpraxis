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

function getTooltip(value: number): string {
  const lines = [
    'Koalitionsstabilität: Wie stabil ist deine Regierungskoalition?',
    '',
    `Aktuell: ${Math.round(value)}%`,
    '≥ 60%: Stabil — Koalition arbeitet reibungslos',
    '35–59%: Spannungen — Partner wird unzufriedener',
    '15–34%: Krise droht — Koalitionsbruch möglich',
    '< 15%: Koalitionsbruch — Spielverlust!',
    '',
    'Beeinflusst durch: Kabinett-Stimmung, Partner-Beziehung',
  ];
  return lines.join('\n');
}

export function CoalitionMeter({ value }: CoalitionMeterProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className={styles.root} title={getTooltip(clamped)}>
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
