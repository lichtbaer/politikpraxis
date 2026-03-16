import styles from './MilieuBar.module.css';

interface MilieuBarProps {
  name: string;
  value: number;
  color: string;
}

export function MilieuBar({ name, value, color }: MilieuBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <span className={styles.name}>{name}</span>
        <span className={styles.value}>{Math.round(clamped)}%</span>
      </div>
      <div className={styles.track}>
        <div
          className={styles.fill}
          style={{ width: `${clamped}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
