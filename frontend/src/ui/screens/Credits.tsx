import { useNavigate } from 'react-router-dom';
import styles from './Credits.module.css';

export function Credits() {
  const navigate = useNavigate();

  return (
    <div className={styles.root}>
      <div className={styles.content}>
        <h1 className={styles.title}>Credits</h1>
        <p className={styles.text}>
          Bundesrepublik — Eine Politiksimulation
          <br />
          politikpraxis
        </p>
        <button
          type="button"
          className={styles.back}
          onClick={() => navigate('/')}
        >
          Zurück
        </button>
      </div>
    </div>
  );
}
