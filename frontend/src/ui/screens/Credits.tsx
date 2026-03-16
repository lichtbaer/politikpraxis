import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styles from './Credits.module.css';

export function Credits() {
  const { t } = useTranslation('game');
  const navigate = useNavigate();

  return (
    <div className={styles.root}>
      <div className={styles.content}>
        <h1 className={styles.title}>{t('credits.title')}</h1>
        <p className={styles.text}>
          {t('credits.text').split('\n').map((line, i) => (
            <span key={i}>
              {line}
              {i === 0 && <br />}
            </span>
          ))}
        </p>
        <button
          type="button"
          className={styles.back}
          onClick={() => navigate('/')}
        >
          {t('credits.back')}
        </button>
      </div>
    </div>
  );
}
