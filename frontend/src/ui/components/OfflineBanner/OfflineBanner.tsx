import { useTranslation } from 'react-i18next';
import { useContentStore } from '../../../store/contentStore';
import styles from './OfflineBanner.module.css';

/** Hinweis-Banner wenn das Spiel mit gebündeltem Fallback-Content läuft (Backend nicht erreichbar) */
export function OfflineBanner() {
  const { t, i18n } = useTranslation();
  const offline = useContentStore((s) => s.offline);
  const load = useContentStore((s) => s.load);

  if (!offline) return null;

  return (
    <div className={styles.banner} role="status">
      <span aria-hidden="true">⚠️</span>
      <span>{t('offline.banner')}</span>
      <button type="button" className={styles.retry} onClick={() => load(i18n.language)}>
        {t('offline.retry')}
      </button>
    </div>
  );
}
