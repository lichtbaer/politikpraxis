import styles from './ProgressBar.module.css';

interface ProgressBarProps {
  label: string;
  progress: number;
  color: string;
  detail: string;
}

export function ProgressBar({ label, progress, color, detail }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(1, progress));

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <span className={styles.label}>{label}</span>
        <span className={styles.detail}>{detail}</span>
      </div>
      <div className={styles.track}>
        <div
          className={styles.fill}
          style={{
            width: `${clamped * 100}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}
