import styles from './LoadingScreen.module.css';

export function LoadingScreen() {
  return (
    <div className={styles.root}>
      <div className={styles.spinner} aria-hidden />
      <p className={styles.text}>Spielinhalte werden geladen…</p>
    </div>
  );
}
